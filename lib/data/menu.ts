import "server-only";
import { Prisma, type DietaryType } from "@prisma/client";
import type { TenantContext, TenantScopedContext } from "@/lib/auth/context-types";
import { db } from "@/lib/db/prisma";
import { ValidationError } from "@/lib/errors";
import { instantDto, moneyDto, nullableInstantDto, rateDto } from "./dto";
import { mapErrors } from "./errors";
import { likeLiteral } from "./search";
import { tenantKey, tenantScope } from "./scope";
import type { Tx } from "./tx";

/**
 * Menu data access (S1-P10-T001; data-model.md E07–E10; api.md LD-MENU-01…03). The only module that queries menu
 * categories, items, variants and add-ons (ADR-008). Business rules live in `lib/services/menu.ts`.
 *
 * - Every query is scoped with `tenantScope(ctx, …)` / `tenantKey(ctx, id)`; another tenant's id matches nothing, so
 *   it behaves exactly like a missing one (callers answer NOT_FOUND — 404 parity, SC-TEN-04).
 * - Children (variants, add-ons) are reached through the composite `(tenant_id, menu_item_id)` relation and share the
 *   item's tenant; parents given in input are verified before a write and the composite FKs are the backstop.
 * - Archived rows are history: they are never deleted (orders reference them) and are excluded from active reads.
 * - Money leaves as two-decimal strings (ADR-010 §1); only the order catalogue returns `Prisma.Decimal` for pricing.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const onlyUuids = (ids: readonly string[]) => [...new Set(ids)].filter((id) => UUID.test(id));

// ─── Categories (E07) ───

export type MenuCategoryDto = {
  id: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  sortOrder: number;
  isPublished: boolean;
  /** Non-archived items in the category. */
  itemCount: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const categorySelect = {
  id: true,
  name: true,
  description: true,
  iconKey: true,
  sortOrder: true,
  isPublished: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: { where: { archivedAt: null } } } },
} satisfies Prisma.MenuCategorySelect;

export type MenuCategoryRow = Prisma.MenuCategoryGetPayload<{ select: typeof categorySelect }>;

export function categoryDto(row: MenuCategoryRow): MenuCategoryDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    iconKey: row.iconKey,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
    itemCount: row._count.items,
    archivedAt: nullableInstantDto(row.archivedAt),
    createdAt: instantDto(row.createdAt),
    updatedAt: instantDto(row.updatedAt),
  };
}

/** The partial unique index `(tenant_id, lower(name)) WHERE archived_at IS NULL` rejected the name (api.md SA-MENU-01). */
function categoryNameTaken(): ValidationError {
  return new ValidationError("A category with this name already exists.", { name: ["A category with this name already exists"] }, "NAME_TAKEN");
}

async function uniqueCategoryName<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw categoryNameTaken();
    throw error;
  }
}

/** LD-MENU-01: active (or, when asked, archived) categories in display order, with their active item counts. */
export async function listMenuCategories(ctx: TenantContext, options: { archived: boolean }): Promise<MenuCategoryDto[]> {
  const rows = await mapErrors("Menu category", () =>
    db.menuCategory.findMany({
      where: tenantScope(ctx, { archivedAt: options.archived ? { not: null } : null }),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      select: categorySelect,
    }),
  );
  return rows.map(categoryDto);
}

/**
 * Locks an active category row for the rest of the transaction and reads it; null when missing, archived or another
 * tenant's. `update` serialises archive/reorder/publish; `share` lets item writes proceed together while blocking an
 * archive of the category they are writing into.
 */
export async function lockActiveCategory(ctx: TenantContext, tx: Tx, id: string, mode: "update" | "share"): Promise<MenuCategoryRow | null> {
  const locked =
    mode === "update"
      ? await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM menu_categories WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${id}::uuid AND archived_at IS NULL FOR UPDATE`
      : await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM menu_categories WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${id}::uuid AND archived_at IS NULL FOR SHARE`;
  if (locked.length === 0) return null;
  return tx.menuCategory.findUnique({ where: tenantKey(ctx, id), select: categorySelect });
}

