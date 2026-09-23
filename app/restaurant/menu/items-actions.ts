"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { archiveItem, createItem, getItemDetail, listItems, reorderItems, setItemAvailability, setItemPublished, updateItem } from "@/lib/services/menu-items";
import { replaceAddons, replaceVariants } from "@/lib/services/menu-modifiers";
import { parseInput } from "@/lib/validation/core";
import {
  createMenuItemSchema,
  menuItemListQuerySchema,
  menuItemRefSchema,
  replaceAddonsSchema,
  replaceVariantsSchema,
  reorderMenuItemsSchema,
  setMenuItemAvailabilitySchema,
  setMenuItemPublishedSchema,
  updateMenuItemSchema,
  type CreateMenuItemInput,
  type MenuItemListQueryInput,
  type MenuItemRefInput,
  type ReorderMenuItemsInput,
  type ReplaceAddonsInput,
  type ReplaceVariantsInput,
  type SetMenuItemAvailabilityInput,
  type SetMenuItemPublishedInput,
  type UpdateMenuItemInput,
} from "@/lib/validation/menu";

/**
 * Menu item actions (S1-P10-T003/T004; api.md LD-MENU-02/03, SA-MENU-06…13).
 *
 * The permission is checked first (security.md §3.3 rows 18–20) and the tenant comes only from the context. Prices
 * arrive as decimal strings and become `Prisma.Decimal` in the schema (ADR-010 §1) — the actions never see a float.
 * Availability has its own permission so a CASHIER cannot mark items sold out, and publication, ordering and the
 * modifier sets are separate actions rather than fields of an update.
 */

/** LD-MENU-02 — `menu:read`: filters, search and keyset pagination. */
export const listMenuItemsAction = action(async (input?: MenuItemListQueryInput) => {
  const ctx = await requireTenant("menu:read");
  const query = parseInput(menuItemListQuerySchema, input ?? {});
  return listItems(ctx, query);
});

/** LD-MENU-03 — `menu:read`: one item with variants, add-ons and kitchen section options (404 for a foreign id). */
export const getMenuItemAction = action(async (input: MenuItemRefInput) => {
  const ctx = await requireTenant("menu:read");
  const { itemId } = parseInput(menuItemRefSchema, input);
  return getItemDetail(ctx, itemId);
});

/** SA-MENU-06 — `menu:manage`; created unpublished. A category or section of another tenant is 404 (TI-005). */
export const createMenuItemAction = action(async (input: CreateMenuItemInput) => {
  const ctx = await requireTenant("menu:manage");
  const data = parseInput(createMenuItemSchema, input);
  return createItem(ctx, data);
});

/** SA-MENU-07 — `menu:manage`; a stale `expectedUpdatedAt` is 409 CONFLICT (TI-006). */
export const updateMenuItemAction = action(async (input: UpdateMenuItemInput) => {
  const ctx = await requireTenant("menu:manage");
  const data = parseInput(updateMenuItemSchema, input);
  return updateItem(ctx, data);
});

/** SA-MENU-08 — `menu:manage`; archive, unpublish and drop from today's and later daily menus (TI-007). */
export const archiveMenuItemAction = action(async (input: MenuItemRefInput) => {
  const ctx = await requireTenant("menu:manage");
  const { itemId } = parseInput(menuItemRefSchema, input);
  return archiveItem(ctx, itemId);
});

/** SA-MENU-09 — `menu:manage`; `orderedIds` must be exactly the category's active items. */
export const reorderMenuItemsAction = action(async (input: ReorderMenuItemsInput) => {
  const ctx = await requireTenant("menu:manage");
  const { categoryId, orderedIds } = parseInput(reorderMenuItemsSchema, input);
  return reorderItems(ctx, { categoryId, orderedIds });
});

/** SA-MENU-10 — `menu:manage`; publishing requires a published category and a sellable price. */
export const setMenuItemPublishedAction = action(async (input: SetMenuItemPublishedInput) => {
  const ctx = await requireTenant("menu:manage");
  const { itemId, published } = parseInput(setMenuItemPublishedSchema, input);
  return setItemPublished(ctx, itemId, published);
});

/** SA-MENU-11 — `menu:availability:update`: the sold-out toggle (TI-008). */
export const setMenuItemAvailabilityAction = action(async (input: SetMenuItemAvailabilityInput) => {
  const ctx = await requireTenant("menu:availability:update");
  const { itemId, available } = parseInput(setMenuItemAvailabilitySchema, input);
  return setItemAvailability(ctx, itemId, available);
});

/** SA-MENU-12 — `menu:manage`: replace-set of variants; omitted ones are archived, not deleted (TI-009). */
export const replaceMenuItemVariantsAction = action(async (input: ReplaceVariantsInput) => {
  const ctx = await requireTenant("menu:manage");
  const data = parseInput(replaceVariantsSchema, input);
  return replaceVariants(ctx, data);
});

/** SA-MENU-13 — `menu:manage`: replace-set of add-ons. */
export const replaceMenuItemAddonsAction = action(async (input: ReplaceAddonsInput) => {
  const ctx = await requireTenant("menu:manage");
  const data = parseInput(replaceAddonsSchema, input);
  return replaceAddons(ctx, data);
});
