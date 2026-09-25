import "server-only";
import { Prisma } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import { removeItemFromDailyMenusFrom } from "@/lib/data/daily-menu";
import {
  findActiveItemsByIds,
  findMenuItem,
  insertItem,
  isActiveKitchenSection,
  itemDetailDto,
  listActiveItemOrder,
  listKitchenSectionOptions,
  listMenuItems,
  lockActiveCategory,
  lockActiveItem,
  nextItemDisplayOrder,
  setItemDisplayOrders,
  updateItemRow,
  type ItemPatch,
  type KitchenSectionOptionDto,
  type MenuItemDetailDto,
  type MenuItemListKey,
  type MenuItemListRowDto,
  type MenuItemRow,
} from "@/lib/data/menu";
import { withTx, type Tx } from "@/lib/data/tx";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertOwnedImageUrls, imageUrlsBeforeSave, releaseUnusedImages } from "@/lib/services/media";
import { businessDateFor, now } from "@/lib/time";
import { MENU_ITEM_PAGE_SIZE, type CreateMenuItemData, type MenuItemListQueryData, type UpdateMenuItemData } from "@/lib/validation/menu";
import { revalidatePublicSite } from "./public-revalidate";

/**
 * Menu item services (S1-P10-T003; api.md LD-MENU-02/03, SA-MENU-06…11; REQ-MENU-003/006/007/008/011).
 *
 * Callers have already passed `requireTenant("menu:read" | "menu:manage" | "menu:availability:update")`. All data
 * access goes through `lib/data/menu.ts` (ADR-008) and every write runs in one transaction with its audit row.
 *
 * - The parents an input names (category, kitchen section) are verified inside the transaction and locked `FOR SHARE`,
 *   so a category cannot be archived between the check and the insert. Another tenant's parent simply does not match:
 *   404, exactly like an unknown id (SC-TEN-04).
 * - Money is `Prisma.Decimal` end to end; a price or tax change writes its own `menu_item.price_changed` audit row
 *   with before/after decimal strings, separately from `menu_item.updated` (api.md SA-MENU-07).
 * - Items are archived, never deleted: order lines snapshot names and prices, and archived rows keep history intact.
 *   Archiving also unpublishes, makes the item unavailable and drops it from *future* daily menus only (SA-MENU-08).
 */

export type { MenuItemDetailDto, MenuItemListRowDto, KitchenSectionOptionDto };

const RESOURCE = "menu_item";

// ─── Keyset cursor (LD-MENU-02) ───

/** The list key travels as opaque base64url JSON; a tampered or truncated cursor is 422, never a silent full page. */
function encodeCursor(key: MenuItemListKey): string {
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): MenuItemListKey {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as MenuItemListKey).cs === "number" &&
      typeof (parsed as MenuItemListKey).cn === "string" &&
      typeof (parsed as MenuItemListKey).ci === "string" &&
      typeof (parsed as MenuItemListKey).d === "number" &&
      typeof (parsed as MenuItemListKey).n === "string" &&
      typeof (parsed as MenuItemListKey).i === "string"
    ) {
      return parsed as MenuItemListKey;
    }
  } catch {
    // fall through to the same error a structurally wrong cursor gets
  }
  throw new ValidationError("That page link is no longer valid. Start from the first page.", { cursor: ["Invalid cursor"] });
}

/** LD-MENU-02 — `menu:read`: one filtered, keyset-paginated page of the tenant's items. */
export async function listItems(
  ctx: TenantContext,
  query: MenuItemListQueryData,
): Promise<{ items: MenuItemListRowDto[]; nextCursor: string | null }> {
  const page = await listMenuItems(ctx, {
    categoryId: query.categoryId,
    published: query.published,
    available: query.available,
    q: query.q,
    archived: query.archived ?? false,
    after: query.cursor ? decodeCursor(query.cursor) : undefined,
    limit: query.limit ?? MENU_ITEM_PAGE_SIZE,
  });
  return { items: page.rows, nextCursor: page.hasMore && page.lastKey ? encodeCursor(page.lastKey) : null };
}

/** LD-MENU-03 — `menu:read`: one item with its variants, add-ons and the sections it can be routed to. */
export async function getItemDetail(ctx: TenantContext, itemId: string): Promise<{ item: MenuItemDetailDto; kitchenSections: KitchenSectionOptionDto[] }> {
  const [row, kitchenSections] = await Promise.all([findMenuItem(ctx, itemId), listKitchenSectionOptions(ctx)]);
  if (!row) throw new NotFoundError("Menu item not found.");
  return { item: itemDetailDto(row), kitchenSections };
}