export async function readCategory(ctx: TenantContext, tx: Tx, id: string): Promise<MenuCategoryRow | null> {
  return tx.menuCategory.findUnique({ where: tenantKey(ctx, id), select: categorySelect });
}

/** New categories are appended after the last active one (api.md SA-MENU-01). */
export async function nextCategorySortOrder(ctx: TenantContext, tx: Tx): Promise<number> {
  const result = await tx.menuCategory.aggregate({ where: tenantScope(ctx, { archivedAt: null }), _max: { sortOrder: true } });
  return result._max.sortOrder === null ? 0 : Math.min(result._max.sortOrder + 1, 9999);
}

export type CategoryWrite = { name: string; description: string | null; iconKey: string | null; sortOrder: number };

export async function insertCategory(ctx: TenantContext, tx: Tx, data: CategoryWrite): Promise<MenuCategoryRow> {
  return uniqueCategoryName(() =>
    tx.menuCategory.create({
      data: { tenantId: ctx.tenantId, name: data.name, description: data.description, iconKey: data.iconKey, sortOrder: data.sortOrder, isPublished: true },
      select: categorySelect,
    }),
  );
}

export async function updateCategoryRow(
  ctx: TenantContext,
  tx: Tx,
  id: string,
  data: Partial<CategoryWrite> & { isPublished?: boolean; archivedAt?: Date },
): Promise<MenuCategoryRow> {
  return uniqueCategoryName(() => tx.menuCategory.update({ where: tenantKey(ctx, id), data, select: categorySelect }));
}

/** The tenant's active categories in their current display order (reorder full-set check). */
export async function listActiveCategoryOrder(ctx: TenantContext, tx: Tx): Promise<Array<{ id: string; sortOrder: number }>> {
  // Lock the whole active set so two reorders (or a reorder and a create) run one after another.
  await tx.$queryRaw`SELECT id FROM menu_categories WHERE tenant_id = ${ctx.tenantId}::uuid AND archived_at IS NULL FOR UPDATE`;
  return tx.menuCategory.findMany({
    where: tenantScope(ctx, { archivedAt: null }),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: { id: true, sortOrder: true },
  });
}

/** Which of `ids` are the tenant's categories at all (archived included) — to tell a stale list from a foreign id. */
export async function existingCategoryIds(ctx: TenantContext, tx: Tx, ids: readonly string[]): Promise<Set<string>> {
  const rows = await tx.menuCategory.findMany({ where: tenantScope(ctx, { id: { in: onlyUuids(ids) } }), select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

export async function setCategorySortOrders(ctx: TenantContext, tx: Tx, orderedIds: readonly string[]): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    await tx.menuCategory.update({ where: tenantKey(ctx, id), data: { sortOrder: index }, select: { id: true } });
  }
}

// ─── Kitchen sections (E04, read-only here) ───

export type KitchenSectionOptionDto = { id: string; name: string; code: string };

/** Kitchen sections an item can be routed to (LD-MENU-03 options). */
export async function listKitchenSectionOptions(ctx: TenantContext): Promise<KitchenSectionOptionDto[]> {
  return mapErrors("Kitchen section", () =>
    db.kitchenSection.findMany({
      where: tenantScope(ctx, { archivedAt: null }),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    }),
  );
}

/** True when `id` is one of the tenant's non-archived kitchen sections (TI-010). */
export async function isActiveKitchenSection(ctx: TenantContext, tx: Tx, id: string): Promise<boolean> {
  return (await tx.kitchenSection.count({ where: tenantScope(ctx, { id, archivedAt: null }) })) === 1;
}

// ─── Items (E08–E10) ───

export type MenuVariantDto = { id: string; name: string; price: string; isDefault: boolean; isAvailable: boolean; displayOrder: number };
export type MenuAddonDto = { id: string; name: string; price: string; isAvailable: boolean; displayOrder: number };

export type MenuItemDetailDto = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryPublished: boolean;
  kitchenSectionId: string | null;
  kitchenSectionName: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  iconKey: string | null;
  basePrice: string;
  /** Lowest active variant price, else the base price ("from" price). */
  priceFrom: string;
  taxRate: string;
  dietaryType: DietaryType | null;
  prepTimeMinutes: number | null;
  isAvailable: boolean;
  isPublished: boolean;
  displayOrder: number;
  archivedAt: string | null;
  createdAt: string;
  /** Pass back as `expectedUpdatedAt` when saving (SA-MENU-07). */
  updatedAt: string;
  variants: MenuVariantDto[];
  addons: MenuAddonDto[];
};

