import "server-only";
import type { DailyMenuStatus } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import {
  dailyMenuDto,
  dailyMenuItemIds,
  deleteDailyMenuRow,
  findDailyMenuByDate,
  findMenuItemsForDailyMenu,
  insertDailyMenu,
  listDailyMenusInRange,
  listPickableItems,
  listRecentDailyMenus,
  lockDailyMenu,
  lockDailyMenuByDate,
  readDailyMenu,
  replaceDailyMenuItems,
  updateDailyMenuRow,
  type DailyMenuDto,
  type DailyMenuRow,
  type DailyMenuSummaryDto,
  type PickableItemDto,
} from "@/lib/data/daily-menu";
import { businessDateDto, businessDateValue } from "@/lib/data/dto";
import { withTx, type Tx } from "@/lib/data/tx";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { businessDateFor, now, toIsoDate } from "@/lib/time";
import type { CopyDailyMenuData, SaveDailyMenuDraftData } from "@/lib/validation/menu";
import { revalidatePublicSite } from "./public-revalidate";

/**
 * Daily menu services (S1-P11-T001/T002; api.md LD-DMENU-01/02, SA-DMENU-01…05; REQ-DMENU-001…008).
 *
 * A daily menu is keyed by *business date* — the calendar date in the restaurant's own timezone at the current
 * instant (ADR-010 §5, fixes BA-14). "Today" is therefore `businessDateFor(now(), ctx.restaurant.timezone)`, never
 * the server's local date: a menu dated tomorrow becomes today's menu at local midnight in Kolkata and, four and a
 * half hours later, in New York (TC-TZ-003). The clock comes from `lib/time` so tests can pin an instant.
 *
 * Callers have already passed `requireTenant("daily_menu:read" | "daily_menu:manage")`. Data access goes only through
 * `lib/data/daily-menu.ts` (ADR-008); every write runs in one transaction with its audit row (SC-AUD-01), after
 * locking the menu (by id, or by date for the upsert) so two concurrent saves of one date serialise.
 */

export type { DailyMenuDto, DailyMenuSummaryDto, PickableItemDto };

const RESOURCE = "daily_menu";

/** Today's business date for this restaurant. */
export function businessToday(ctx: TenantContext): Date {
  return businessDateFor(now(), ctx.restaurant.timezone);
}

/** 422 for a business date the restaurant has already lived through (REQ-DMENU-005). */
function pastDate(businessDate: string, today: string): ValidationError {
  return new ValidationError(`${businessDate} has already passed. Choose ${today} or a later date.`, { businessDate: ["Choose today or a later date"] }, "DATE_IN_PAST");
}

/** Number of previous menus offered as copy sources in the editor. */
const RECENT_MENU_LIMIT = 7;

export type DailyMenuEditorView = {
  businessDate: string;
  today: string;
  dailyMenu: DailyMenuDto | null;
  pickableItems: PickableItemDto[];
  previousMenus: DailyMenuSummaryDto[];
};

/** LD-DMENU-01 — `daily_menu:read` (every tenant role); a missing date means today in the restaurant timezone. */
export async function getEditor(ctx: TenantContext, query: { businessDate?: string } = {}): Promise<DailyMenuEditorView> {
  const today = businessToday(ctx);
  const businessDate = query.businessDate === undefined ? today : businessDateValue(query.businessDate);
  const [menu, pickableItems, previousMenus] = await Promise.all([
    findDailyMenuByDate(ctx, businessDate),
    listPickableItems(ctx),
    listRecentDailyMenus(ctx, businessDate, RECENT_MENU_LIMIT),
  ]);
  return {
    businessDate: businessDateDto(businessDate),
    today: toIsoDate(today),
    dailyMenu: menu ? dailyMenuDto(menu) : null,
    pickableItems,
    previousMenus,
  };
}

/** LD-DMENU-02 — `daily_menu:read`: the menus in an inclusive range of at most 62 days, oldest first. */
export async function getCalendar(ctx: TenantContext, range: { from: string; to: string }): Promise<{ items: DailyMenuSummaryDto[]; today: string }> {
  const items = await listDailyMenusInRange(ctx, businessDateValue(range.from), businessDateValue(range.to));
  return { items, today: toIsoDate(businessToday(ctx)) };
}

