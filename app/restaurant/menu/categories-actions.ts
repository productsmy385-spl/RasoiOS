"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { archiveCategory, createCategory, listCategories, reorderCategories, setCategoryPublished, updateCategory } from "@/lib/services/menu-categories";
import { parseInput } from "@/lib/validation/core";
import {
  categoryListQuerySchema,
  categoryRefSchema,
  createCategorySchema,
  reorderCategoriesSchema,
  setCategoryPublishedSchema,
  updateCategorySchema,
  type CategoryListQueryInput,
  type CategoryRefInput,
  type CreateCategoryInput,
  type ReorderCategoriesInput,
  type SetCategoryPublishedInput,
  type UpdateCategoryInput,
} from "@/lib/validation/menu";

/**
 * Menu category actions (S1-P10-T002; api.md LD-MENU-01, SA-MENU-01…05).
 *
 * Each action checks its permission before it reads input or touches a row (security.md §3.3 rows 18–19), so a role
 * without `menu:manage` gets FORBIDDEN without learning whether the id exists. The tenant comes only from the
 * server-resolved context, and the strict schemas reject a `tenantId` or any other unknown key with 422.
 */

/** LD-MENU-01 — `menu:read` (every tenant role). `archived: true` lists the archived categories instead. */
export const listMenuCategoriesAction = action(async (input?: CategoryListQueryInput) => {
  const ctx = await requireTenant("menu:read");
  const query = parseInput(categoryListQuerySchema, input ?? {});
  return listCategories(ctx, query);
});

/** SA-MENU-01 — `menu:manage`; appended last. A duplicate active name is 422 NAME_TAKEN. */
export const createCategoryAction = action(async (input: CreateCategoryInput) => {
  const ctx = await requireTenant("menu:manage");
  const data = parseInput(createCategorySchema, input);
  return createCategory(ctx, data);
});

/** SA-MENU-02 — `menu:manage`; another tenant's id is 404, exactly like an unknown one (TI-003). */
export const updateCategoryAction = action(async (input: UpdateCategoryInput) => {
  const ctx = await requireTenant("menu:manage");
  const data = parseInput(updateCategorySchema, input);
  return updateCategory(ctx, data);
});

/** SA-MENU-03 — `menu:manage`; 409 CATEGORY_NOT_EMPTY while the category still holds active items (TI-004). */
export const archiveCategoryAction = action(async (input: CategoryRefInput) => {
  const ctx = await requireTenant("menu:manage");
  const { categoryId } = parseInput(categoryRefSchema, input);
  return archiveCategory(ctx, categoryId);
});

/** SA-MENU-04 — `menu:manage`; `orderedIds` must be exactly the tenant's active categories. */
export const reorderCategoriesAction = action(async (input: ReorderCategoriesInput) => {
  const ctx = await requireTenant("menu:manage");
  const { orderedIds } = parseInput(reorderCategoriesSchema, input);
  return reorderCategories(ctx, orderedIds);
});

/** SA-MENU-05 — `menu:manage`; toggles public visibility and revalidates `/r/{slug}`. */
export const setCategoryPublishedAction = action(async (input: SetCategoryPublishedInput) => {
  const ctx = await requireTenant("menu:manage");
  const { categoryId, published } = parseInput(setCategoryPublishedSchema, input);
  return setCategoryPublished(ctx, categoryId, published);
});
