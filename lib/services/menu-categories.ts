import "server-only";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import {
  categoryDto,
  countActiveItemsInCategory,
  existingCategoryIds,
  insertCategory,
  listActiveCategoryOrder,
  listMenuCategories,
  lockActiveCategory,
  nextCategorySortOrder,
  setCategorySortOrders,
  updateCategoryRow,
  type MenuCategoryDto,
} from "@/lib/data/menu";
import { withTx } from "@/lib/data/tx";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { now } from "@/lib/time";
import type { CreateCategoryData, UpdateCategoryData } from "@/lib/validation/menu";
import { revalidatePublicSite } from "./public-revalidate";

/**
 * Menu category services (S1-P10-T002; api.md LD-MENU-01, SA-MENU-01…05; REQ-MENU-001/002/011).
 *
 * Callers are Server Actions that have already passed `requireTenant("menu:read" | "menu:manage")`; the tenant is
 * always `ctx.tenantId` and reaches the database only through `lib/data/menu.ts` (ADR-008).
 *
 * - Every write runs in one transaction with its audit row (SC-AUD-01) and locks the row it changes first, so two
 *   concurrent archives/reorders serialise instead of interleaving.
 * - A missing id and another tenant's id are both NOT_FOUND (SC-TEN-04) — the scoped read simply returns nothing.
 * - Categories are archived, never deleted: items (and the orders that snapshot them) keep pointing at them.
 * - Anything the public site can show revalidates `/r/{slug}` after the transaction commits.
 */

export type { MenuCategoryDto };

const RESOURCE = "menu_category";

/** LD-MENU-01 — `menu:read` (every tenant role): active or archived categories in display order, with item counts. */
export async function listCategories(ctx: TenantContext, options: { archived?: boolean } = {}): Promise<{ items: MenuCategoryDto[] }> {
  return { items: await listMenuCategories(ctx, { archived: options.archived ?? false }) };
}

/** The fields an audit row records for a category (money-free, so nothing is redacted). */
function categoryState(row: { name: string; description: string | null; iconKey: string | null; sortOrder: number; isPublished: boolean }) {
  return { name: row.name, description: row.description, iconKey: row.iconKey, sortOrder: row.sortOrder, isPublished: row.isPublished };
}

/** SA-MENU-01 — appended after the last active category; a duplicate name (case-insensitive) is 422 NAME_TAKEN. */
export async function createCategory(ctx: TenantContext, input: CreateCategoryData): Promise<MenuCategoryDto> {
  const created = await withTx(ctx, async (tx) => {
    const sortOrder = await nextCategorySortOrder(ctx, tx);
    const row = await insertCategory(ctx, tx, { name: input.name, description: input.description, iconKey: input.iconKey, sortOrder });
    await audit(tx, ctx, { action: "menu_category.created", resourceType: RESOURCE, resourceId: row.id, after: categoryState(row) });
    return categoryDto(row);
  });
  logger.info("menu_category.created", { requestId: ctx.requestId, tenantId: ctx.tenantId, categoryId: created.id });
  await revalidatePublicSite(ctx);
  return created;
}

/** Only the keys whose value actually changes, so an audit row never claims a field was touched when it was not. */
function changedFields<T extends Record<string, unknown>>(before: T, patch: Partial<T>): Partial<T> {
  const changes: Partial<T> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && before[key as keyof T] !== value) changes[key as keyof T] = value as T[keyof T];
  }
  return changes;
}

const pick = <T extends object>(source: T, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.map((key) => [key, (source as Record<string, unknown>)[key]]));

/** SA-MENU-02 — name / description / icon. Publication is SA-MENU-05, ordering SA-MENU-04. */
export async function updateCategory(ctx: TenantContext, input: UpdateCategoryData): Promise<MenuCategoryDto> {
  const { categoryId, ...patch } = input;
  const result = await withTx(ctx, async (tx) => {
    const before = await lockActiveCategory(ctx, tx, categoryId, "update");
    if (!before) throw new NotFoundError("Category not found.");

    const changes = changedFields(categoryState(before), patch);
    if (Object.keys(changes).length === 0) return { dto: categoryDto(before), published: before.isPublished };

    const after = await updateCategoryRow(ctx, tx, categoryId, changes);
    await audit(tx, ctx, {
      action: "menu_category.updated",
      resourceType: RESOURCE,
      resourceId: categoryId,
      before: pick(categoryState(before), Object.keys(changes)),
      after: pick(categoryState(after), Object.keys(changes)),
    });
    return { dto: categoryDto(after), published: before.isPublished || after.isPublished };
  });
  if (result.published) await revalidatePublicSite(ctx);
  return result.dto;
}

