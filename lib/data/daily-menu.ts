import "server-only";
import { Prisma, type DailyMenuStatus, type DietaryType } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { db } from "@/lib/db/prisma";
import { businessDateDto, instantDto, moneyDto, nullableInstantDto } from "./dto";
import { mapErrors } from "./errors";
import { tenantKey, tenantScope } from "./scope";
import type { Tx } from "./tx";

/**
 * Daily menu data access (S1-P11-T001/T002; data-model.md E11–E12; api.md LD-DMENU-01/02). One menu per tenant and
 * business date (BR-DMENU-01). Business rules (dates, publish checks, copy reports) live in `lib/services/daily-menu.ts`.
 *
 * Every query is scoped with `tenantScope(ctx, …)` / `tenantKey(ctx, id)`: a business date is not tenant-bound, so a
 * date both tenants use still returns only the caller's menu (TI-011); another tenant's daily menu or item id matches
 * nothing and is reported exactly like a missing one (TI-012, TI-013). Business dates are PostgreSQL DATE values,
 * passed as UTC-midnight `Date`s.
 */

export type DailyMenuItemDto = {
  menuItemId: string;
  name: string;
  displayOrder: number;
  isPublished: boolean;
  isAvailable: boolean;
  isArchived: boolean;
};

export type DailyMenuDto = {
  id: string;
  businessDate: string;
  status: DailyMenuStatus;
  title: string | null;
  note: string | null;
  publishedAt: string | null;
  unpublishedAt: string | null;
  copiedFromBusinessDate: string | null;
  createdAt: string;
  updatedAt: string;
  items: DailyMenuItemDto[];
};

const dailyMenuSelect = {
  id: true,
  businessDate: true,
  status: true,
  title: true,
  note: true,
  publishedAt: true,
  unpublishedAt: true,
  createdAt: true,
  updatedAt: true,
  copiedFrom: { select: { businessDate: true } },
  items: {
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      menuItemId: true,
      displayOrder: true,
      menuItem: { select: { name: true, isPublished: true, isAvailable: true, archivedAt: true } },
    },
  },
} satisfies Prisma.DailyMenuSelect;

export type DailyMenuRow = Prisma.DailyMenuGetPayload<{ select: typeof dailyMenuSelect }>;

export function dailyMenuDto(row: DailyMenuRow): DailyMenuDto {
  return {
    id: row.id,
    businessDate: businessDateDto(row.businessDate),
    status: row.status,
    title: row.title,
    note: row.note,
    publishedAt: nullableInstantDto(row.publishedAt),
    unpublishedAt: nullableInstantDto(row.unpublishedAt),
    copiedFromBusinessDate: row.copiedFrom ? businessDateDto(row.copiedFrom.businessDate) : null,
    createdAt: instantDto(row.createdAt),
    updatedAt: instantDto(row.updatedAt),
    items: row.items.map((i) => ({
      menuItemId: i.menuItemId,
      name: i.menuItem.name,
      displayOrder: i.displayOrder,
      isPublished: i.menuItem.isPublished,
      isAvailable: i.menuItem.isAvailable,
      isArchived: i.menuItem.archivedAt !== null,
    })),
  };
}

export const dailyMenuItemIds = (row: DailyMenuRow): string[] => row.items.map((i) => i.menuItemId);

// ─── Reads ───

/** The caller's menu for a business date, or null (LD-DMENU-01). */
export async function findDailyMenuByDate(ctx: TenantContext, businessDate: Date, client: Tx = db): Promise<DailyMenuRow | null> {
  return mapErrors("Daily menu", () => client.dailyMenu.findFirst({ where: tenantScope(ctx, { businessDate }), select: dailyMenuSelect }));
}

export async function readDailyMenu(ctx: TenantContext, tx: Tx, id: string): Promise<DailyMenuRow | null> {
  return tx.dailyMenu.findUnique({ where: tenantKey(ctx, id), select: dailyMenuSelect });
}