const optionFields = { id: true, name: true, price: true, isAvailable: true, displayOrder: true } as const;
const optionOrder = [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }] satisfies Prisma.MenuItemVariantOrderByWithRelationInput[];

const itemSelect = {
  id: true,
  categoryId: true,
  kitchenSectionId: true,
  name: true,
  description: true,
  imageUrl: true,
  iconKey: true,
  basePrice: true,
  taxRate: true,
  dietaryType: true,
  prepTimeMinutes: true,
  isAvailable: true,
  isPublished: true,
  displayOrder: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true, isPublished: true, archivedAt: true } },
  kitchenSection: { select: { name: true } },
  // Active children only; reached through the composite (tenant_id, menu_item_id) relation.
  variants: { where: { archivedAt: null }, orderBy: optionOrder, select: { ...optionFields, isDefault: true } },
  addons: { where: { archivedAt: null }, orderBy: optionOrder, select: optionFields },
} satisfies Prisma.MenuItemSelect;

export type MenuItemRow = Prisma.MenuItemGetPayload<{ select: typeof itemSelect }>;
export type MenuVariantRow = MenuItemRow["variants"][number];
export type MenuAddonRow = MenuItemRow["addons"][number];

function priceFromOf(basePrice: Prisma.Decimal, variants: ReadonlyArray<{ price: Prisma.Decimal }>): Prisma.Decimal {
  return variants.reduce<Prisma.Decimal | null>((min, v) => (min === null || v.price.lt(min) ? v.price : min), null) ?? basePrice;
}

export function itemDetailDto(row: MenuItemRow): MenuItemDetailDto {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    categoryPublished: row.category.isPublished && row.category.archivedAt === null,
    kitchenSectionId: row.kitchenSectionId,
    kitchenSectionName: row.kitchenSection?.name ?? null,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    iconKey: row.iconKey,
    basePrice: moneyDto(row.basePrice),
    priceFrom: moneyDto(priceFromOf(row.basePrice, row.variants)),
    taxRate: rateDto(row.taxRate),
    dietaryType: row.dietaryType,
    prepTimeMinutes: row.prepTimeMinutes,
    isAvailable: row.isAvailable,
    isPublished: row.isPublished,
    displayOrder: row.displayOrder,
    archivedAt: nullableInstantDto(row.archivedAt),
    createdAt: instantDto(row.createdAt),
    updatedAt: instantDto(row.updatedAt),
    variants: row.variants.map((v) => ({ id: v.id, name: v.name, price: moneyDto(v.price), isDefault: v.isDefault, isAvailable: v.isAvailable, displayOrder: v.displayOrder })),
    addons: row.addons.map((a) => ({ id: a.id, name: a.name, price: moneyDto(a.price), isAvailable: a.isAvailable, displayOrder: a.displayOrder })),
  };
}

/** LD-MENU-03: one item (archived ones included, read-only history) or null for a missing / other tenant's id. */
export async function findMenuItem(ctx: TenantContext, id: string, client: Tx = db): Promise<MenuItemRow | null> {
  if (!UUID.test(id)) return null;
  return mapErrors("Menu item", () => client.menuItem.findUnique({ where: tenantKey(ctx, id), select: itemSelect }));
}