/** SA-MENU-03 — archive; 409 CATEGORY_NOT_EMPTY while it still holds non-archived items (TC-MENU-005). */
export async function archiveCategory(ctx: TenantContext, categoryId: string): Promise<MenuCategoryDto> {
  const at = now();
  const archived = await withTx(ctx, async (tx) => {
    const before = await lockActiveCategory(ctx, tx, categoryId, "update");
    if (!before) throw new NotFoundError("Category not found.");

    const items = await countActiveItemsInCategory(ctx, tx, categoryId);
    if (items > 0) {
      throw new ConflictError(
        `Archive or move the ${items} item${items === 1 ? "" : "s"} in this category first.`,
        "CATEGORY_NOT_EMPTY",
      );
    }

    // Archiving also unpublishes: an archived category must never reappear on the public site.
    const after = await updateCategoryRow(ctx, tx, categoryId, { archivedAt: at, isPublished: false });
    await audit(tx, ctx, {
      action: "menu_category.archived",
      resourceType: RESOURCE,
      resourceId: categoryId,
      before: categoryState(before),
      after: categoryState(after),
    });
    return categoryDto(after);
  });
  logger.info("menu_category.archived", { requestId: ctx.requestId, tenantId: ctx.tenantId, categoryId });
  await revalidatePublicSite(ctx);
  return archived;
}

/**
 * SA-MENU-04 — `orderedIds` must be exactly the tenant's non-archived categories. An id this tenant does not have
 * (another tenant's, an unknown one) is 404, like any other unknown id; a *stale* list — the tenant's own ids, but
 * missing or archived ones — is 422 so the editor can reload instead of silently reordering a subset (ADV-003).
 */
export async function reorderCategories(ctx: TenantContext, orderedIds: readonly string[]): Promise<{ items: MenuCategoryDto[] }> {
  await withTx(ctx, async (tx) => {
    const current = await listActiveCategoryOrder(ctx, tx);
    const active = new Set(current.map((c) => c.id));
    const known = await existingCategoryIds(ctx, tx, orderedIds);

    for (const id of orderedIds) if (!known.has(id)) throw new NotFoundError("Category not found.");
    if (orderedIds.length !== active.size || orderedIds.some((id) => !active.has(id))) {
      throw new ValidationError("The category list changed. Reload the page and try again.", {
        orderedIds: ["List exactly the active categories, each once"],
      });
    }

    await setCategorySortOrders(ctx, tx, orderedIds);
    await audit(tx, ctx, {
      action: "menu_category.reordered",
      resourceType: RESOURCE,
      resourceId: null,
      before: { orderedIds: current.map((c) => c.id) },
      after: { orderedIds: [...orderedIds] },
    });
  });
  await revalidatePublicSite(ctx);
  return listCategories(ctx);
}

/** SA-MENU-05 — publish / unpublish; the public page is revalidated either way. */
export async function setCategoryPublished(ctx: TenantContext, categoryId: string, published: boolean): Promise<MenuCategoryDto> {
  const updated = await withTx(ctx, async (tx) => {
    const before = await lockActiveCategory(ctx, tx, categoryId, "update");
    if (!before) throw new NotFoundError("Category not found.");
    if (before.isPublished === published) return categoryDto(before);

    const after = await updateCategoryRow(ctx, tx, categoryId, { isPublished: published });
    await audit(tx, ctx, {
      action: published ? "menu_category.published" : "menu_category.unpublished",
      resourceType: RESOURCE,
      resourceId: categoryId,
      before: { isPublished: before.isPublished },
      after: { isPublished: after.isPublished },
    });
    return categoryDto(after);
  });
  await revalidatePublicSite(ctx);
  return updated;
}
