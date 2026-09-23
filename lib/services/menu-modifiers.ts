import "server-only";
import type { Prisma } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import {
  archiveAddons,
  archiveVariants,
  findMenuItem,
  insertAddons,
  insertVariants,
  itemDetailDto,
  lockActiveItem,
  updateAddonRow,
  updateItemRow,
  updateVariantRow,
  type MenuItemDetailDto,
} from "@/lib/data/menu";
import { withTx, type Tx } from "@/lib/data/tx";
import { NotFoundError } from "@/lib/errors";
import { now } from "@/lib/time";
import type { ReplaceAddonsData, ReplaceVariantsData } from "@/lib/validation/menu";
import { revalidatePublicSite } from "./public-revalidate";

/**
 * Variant and add-on services (S1-P10-T004; api.md SA-MENU-12/13; REQ-MENU-004/005, REQ-TXN-009).
 *
 * Both actions are *replace-set*: the payload is the item's new list of active modifiers, in order.
 * - An entry with an `id` must be one of this item's active modifiers — another item's or another tenant's id is
 *   NOT_FOUND, like an unknown one (SC-TEN-04). Entries without an id are inserted.
 * - Modifiers left out are archived, never deleted: order lines reference them and must keep resolving (REQ-TXN-009).
 * - Prices are `Prisma.Decimal` (ADR-010 §1); the JSON price blobs of the baseline are gone.
 *
 * Ordering inside the transaction matters, because three partial unique indexes are checked per statement:
 * `(menu_item_id, lower(name)) WHERE archived_at IS NULL`, the same for add-ons, and
 * `(menu_item_id) WHERE is_default AND archived_at IS NULL`. So the set is applied as:
 *   1. archive the omitted rows (frees their names, clears their default flag),
 *   2. clear `is_default` on every kept row (frees the single-default index),
 *   3. move kept rows whose name changes to a unique placeholder (lets two rows swap names),
 *   4. write the final values of kept rows, then insert the new ones.
 */

const RESOURCE = "menu_item";

/** A placeholder no user input can collide with: `id` is a uuid, and the schema caps names at 60 characters. */
const placeholder = (id: string) => `~${id}`;

type OptionInput = { id?: string; name: string; price: Prisma.Decimal; isAvailable: boolean };
type OptionRow = { id: string; name: string; price: Prisma.Decimal; isAvailable: boolean; displayOrder: number };

/** Splits the payload into rows to keep (with their current state) and rows to insert; unknown ids are 404. */
function planReplacement<R extends OptionRow, I extends OptionInput>(
  active: readonly R[],
  inputs: readonly I[],
): { keep: Array<{ input: I; row: R; index: number }>; add: Array<{ input: I; index: number }>; archive: string[] } {
  const byId = new Map(active.map((row) => [row.id, row]));
  const keep: Array<{ input: I; row: R; index: number }> = [];
  const add: Array<{ input: I; index: number }> = [];

  inputs.forEach((input, index) => {
    if (input.id === undefined) {
      add.push({ input, index });
      return;
    }
    const row = byId.get(input.id);
    if (!row) throw new NotFoundError("Not found.");
    keep.push({ input, row, index });
  });

  const kept = new Set(keep.map((k) => k.row.id));
  return { keep, add, archive: active.filter((row) => !kept.has(row.id)).map((row) => row.id) };
}

async function detailOf(ctx: TenantContext, tx: Tx, itemId: string): Promise<MenuItemDetailDto> {
  const row = await findMenuItem(ctx, itemId, tx);
  if (!row) throw new NotFoundError("Menu item not found.");
  return itemDetailDto(row);
}

const variantState = (rows: ReadonlyArray<{ name: string; price: Prisma.Decimal | string; isDefault: boolean; isAvailable: boolean }>) =>
  rows.map((r) => ({ name: r.name, price: typeof r.price === "string" ? r.price : r.price.toFixed(2), isDefault: r.isDefault, isAvailable: r.isAvailable }));