// ─── Shared checks ───

/** Verifies (and share-locks) a category of this tenant; another tenant's, an archived or an unknown id is 404. */
async function requireActiveCategory(ctx: TenantContext, tx: Tx, categoryId: string): Promise<void> {
  if (!(await lockActiveCategory(ctx, tx, categoryId, "share"))) throw new NotFoundError("Category not found.");
}

/** Verifies a kitchen section of this tenant (TI-010); `null` clears the routing and needs no check. */
async function requireActiveSection(ctx: TenantContext, tx: Tx, kitchenSectionId: string | null): Promise<void> {
  if (kitchenSectionId === null) return;
  if (!(await isActiveKitchenSection(ctx, tx, kitchenSectionId))) throw new NotFoundError("Kitchen section not found.");
}

async function readDetail(ctx: TenantContext, tx: Tx, itemId: string): Promise<MenuItemDetailDto> {
  const row = await findMenuItem(ctx, itemId, tx);
  if (!row) throw new NotFoundError("Menu item not found.");
  return itemDetailDto(row);
}

/** Descriptive (non-money) fields as an audit row records them. */
function itemState(row: MenuItemRow) {
  return {
    categoryId: row.categoryId,
    kitchenSectionId: row.kitchenSectionId,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    iconKey: row.iconKey,
    dietaryType: row.dietaryType,
    prepTimeMinutes: row.prepTimeMinutes,
  };
}

type ItemState = ReturnType<typeof itemState>;

const pick = (source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.map((key) => [key, source[key]]));

// ─── Writes ───

/** SA-MENU-06 — created unpublished and available; the category (and section, if given) must be this tenant's. */
export async function createItem(ctx: TenantContext, input: CreateMenuItemData): Promise<MenuItemDetailDto> {
  await assertOwnedImageUrls(ctx, { imageUrl: input.imageUrl });
  const created = await withTx(ctx, async (tx) => {
    await requireActiveCategory(ctx, tx, input.categoryId);
    await requireActiveSection(ctx, tx, input.kitchenSectionId);

    const displayOrder = await nextItemDisplayOrder(ctx, tx, input.categoryId);
    const itemId = await insertItem(ctx, tx, {
      categoryId: input.categoryId,
      kitchenSectionId: input.kitchenSectionId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      iconKey: input.iconKey,
      basePrice: input.basePrice,
      taxRate: input.taxRate,
      dietaryType: input.dietaryType,
      prepTimeMinutes: input.prepTimeMinutes,
      displayOrder,
    });
    const row = await requireRow(ctx, tx, itemId);
    await audit(tx, ctx, {
      action: "menu_item.created",
      resourceType: RESOURCE,
      resourceId: itemId,
      after: { ...itemState(row), basePrice: row.basePrice.toFixed(2), taxRate: row.taxRate.toFixed(2), isPublished: row.isPublished, isAvailable: row.isAvailable },
    });
    return itemDetailDto(row);
  });
  logger.info("menu_item.created", { requestId: ctx.requestId, tenantId: ctx.tenantId, itemId: created.id });
  return created;
}

async function requireRow(ctx: TenantContext, tx: Tx, itemId: string): Promise<MenuItemRow> {
  const row = await findMenuItem(ctx, itemId, tx);
  if (!row) throw new NotFoundError("Menu item not found.");
  return row;
}

/**
 * SA-MENU-07 — optimistic concurrency on `expectedUpdatedAt` (409 CONFLICT when someone else saved first), then a
 * patch of exactly the fields that changed. Publication (SA-MENU-10), availability (SA-MENU-11) and the modifier sets
 * (SA-MENU-12/13) have their own actions and permissions, so they are not accepted here.
 */