/** Locks a daily menu row until the transaction ends and reads it; null for a missing or other tenant's id. */
export async function lockDailyMenu(ctx: TenantContext, tx: Tx, id: string): Promise<DailyMenuRow | null> {
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM daily_menus WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${id}::uuid FOR UPDATE`;
  if (locked.length === 0) return null;
  return readDailyMenu(ctx, tx, id);
}

/** Locks the caller's menu for a date (if any) until the transaction ends; concurrent saves of one date serialise. */
export async function lockDailyMenuByDate(ctx: TenantContext, tx: Tx, businessDate: Date): Promise<DailyMenuRow | null> {
  // The date travels as `YYYY-MM-DD` text: a Date parameter would be a timestamptz whose ::date depends on the session zone.
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM daily_menus WHERE tenant_id = ${ctx.tenantId}::uuid AND business_date = ${businessDateDto(businessDate)}::date FOR UPDATE`;
  if (locked.length === 0) return null;
  return readDailyMenu(ctx, tx, locked[0].id);
}

export type DailyMenuCandidate = { id: string; name: string; isPublished: boolean; isArchived: boolean };

/** The caller's menu items among `ids` (archived included, flagged); other tenants' ids simply do not match. */
export async function findMenuItemsForDailyMenu(ctx: TenantContext, tx: Tx, ids: readonly string[]): Promise<DailyMenuCandidate[]> {
  if (ids.length === 0) return [];
  const rows = await tx.menuItem.findMany({
    where: tenantScope(ctx, { id: { in: [...ids] } }),
    select: { id: true, name: true, isPublished: true, archivedAt: true },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, isPublished: r.isPublished, isArchived: r.archivedAt !== null }));
}

export type PickableItemDto = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  basePrice: string;
  dietaryType: DietaryType | null;
  isPublished: boolean;
  isAvailable: boolean;
};

/** Items the editor can add: the tenant's non-archived items in menu order, with publication flags (LD-DMENU-01). */
export async function listPickableItems(ctx: TenantContext): Promise<PickableItemDto[]> {
  const rows = await mapErrors("Menu item", () =>
    db.menuItem.findMany({
      where: tenantScope(ctx, { archivedAt: null, category: { archivedAt: null } }),
      orderBy: [{ category: { sortOrder: "asc" } }, { category: { name: "asc" } }, { displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        categoryId: true,
        basePrice: true,
        dietaryType: true,
        isPublished: true,
        isAvailable: true,
        category: { select: { name: true } },
      },
    }),
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    categoryId: r.categoryId,
    categoryName: r.category.name,
    basePrice: moneyDto(r.basePrice),
    dietaryType: r.dietaryType,
    isPublished: r.isPublished,
    isAvailable: r.isAvailable,
  }));
}

export type DailyMenuSummaryDto = { businessDate: string; status: DailyMenuStatus; itemCount: number };

const summarySelect = { businessDate: true, status: true, _count: { select: { items: true } } } satisfies Prisma.DailyMenuSelect;

function summaryDto(row: Prisma.DailyMenuGetPayload<{ select: typeof summarySelect }>): DailyMenuSummaryDto {
  return { businessDate: businessDateDto(row.businessDate), status: row.status, itemCount: row._count.items };
}

/** The most recent menus before `businessDate`, newest first (copy sources for the editor). */
export async function listRecentDailyMenus(ctx: TenantContext, beforeDate: Date, limit: number): Promise<DailyMenuSummaryDto[]> {
  const rows = await mapErrors("Daily menu", () =>
    db.dailyMenu.findMany({
      where: tenantScope(ctx, { businessDate: { lt: beforeDate } }),
      orderBy: { businessDate: "desc" },
      take: limit,
      select: summarySelect,
    }),
  );
  return rows.map(summaryDto);
}

/** LD-DMENU-02: the caller's menus with `from ≤ business_date ≤ to`, oldest first. */
export async function listDailyMenusInRange(ctx: TenantContext, from: Date, to: Date): Promise<DailyMenuSummaryDto[]> {
  const rows = await mapErrors("Daily menu", () =>
    db.dailyMenu.findMany({
      where: tenantScope(ctx, { businessDate: { gte: from, lte: to } }),
      orderBy: { businessDate: "asc" },
      select: summarySelect,
    }),
  );
  return rows.map(summaryDto);
}

// ─── Writes ───

export type DailyMenuInsert = { businessDate: Date; title: string | null; note: string | null; copiedFromDailyMenuId: string | null };