/**
 * What today's public page shows (api.md LD-PUB-02, the tenant-scoped half): the PUBLISHED menu whose business date
 * is today in the restaurant timezone, with only published, non-archived items. `null` before local midnight of the
 * day a future menu is dated for — which is what TC-TZ-003 pins down.
 */
export async function publishedMenuForToday(ctx: TenantContext): Promise<DailyMenuDto | null> {
  const menu = await findDailyMenuByDate(ctx, businessToday(ctx));
  if (!menu || menu.status !== "PUBLISHED") return null;
  const dto = dailyMenuDto(menu);
  return { ...dto, items: dto.items.filter((item) => item.isPublished && !item.isArchived) };
}

// ─── Writes ───

/** Every listed id must be one of this tenant's non-archived items; anything else is NOT_FOUND (TI-012). */
async function requireOwnActiveItems(ctx: TenantContext, tx: Tx, itemIds: readonly string[]): Promise<void> {
  if (itemIds.length === 0) return;
  const found = await findMenuItemsForDailyMenu(ctx, tx, itemIds);
  const usable = new Set(found.filter((item) => !item.isArchived).map((item) => item.id));
  for (const id of itemIds) if (!usable.has(id)) throw new NotFoundError("Menu item not found.");
}

async function requireMenu(ctx: TenantContext, tx: Tx, dailyMenuId: string): Promise<DailyMenuRow> {
  const menu = await lockDailyMenu(ctx, tx, dailyMenuId);
  if (!menu) throw new NotFoundError("Daily menu not found.");
  return menu;
}

/**
 * SA-DMENU-01 — upsert by (tenant, business date). The item list is the new ordered set; display order is position.
 * Saving into a PUBLISHED menu keeps it published (api.md) and revalidates the public page.
 */
export async function saveDraft(ctx: TenantContext, input: SaveDailyMenuDraftData): Promise<{ dailyMenuId: string; status: DailyMenuStatus; dailyMenu: DailyMenuDto }> {
  const at = now();
  const today = businessToday(ctx);
  const businessDate = businessDateValue(input.businessDate);
  if (businessDate.getTime() < today.getTime()) throw pastDate(input.businessDate, toIsoDate(today));

  const saved = await withTx(ctx, async (tx) => {
    const existing = await lockDailyMenuByDate(ctx, tx, businessDate);
    await requireOwnActiveItems(ctx, tx, input.itemIds);

    if (!existing) {
      const dailyMenuId = await insertDailyMenu(ctx, tx, {
        businessDate,
        title: input.title ?? null,
        note: input.note ?? null,
        copiedFromDailyMenuId: null,
      });
      await replaceDailyMenuItems(ctx, tx, dailyMenuId, input.itemIds);
      const menu = await readDailyMenu(ctx, tx, dailyMenuId);
      if (!menu) throw new NotFoundError("Daily menu not found.");
      await audit(tx, ctx, {
        action: "daily_menu.created",
        resourceType: RESOURCE,
        resourceId: dailyMenuId,
        after: { businessDate: input.businessDate, status: menu.status, title: menu.title, itemIds: [...input.itemIds] },
      });
      return dailyMenuDto(menu);
    }

    const before = { businessDate: input.businessDate, title: existing.title, note: existing.note, itemIds: dailyMenuItemIds(existing) };
    await updateDailyMenuRow(ctx, tx, existing.id, { title: input.title, note: input.note, updatedAt: at });
    await replaceDailyMenuItems(ctx, tx, existing.id, input.itemIds);
    const menu = await readDailyMenu(ctx, tx, existing.id);
    if (!menu) throw new NotFoundError("Daily menu not found.");
    await audit(tx, ctx, {
      action: "daily_menu.items_updated",
      resourceType: RESOURCE,
      resourceId: existing.id,
      before,
      after: { businessDate: input.businessDate, title: menu.title, note: menu.note, itemIds: dailyMenuItemIds(menu) },
    });
    return dailyMenuDto(menu);
  });

  if (saved.status === "PUBLISHED") await revalidatePublicSite(ctx);
  return { dailyMenuId: saved.id, status: saved.status, dailyMenu: saved };
}