const addonState = (rows: ReadonlyArray<{ name: string; price: Prisma.Decimal | string; isAvailable: boolean }>) =>
  rows.map((r) => ({ name: r.name, price: typeof r.price === "string" ? r.price : r.price.toFixed(2), isAvailable: r.isAvailable }));

/** SA-MENU-12 — replaces the item's variant set (≤20, unique names, at most one default). */
export async function replaceVariants(ctx: TenantContext, input: ReplaceVariantsData): Promise<MenuItemDetailDto> {
  const at = now();
  const { detail, published } = await withTx(ctx, async (tx) => {
    const item = await lockActiveItem(ctx, tx, input.itemId);
    if (!item) throw new NotFoundError("Menu item not found.");

    const before = variantState(item.variants);
    const plan = planReplacement(item.variants, input.variants);

    await archiveVariants(ctx, tx, item.id, plan.archive, at);
    for (const { row } of plan.keep) if (row.isDefault) await updateVariantRow(ctx, tx, row.id, { isDefault: false });
    for (const { input: value, row } of plan.keep) if (value.name !== row.name) await updateVariantRow(ctx, tx, row.id, { name: placeholder(row.id) });
    for (const { input: value, row, index } of plan.keep) {
      await updateVariantRow(ctx, tx, row.id, { name: value.name, price: value.price, isDefault: value.isDefault, isAvailable: value.isAvailable, displayOrder: index });
    }
    await insertVariants(
      ctx,
      tx,
      item.id,
      plan.add.map(({ input: value, index }) => ({ name: value.name, price: value.price, isDefault: value.isDefault, isAvailable: value.isAvailable, displayOrder: index })),
    );
    // The item's own `updatedAt` moves too, so an editor holding a stale `expectedUpdatedAt` is told to reload.
    await updateItemRow(ctx, tx, item.id, { updatedAt: at });

    const detail = await detailOf(ctx, tx, item.id);
    await audit(tx, ctx, {
      action: "menu_item.variants_updated",
      resourceType: RESOURCE,
      resourceId: item.id,
      before: { variants: before },
      after: { variants: variantState(detail.variants) },
    });
    return { detail, published: item.isPublished };
  });
  if (published) await revalidatePublicSite(ctx);
  return detail;
}

/** SA-MENU-13 — replaces the item's add-on set (≤30, unique names). */
export async function replaceAddons(ctx: TenantContext, input: ReplaceAddonsData): Promise<MenuItemDetailDto> {
  const at = now();
  const { detail, published } = await withTx(ctx, async (tx) => {
    const item = await lockActiveItem(ctx, tx, input.itemId);
    if (!item) throw new NotFoundError("Menu item not found.");

    const before = addonState(item.addons);
    const plan = planReplacement(item.addons, input.addons);

    await archiveAddons(ctx, tx, item.id, plan.archive, at);
    for (const { input: value, row } of plan.keep) if (value.name !== row.name) await updateAddonRow(ctx, tx, row.id, { name: placeholder(row.id) });
    for (const { input: value, row, index } of plan.keep) {
      await updateAddonRow(ctx, tx, row.id, { name: value.name, price: value.price, isAvailable: value.isAvailable, displayOrder: index });
    }
    await insertAddons(
      ctx,
      tx,
      item.id,
      plan.add.map(({ input: value, index }) => ({ name: value.name, price: value.price, isAvailable: value.isAvailable, displayOrder: index })),
    );
    await updateItemRow(ctx, tx, item.id, { updatedAt: at });

    const detail = await detailOf(ctx, tx, item.id);
    await audit(tx, ctx, {
      action: "menu_item.addons_updated",
      resourceType: RESOURCE,
      resourceId: item.id,
      before: { addons: before },
      after: { addons: addonState(detail.addons) },
    });
    return { detail, published: item.isPublished };
  });
  if (published) await revalidatePublicSite(ctx);
  return detail;
}