export async function updateItem(ctx: TenantContext, input: UpdateMenuItemData): Promise<MenuItemDetailDto> {
  const { itemId, expectedUpdatedAt, ...patch } = input;
  // Uploaded images must be this tenant's own (SC-FILE-02); a replaced one is released after the save (ADR-017 §5).
  await assertOwnedImageUrls(ctx, { imageUrl: patch.imageUrl });
  const previousImages = patch.imageUrl === undefined ? [] : await imageUrlsBeforeSave(ctx, { kind: "menu_item", itemId });
  const result = await withTx(ctx, async (tx) => {
    const before = await lockActiveItem(ctx, tx, itemId);
    if (!before) throw new NotFoundError("Menu item not found.");
    if (before.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new ConflictError("Someone else changed this item. Reload the page and try again.");
    }

    if (patch.categoryId !== undefined && patch.categoryId !== before.categoryId) await requireActiveCategory(ctx, tx, patch.categoryId);
    if (patch.kitchenSectionId !== undefined) await requireActiveSection(ctx, tx, patch.kitchenSectionId ?? null);

    const beforeState = itemState(before);
    const fields: Partial<ItemState> = {
      categoryId: patch.categoryId,
      kitchenSectionId: patch.kitchenSectionId === undefined ? undefined : (patch.kitchenSectionId ?? null),
      name: patch.name,
      description: patch.description,
      imageUrl: patch.imageUrl,
      iconKey: patch.iconKey,
      dietaryType: patch.dietaryType === undefined ? undefined : (patch.dietaryType ?? null),
      prepTimeMinutes: patch.prepTimeMinutes === undefined ? undefined : (patch.prepTimeMinutes ?? null),
    };
    const changed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && beforeState[key as keyof ItemState] !== value) changed[key] = value;
    }

    const priceChanged = patch.basePrice !== undefined && !patch.basePrice.equals(before.basePrice);
    const taxChanged = patch.taxRate !== undefined && !patch.taxRate.equals(before.taxRate);

    if (Object.keys(changed).length === 0 && !priceChanged && !taxChanged) return { detail: itemDetailDto(before), published: before.isPublished };

    const write: ItemPatch = { ...(changed as ItemPatch) };
    if (priceChanged) write.basePrice = patch.basePrice;
    if (taxChanged) write.taxRate = patch.taxRate;
    await updateItemRow(ctx, tx, itemId, write);
    const after = await requireRow(ctx, tx, itemId);

    if (Object.keys(changed).length > 0) {
      await audit(tx, ctx, {
        action: "menu_item.updated",
        resourceType: RESOURCE,
        resourceId: itemId,
        before: pick(beforeState, Object.keys(changed)),
        after: pick(itemState(after), Object.keys(changed)),
      });
    }
    if (priceChanged || taxChanged) {
      await audit(tx, ctx, {
        action: "menu_item.price_changed",
        resourceType: RESOURCE,
        resourceId: itemId,
        before: { basePrice: before.basePrice.toFixed(2), taxRate: before.taxRate.toFixed(2) },
        after: { basePrice: after.basePrice.toFixed(2), taxRate: after.taxRate.toFixed(2) },
      });
    }
    return { detail: itemDetailDto(after), published: after.isPublished };
  });
  await releaseUnusedImages(ctx, previousImages);
  if (result.published) await revalidatePublicSite(ctx);
  return result.detail;
}

/**
 * SA-MENU-08 — archive: unpublished, unavailable and removed from every daily menu dated today or later. Menus for
 * past dates are history and keep the item; the order lines that reference it are untouched (TC-ORDER-004).
 */
export async function archiveItem(ctx: TenantContext, itemId: string): Promise<MenuItemDetailDto> {
  const at = now();
  const fromDate = businessDateFor(at, ctx.restaurant.timezone);
  const { detail, wasPublished } = await withTx(ctx, async (tx) => {
    const before = await lockActiveItem(ctx, tx, itemId);
    if (!before) throw new NotFoundError("Menu item not found.");

    await updateItemRow(ctx, tx, itemId, { archivedAt: at, isPublished: false, isAvailable: false });
    const removals = await removeItemFromDailyMenusFrom(ctx, tx, itemId, fromDate, at);

    await audit(tx, ctx, {
      action: "menu_item.archived",
      resourceType: RESOURCE,
      resourceId: itemId,
      before: { name: before.name, isPublished: before.isPublished, isAvailable: before.isAvailable },
      after: { archivedAt: at.toISOString(), removedFromDailyMenus: removals.map((r) => r.businessDate) },
    });
    // Each daily menu whose item set changed gets its own audit row (SC-AUD-01, TC-DMENU-008).
    for (const removal of removals) {
      await audit(tx, ctx, {
        action: "daily_menu.items_updated",
        resourceType: "daily_menu",
        resourceId: removal.dailyMenuId,
        before: { businessDate: removal.businessDate, itemIds: removal.before },
        after: { businessDate: removal.businessDate, itemIds: removal.after },
        reason: "Menu item archived",
      });
    }
    return { detail: await readDetail(ctx, tx, itemId), wasPublished: before.isPublished };
  });
  logger.info("menu_item.archived", { requestId: ctx.requestId, tenantId: ctx.tenantId, itemId });
  if (wasPublished) await revalidatePublicSite(ctx);
  return detail;
}