/** SA-DMENU-02 — ≥1 item, every item published and not archived, date not in the past. */
export async function publish(ctx: TenantContext, dailyMenuId: string): Promise<DailyMenuDto> {
  const at = now();
  const today = businessToday(ctx);
  const published = await withTx(ctx, async (tx) => {
    const menu = await requireMenu(ctx, tx, dailyMenuId);
    if (menu.businessDate.getTime() < today.getTime()) throw pastDate(businessDateDto(menu.businessDate), toIsoDate(today));
    if (menu.items.length === 0) {
      throw new ValidationError("Add at least one item before publishing this menu.", { itemIds: ["Add at least one item"] }, "DAILY_MENU_EMPTY");
    }
    const blocked = menu.items.filter((item) => !item.menuItem.isPublished || item.menuItem.archivedAt !== null);
    if (blocked.length > 0) {
      const names = blocked.map((item) => item.menuItem.name);
      throw new ValidationError(`Publish or remove these items first: ${names.join(", ")}.`, { itemIds: names }, "ITEM_NOT_PUBLISHED");
    }
    if (menu.status === "PUBLISHED") return dailyMenuDto(menu);

    await updateDailyMenuRow(ctx, tx, dailyMenuId, { status: "PUBLISHED", publishedAt: at, publishedByUserId: ctx.userId });
    const after = await readDailyMenu(ctx, tx, dailyMenuId);
    if (!after) throw new NotFoundError("Daily menu not found.");
    await audit(tx, ctx, {
      action: "daily_menu.published",
      resourceType: RESOURCE,
      resourceId: dailyMenuId,
      before: { status: menu.status, itemIds: dailyMenuItemIds(menu) },
      after: { status: after.status, businessDate: businessDateDto(after.businessDate), itemIds: dailyMenuItemIds(after) },
    });
    return dailyMenuDto(after);
  });
  logger.info("daily_menu.published", { requestId: ctx.requestId, tenantId: ctx.tenantId, dailyMenuId });
  await revalidatePublicSite(ctx);
  return published;
}

/** SA-DMENU-03 — only a PUBLISHED menu can be hidden again (409 NOT_PUBLISHED otherwise). */
export async function unpublish(ctx: TenantContext, dailyMenuId: string): Promise<DailyMenuDto> {
  const at = now();
  const updated = await withTx(ctx, async (tx) => {
    const menu = await requireMenu(ctx, tx, dailyMenuId);
    if (menu.status !== "PUBLISHED") throw new ConflictError("This menu is not published.", "NOT_PUBLISHED");

    await updateDailyMenuRow(ctx, tx, dailyMenuId, { status: "UNPUBLISHED", unpublishedAt: at });
    const after = await readDailyMenu(ctx, tx, dailyMenuId);
    if (!after) throw new NotFoundError("Daily menu not found.");
    await audit(tx, ctx, {
      action: "daily_menu.unpublished",
      resourceType: RESOURCE,
      resourceId: dailyMenuId,
      before: { status: menu.status, itemIds: dailyMenuItemIds(menu) },
      after: { status: after.status, itemIds: dailyMenuItemIds(after) },
    });
    return dailyMenuDto(after);
  });
  await revalidatePublicSite(ctx);
  return updated;
}

export type CopyDailyMenuResult = {
  dailyMenuId: string;
  copiedCount: number;
  skipped: Array<{ menuItemId: string; name: string; reason: "ARCHIVED" | "NOT_PUBLISHED" }>;
  dailyMenu: DailyMenuDto;
};

/**
 * SA-DMENU-04 — copies a previous date's item set to another date. Items that have since been archived or
 * unpublished are left out and reported, so the manager sees what changed instead of publishing a broken menu.
 * The target keeps DRAFT status; a PUBLISHED target is refused (409) rather than silently rewritten.
 */