export async function insertDailyMenu(ctx: TenantContext, tx: Tx, data: DailyMenuInsert): Promise<string> {
  const row = await tx.dailyMenu.create({
    data: { ...data, tenantId: ctx.tenantId, status: "DRAFT", createdByUserId: ctx.userId },
    select: { id: true },
  });
  return row.id;
}

export type DailyMenuPatch = {
  title?: string | null;
  note?: string | null;
  status?: DailyMenuStatus;
  publishedAt?: Date;
  publishedByUserId?: string;
  unpublishedAt?: Date;
  copiedFromDailyMenuId?: string | null;
  updatedAt?: Date;
};

export async function updateDailyMenuRow(ctx: TenantContext, tx: Tx, id: string, data: DailyMenuPatch): Promise<void> {
  // Unchecked input: the copy source is the composite (tenant_id, copied_from_daily_menu_id) column pair.
  const patch: Prisma.DailyMenuUncheckedUpdateInput = data;
  await tx.dailyMenu.update({ where: tenantKey(ctx, id), data: patch, select: { id: true } });
}

/** Replaces the menu's item set with `itemIds` in that order (display order = position). */
export async function replaceDailyMenuItems(ctx: TenantContext, tx: Tx, dailyMenuId: string, itemIds: readonly string[]): Promise<void> {
  await tx.dailyMenuItem.deleteMany({ where: tenantScope(ctx, { dailyMenuId }) });
  if (itemIds.length === 0) return;
  await tx.dailyMenuItem.createMany({
    data: itemIds.map((menuItemId, index) => ({ tenantId: ctx.tenantId, dailyMenuId, menuItemId, displayOrder: index })),
  });
}

/**
 * Hard-deletes a menu (its items cascade). Copies made from it lose their copy-source reference first, in the same
 * transaction (data-model E11 note: that FK is RESTRICT). Returns false when a social post still references it.
 */
export async function deleteDailyMenuRow(ctx: TenantContext, tx: Tx, id: string): Promise<boolean> {
  await tx.dailyMenu.updateMany({ where: tenantScope(ctx, { copiedFromDailyMenuId: id }), data: { copiedFromDailyMenuId: null } });
  if ((await tx.socialPost.count({ where: tenantScope(ctx, { dailyMenuId: id }) })) > 0) return false;
  await tx.dailyMenu.delete({ where: tenantKey(ctx, id), select: { id: true } });
  return true;
}

export type DailyMenuItemRemoval = { dailyMenuId: string; businessDate: string; status: DailyMenuStatus; before: string[]; after: string[] };

/**
 * Removes an item from every menu dated `fromDate` or later (archiving an item, api.md SA-MENU-08) and renumbers the
 * remaining items; menus before `fromDate` are history and keep it. Returns each changed menu's item set before/after.
 */
export async function removeItemFromDailyMenusFrom(
  ctx: TenantContext,
  tx: Tx,
  menuItemId: string,
  fromDate: Date,
  at: Date,
): Promise<DailyMenuItemRemoval[]> {
  const menus = await tx.dailyMenu.findMany({
    where: tenantScope(ctx, { businessDate: { gte: fromDate }, items: { some: { menuItemId } } }),
    orderBy: { businessDate: "asc" },
    select: { id: true, businessDate: true, status: true, items: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }], select: { id: true, menuItemId: true } } },
  });
  const removals: DailyMenuItemRemoval[] = [];
  for (const menu of menus) {
    const before = menu.items.map((i) => i.menuItemId);
    await tx.dailyMenuItem.deleteMany({ where: tenantScope(ctx, { dailyMenuId: menu.id, menuItemId }) });
    const remaining = menu.items.filter((i) => i.menuItemId !== menuItemId);
    for (const [index, item] of remaining.entries()) {
      await tx.dailyMenuItem.update({ where: tenantKey(ctx, item.id), data: { displayOrder: index }, select: { id: true } });
    }
    await tx.dailyMenu.update({ where: tenantKey(ctx, menu.id), data: { updatedAt: at }, select: { id: true } });
    removals.push({ dailyMenuId: menu.id, businessDate: businessDateDto(menu.businessDate), status: menu.status, before, after: remaining.map((i) => i.menuItemId) });
  }
  return removals;
}