/** SA-MENU-09 — `orderedIds` must be exactly the category's non-archived items (foreign id → 404, stale list → 422). */
export async function reorderItems(ctx: TenantContext, input: { categoryId: string; orderedIds: readonly string[] }): Promise<{ items: MenuItemDetailDto[] }> {
  const ordered = await withTx(ctx, async (tx) => {
    await requireActiveCategory(ctx, tx, input.categoryId);
    const current = await listActiveItemOrder(ctx, tx, input.categoryId);
    const found = await findActiveItemsByIds(ctx, tx, input.orderedIds);
    const byId = new Map(found.map((i) => [i.id, i.categoryId]));

    // An id that is not one of this tenant's active items — or lives in another category — is simply "not found".
    for (const id of input.orderedIds) if (byId.get(id) !== input.categoryId) throw new NotFoundError("Menu item not found.");
    if (input.orderedIds.length !== current.length) {
      throw new ValidationError("The item list changed. Reload the page and try again.", { orderedIds: ["List exactly the category's active items, each once"] });
    }

    await setItemDisplayOrders(ctx, tx, input.orderedIds);
    await audit(tx, ctx, {
      action: "menu_item.reordered",
      resourceType: "menu_category",
      resourceId: input.categoryId,
      before: { orderedIds: current.map((i) => i.id) },
      after: { orderedIds: [...input.orderedIds] },
    });
    return Promise.all(input.orderedIds.map((id) => readDetail(ctx, tx, id)));
  });
  await revalidatePublicSite(ctx);
  return { items: ordered };
}

/** 422 raised when SA-MENU-10's publication prerequisites are not met; the code names the missing one. */
function notPublishable(code: "CATEGORY_NOT_PUBLISHED" | "PRICE_REQUIRED", message: string): ValidationError {
  return new ValidationError(message, { published: [message] }, code);
}

/** SA-MENU-10 — publishing needs a published category and a sellable price (base price or an available variant). */
export async function setItemPublished(ctx: TenantContext, itemId: string, published: boolean): Promise<MenuItemDetailDto> {
  const updated = await withTx(ctx, async (tx) => {
    const before = await lockActiveItem(ctx, tx, itemId);
    if (!before) throw new NotFoundError("Menu item not found.");

    if (published) {
      if (!before.category.isPublished || before.category.archivedAt !== null) {
        throw notPublishable("CATEGORY_NOT_PUBLISHED", "Publish the category before publishing items in it.");
      }
      const sellable = before.basePrice.gt(new Prisma.Decimal(0)) || before.variants.some((v) => v.isAvailable);
      if (!sellable) throw notPublishable("PRICE_REQUIRED", "Set a price, or add an available variant, before publishing this item.");
    }
    if (before.isPublished === published) return itemDetailDto(before);

    await updateItemRow(ctx, tx, itemId, { isPublished: published });
    await audit(tx, ctx, {
      action: published ? "menu_item.published" : "menu_item.unpublished",
      resourceType: RESOURCE,
      resourceId: itemId,
      before: { isPublished: before.isPublished },
      after: { isPublished: published },
    });
    return readDetail(ctx, tx, itemId);
  });
  await revalidatePublicSite(ctx);
  return updated;
}

/** SA-MENU-11 — the sold-out toggle, behind its own `menu:availability:update` permission (CASHIER may not use it). */
export async function setItemAvailability(ctx: TenantContext, itemId: string, available: boolean): Promise<MenuItemDetailDto> {
  const { detail, published } = await withTx(ctx, async (tx) => {
    const before = await lockActiveItem(ctx, tx, itemId);
    if (!before) throw new NotFoundError("Menu item not found.");
    if (before.isAvailable === available) return { detail: itemDetailDto(before), published: before.isPublished };

    await updateItemRow(ctx, tx, itemId, { isAvailable: available });
    await audit(tx, ctx, {
      action: "menu_item.availability_changed",
      resourceType: RESOURCE,
      resourceId: itemId,
      before: { isAvailable: before.isAvailable },
      after: { isAvailable: available },
    });
    return { detail: await readDetail(ctx, tx, itemId), published: before.isPublished };
  });
  if (published) await revalidatePublicSite(ctx);
  return detail;
}