export async function copyDailyMenu(ctx: TenantContext, input: CopyDailyMenuData): Promise<CopyDailyMenuResult> {
  const at = now();
  const today = businessToday(ctx);
  const fromDate = businessDateValue(input.fromBusinessDate);
  const toDate = businessDateValue(input.toBusinessDate);
  if (toDate.getTime() < today.getTime()) throw pastDate(input.toBusinessDate, toIsoDate(today));

  const result = await withTx(ctx, async (tx): Promise<CopyDailyMenuResult> => {
    const source = await findDailyMenuByDate(ctx, fromDate, tx);
    if (!source) throw new NotFoundError("Daily menu not found.");

    const target = await lockDailyMenuByDate(ctx, tx, toDate);
    if (target && target.status === "PUBLISHED") {
      throw new ConflictError(`${input.toBusinessDate} already has a published menu. Unpublish it before copying over it.`, "TARGET_PUBLISHED");
    }

    const sourceIds = dailyMenuItemIds(source);
    const candidates = await findMenuItemsForDailyMenu(ctx, tx, sourceIds);
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const keep: string[] = [];
    const skipped: CopyDailyMenuResult["skipped"] = [];
    for (const id of sourceIds) {
      const candidate = byId.get(id);
      if (!candidate) continue; // the item was hard-deleted; nothing to copy or report
      if (candidate.isArchived) skipped.push({ menuItemId: id, name: candidate.name, reason: "ARCHIVED" });
      else if (!candidate.isPublished) skipped.push({ menuItemId: id, name: candidate.name, reason: "NOT_PUBLISHED" });
      else keep.push(id);
    }

    let dailyMenuId: string;
    let before: Record<string, unknown> | null = null;
    if (!target) {
      dailyMenuId = await insertDailyMenu(ctx, tx, { businessDate: toDate, title: source.title, note: source.note, copiedFromDailyMenuId: source.id });
    } else {
      dailyMenuId = target.id;
      before = { businessDate: input.toBusinessDate, status: target.status, itemIds: dailyMenuItemIds(target) };
      await updateDailyMenuRow(ctx, tx, dailyMenuId, { title: source.title, note: source.note, copiedFromDailyMenuId: source.id, updatedAt: at });
    }
    await replaceDailyMenuItems(ctx, tx, dailyMenuId, keep);

    const menu = await readDailyMenu(ctx, tx, dailyMenuId);
    if (!menu) throw new NotFoundError("Daily menu not found.");
    await audit(tx, ctx, {
      action: "daily_menu.copied",
      resourceType: RESOURCE,
      resourceId: dailyMenuId,
      before,
      after: {
        businessDate: input.toBusinessDate,
        copiedFromBusinessDate: input.fromBusinessDate,
        itemIds: keep,
        skipped: skipped.map((s) => ({ menuItemId: s.menuItemId, reason: s.reason })),
      },
    });
    return { dailyMenuId, copiedCount: keep.length, skipped, dailyMenu: dailyMenuDto(menu) };
  });

  logger.info("daily_menu.copied", { requestId: ctx.requestId, tenantId: ctx.tenantId, dailyMenuId: result.dailyMenuId, copiedCount: result.copiedCount });
  return result;
}

/** SA-DMENU-05 — only a DRAFT is deletable (409 NOT_DRAFT); its items cascade and copies lose the source link. */
export async function deleteDraft(ctx: TenantContext, dailyMenuId: string): Promise<{ id: string }> {
  await withTx(ctx, async (tx) => {
    const menu = await requireMenu(ctx, tx, dailyMenuId);
    if (menu.status !== "DRAFT") throw new ConflictError("Only a draft menu can be deleted. Unpublish it first.", "NOT_DRAFT");

    const before = { businessDate: businessDateDto(menu.businessDate), status: menu.status, title: menu.title, itemIds: dailyMenuItemIds(menu) };
    if (!(await deleteDailyMenuRow(ctx, tx, dailyMenuId))) {
      throw new ConflictError("A social post still refers to this menu. Archive the post first.", "DAILY_MENU_IN_USE");
    }
    await audit(tx, ctx, { action: "daily_menu.deleted", resourceType: RESOURCE, resourceId: dailyMenuId, before, after: null });
  });
  logger.info("daily_menu.deleted", { requestId: ctx.requestId, tenantId: ctx.tenantId, dailyMenuId });
  return { id: dailyMenuId };
}