/** Locks an active (non-archived) item row until the transaction ends and reads it; null otherwise. */
export async function lockActiveItem(ctx: TenantContext, tx: Tx, id: string): Promise<MenuItemRow | null> {
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM menu_items WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${id}::uuid AND archived_at IS NULL FOR UPDATE`;
  if (locked.length === 0) return null;
  return tx.menuItem.findUnique({ where: tenantKey(ctx, id), select: itemSelect });
}

/** New items are appended after the last active item of their category. */
export async function nextItemDisplayOrder(ctx: TenantContext, tx: Tx, categoryId: string): Promise<number> {
  const result = await tx.menuItem.aggregate({ where: tenantScope(ctx, { categoryId, archivedAt: null }), _max: { displayOrder: true } });
  return result._max.displayOrder === null ? 0 : Math.min(result._max.displayOrder + 1, 9999);
}

export type ItemWrite = {
  categoryId: string;
  kitchenSectionId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  iconKey: string | null;
  basePrice: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  dietaryType: DietaryType | null;
  prepTimeMinutes: number | null;
  displayOrder: number;
};

/** Inserts an item: unpublished and available (api.md SA-MENU-06). */
export async function insertItem(ctx: TenantContext, tx: Tx, data: ItemWrite): Promise<string> {
  const row = await tx.menuItem.create({
    data: { ...data, tenantId: ctx.tenantId, isAvailable: true, isPublished: false },
    select: { id: true },
  });
  return row.id;
}

export type ItemPatch = Partial<ItemWrite> & { isAvailable?: boolean; isPublished?: boolean; archivedAt?: Date; updatedAt?: Date };

export async function updateItemRow(ctx: TenantContext, tx: Tx, id: string, data: ItemPatch): Promise<void> {
  // Unchecked input: the composite FKs take plain (tenant_id, category_id / kitchen_section_id) columns.
  const patch: Prisma.MenuItemUncheckedUpdateInput = data;
  await tx.menuItem.update({ where: tenantKey(ctx, id), data: patch, select: { id: true } });
}

/** The tenant's active items among `ids` with their category (reorder checks); other tenants' ids simply do not match. */
export async function findActiveItemsByIds(ctx: TenantContext, tx: Tx, ids: readonly string[]): Promise<Array<{ id: string; categoryId: string }>> {
  return tx.menuItem.findMany({ where: tenantScope(ctx, { id: { in: onlyUuids(ids) }, archivedAt: null }), select: { id: true, categoryId: true } });
}

/** A category's active items in display order, locked for the transaction (reorder full-set check). */
export async function listActiveItemOrder(ctx: TenantContext, tx: Tx, categoryId: string): Promise<Array<{ id: string; displayOrder: number }>> {
  await tx.$queryRaw`
    SELECT id FROM menu_items WHERE tenant_id = ${ctx.tenantId}::uuid AND category_id = ${categoryId}::uuid AND archived_at IS NULL FOR UPDATE`;
  return tx.menuItem.findMany({
    where: tenantScope(ctx, { categoryId, archivedAt: null }),
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: { id: true, displayOrder: true },
  });
}

export async function setItemDisplayOrders(ctx: TenantContext, tx: Tx, orderedIds: readonly string[]): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    await tx.menuItem.update({ where: tenantKey(ctx, id), data: { displayOrder: index }, select: { id: true } });
  }
}

export async function countActiveItemsInCategory(ctx: TenantContext, tx: Tx, categoryId: string): Promise<number> {
  return tx.menuItem.count({ where: tenantScope(ctx, { categoryId, archivedAt: null }) });
}

// ─── Item list (LD-MENU-02) ───

export type MenuItemListRowDto = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  basePrice: string;
  priceFrom: string;
  taxRate: string;
  dietaryType: DietaryType | null;
  isAvailable: boolean;
  isPublished: boolean;
  imageUrl: string | null;
  iconKey: string | null;
  displayOrder: number;
  variantCount: number;
  addonCount: number;
  archivedAt: string | null;
  updatedAt: string;
};

/** Position of a row in the list order (category sort, category name, category id, display order, name, id). */
export type MenuItemListKey = { cs: number; cn: string; ci: string; d: number; n: string; i: string };

export type MenuItemListFilter = {
  categoryId?: string;
  published?: boolean;
  available?: boolean;
  q?: string;
  archived: boolean;
  after?: MenuItemListKey;
  limit: number;
};

const itemListSelect = {
  id: true,
  categoryId: true,
  name: true,
  imageUrl: true,
  iconKey: true,
  basePrice: true,
  taxRate: true,
  dietaryType: true,
  isAvailable: true,
  isPublished: true,
  displayOrder: true,
  archivedAt: true,
  updatedAt: true,
  category: { select: { name: true, sortOrder: true } },
  variants: { where: { archivedAt: null }, select: { price: true } },
  _count: { select: { addons: { where: { archivedAt: null } } } },
} satisfies Prisma.MenuItemSelect;

/** Keyset condition "strictly after `k`" for the list order. */
function afterKey(k: MenuItemListKey): Prisma.MenuItemWhereInput {
  const sameCategory = { category: { sortOrder: k.cs, name: k.cn }, categoryId: k.ci };
  return {
    OR: [
      { category: { sortOrder: { gt: k.cs } } },
      { category: { sortOrder: k.cs, name: { gt: k.cn } } },
      { category: { sortOrder: k.cs, name: k.cn }, categoryId: { gt: k.ci } },
      { ...sameCategory, displayOrder: { gt: k.d } },
      { ...sameCategory, displayOrder: k.d, name: { gt: k.n } },
      { ...sameCategory, displayOrder: k.d, name: k.n, id: { gt: k.i } },
    ],
  };
}

/** LD-MENU-02 page: filters, keyset pagination (`limit + 1` rows tell whether another page exists). */
export async function listMenuItems(
  ctx: TenantContext,
  filter: MenuItemListFilter,
): Promise<{ rows: MenuItemListRowDto[]; hasMore: boolean; lastKey: MenuItemListKey | null }> {
  const conditions: Prisma.MenuItemWhereInput[] = [{ archivedAt: filter.archived ? { not: null } : null }];
  if (filter.categoryId) conditions.push({ categoryId: filter.categoryId });
  if (filter.published !== undefined) conditions.push({ isPublished: filter.published });
  if (filter.available !== undefined) conditions.push({ isAvailable: filter.available });
  // Escaped so "%" or "_" match literally (ADV-018).
  if (filter.q) conditions.push({ name: { contains: likeLiteral(filter.q), mode: "insensitive" } });
  if (filter.after) conditions.push(afterKey(filter.after));

  const rows = await mapErrors("Menu item", () =>
    db.menuItem.findMany({
      where: tenantScope(ctx, { AND: conditions }),
      orderBy: [{ category: { sortOrder: "asc" } }, { category: { name: "asc" } }, { categoryId: "asc" }, { displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      take: filter.limit + 1,
      select: itemListSelect,
    }),
  );
  const page = rows.slice(0, filter.limit);
  const last = page.at(-1);
  return {
    rows: page.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      name: row.name,
      basePrice: moneyDto(row.basePrice),
      priceFrom: moneyDto(priceFromOf(row.basePrice, row.variants)),
      taxRate: rateDto(row.taxRate),
      dietaryType: row.dietaryType,
      isAvailable: row.isAvailable,
      isPublished: row.isPublished,
      imageUrl: row.imageUrl,
      iconKey: row.iconKey,
      displayOrder: row.displayOrder,
      variantCount: row.variants.length,
      addonCount: row._count.addons,
      archivedAt: nullableInstantDto(row.archivedAt),
      updatedAt: instantDto(row.updatedAt),
    })),
    hasMore: rows.length > filter.limit,
    lastKey: last ? { cs: last.category.sortOrder, cn: last.category.name, ci: last.categoryId, d: last.displayOrder, n: last.name, i: last.id } : null,
  };
}

// ─── Variants and add-ons (E09, E10) ───

export type VariantWrite = { name: string; price: Prisma.Decimal; isDefault: boolean; isAvailable: boolean; displayOrder: number };
export type AddonWrite = { name: string; price: Prisma.Decimal; isAvailable: boolean; displayOrder: number };

/** Archives the given active variants of an item (omitted from a replace-set); they stay for order history. */
export async function archiveVariants(ctx: TenantContext, tx: Tx, menuItemId: string, ids: readonly string[], at: Date): Promise<void> {
  if (ids.length === 0) return;
  await tx.menuItemVariant.updateMany({ where: tenantScope(ctx, { menuItemId, id: { in: [...ids] }, archivedAt: null }), data: { archivedAt: at, isDefault: false } });
}

export async function updateVariantRow(ctx: TenantContext, tx: Tx, id: string, data: Partial<VariantWrite>): Promise<void> {
  await tx.menuItemVariant.update({ where: tenantKey(ctx, id), data, select: { id: true } });
}

export async function insertVariants(ctx: TenantContext, tx: Tx, menuItemId: string, rows: readonly VariantWrite[]): Promise<void> {
  if (rows.length === 0) return;
  await tx.menuItemVariant.createMany({ data: rows.map((row) => ({ ...row, tenantId: ctx.tenantId, menuItemId })) });
}

export async function archiveAddons(ctx: TenantContext, tx: Tx, menuItemId: string, ids: readonly string[], at: Date): Promise<void> {
  if (ids.length === 0) return;
  await tx.menuItemAddon.updateMany({ where: tenantScope(ctx, { menuItemId, id: { in: [...ids] }, archivedAt: null }), data: { archivedAt: at } });
}

export async function updateAddonRow(ctx: TenantContext, tx: Tx, id: string, data: Partial<AddonWrite>): Promise<void> {
  await tx.menuItemAddon.update({ where: tenantKey(ctx, id), data, select: { id: true } });
}

export async function insertAddons(ctx: TenantContext, tx: Tx, menuItemId: string, rows: readonly AddonWrite[]): Promise<void> {
  if (rows.length === 0) return;
  await tx.menuItemAddon.createMany({ data: rows.map((row) => ({ ...row, tenantId: ctx.tenantId, menuItemId })) });
}

// ─── Order catalogue (consumed by the order engine, S1-P12) ───

export type OrderCatalogueOption = { id: string; name: string; price: Prisma.Decimal; isAvailable: boolean };

/**
 * One item as the pricing engine needs it (`lib/pricing/price-order.ts#CatalogueItem`): authoritative Decimal prices,
 * tax rate, kitchen section and names for snapshots, and the flags that decide orderability (BR-MENU-02). Only
 * active (non-archived) variants and add-ons are listed; unavailable ones are included with `isAvailable: false`.
 */
export type OrderCatalogueItem = {
  id: string;
  name: string;
  categoryId: string;
  basePrice: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  kitchenSectionId: string | null;
  isAvailable: boolean;
  isPublished: boolean;
  isArchived: boolean;
  variants: OrderCatalogueOption[];
  addons: OrderCatalogueOption[];
};

const catalogueOption = { id: true, name: true, price: true, isAvailable: true } as const;

/**
 * The context tenant's menu items among `itemIds`, keyed by id — archived, unpublished and unavailable ones included
 * with their flags, so the caller can answer 422 ITEM_UNAVAILABLE for those and 404 NOT_FOUND for ids absent from
 * the map (missing and other tenants' ids look identical). Pass the transaction client to read inside an order
 * transaction.
 */
export async function loadOrderCatalogue(
  ctx: TenantScopedContext,
  input: { itemIds: readonly string[] },
  client: Tx = db,
): Promise<Map<string, OrderCatalogueItem>> {
  const ids = onlyUuids(input.itemIds);
  if (ids.length === 0) return new Map();
  const rows = await mapErrors("Menu item", () =>
    client.menuItem.findMany({
      where: tenantScope(ctx, { id: { in: ids } }),
      select: {
        id: true,
        name: true,
        categoryId: true,
        basePrice: true,
        taxRate: true,
        kitchenSectionId: true,
        isAvailable: true,
        isPublished: true,
        archivedAt: true,
        variants: { where: { archivedAt: null }, orderBy: optionOrder, select: catalogueOption },
        addons: { where: { archivedAt: null }, orderBy: optionOrder, select: catalogueOption },
      },
    }),
  );
  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        categoryId: row.categoryId,
        basePrice: row.basePrice,
        taxRate: row.taxRate,
        kitchenSectionId: row.kitchenSectionId,
        isAvailable: row.isAvailable,
        isPublished: row.isPublished,
        isArchived: row.archivedAt !== null,
        variants: row.variants,
        addons: row.addons,
      },
    ]),
  );
}
