/**
 * Menu and daily-menu input schemas (S1-P10, S1-P11; api.md §8–§9; lengths and ranges from data-model.md E07–E12).
 *
 * Every schema is a `strictObject`, so unknown keys — `tenantId`, `isPublished` on an item update, a price on an
 * availability toggle — are rejected with VALIDATION_ERROR instead of being dropped (SC-VAL-01, SC-TEN-01).
 * Money arrives as a decimal string and leaves the schema as `Prisma.Decimal` (ADR-010 §1). Image links must be
 * allowlisted `https:` URLs (Q-009 A, SC-VAL-04, `lib/validation/url.ts`); icons come from `MENU_ICON_KEYS`.
 *
 * Patch semantics for optional fields on updates: missing → unchanged (`undefined`); `null` or blank → cleared (`null`).
 */
import { DietaryType } from "@prisma/client";
import { z } from "zod";
import { zodMoney, zodTaxRate } from "@/lib/money";
import { isMenuIconKey } from "@/lib/ui/icons";
import { boundedText, businessDateParam, optionalText, strictObject, uuidParam } from "./core";
import { imageUrlOrBlank } from "./url";

// ─── Shared field builders ───

function patchText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .nullish()
    .transform((value) => (value === undefined ? undefined : value ? value : null));
}

/** Distinct ids (a list order is a set: each id once). */
function idList(max: number, label: string) {
  return z
    .array(uuidParam)
    .min(1, `List at least one ${label}`)
    .max(max, `At most ${max} ${label}s`)
    .refine((ids) => new Set(ids).size === ids.length, "Each id can appear once");
}

/** Query-string friendly boolean: `true`/`false` or the strings "true"/"false". */
const booleanParam = z.union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")]);

/** Query-string friendly optional id: blank means "no filter". */
const optionalIdParam = z
  .union([uuidParam, z.literal("")])
  .optional()
  .transform((value) => value || undefined);

const iconKeyValue = z
  .string()
  .trim()
  .refine((value) => value === "" || isMenuIconKey(value), "Choose an icon from the list");
const iconKeyCreate = iconKeyValue.nullish().transform((value) => (value ? value : null));
const iconKeyPatch = iconKeyValue.nullish().transform((value) => (value === undefined ? undefined : value ? value : null));

const imageUrlValue = imageUrlOrBlank("Image link");
const imageUrlCreate = imageUrlValue.nullish().transform((value) => value ?? null);
const imageUrlPatch = imageUrlValue.nullish().transform((value) => (value === undefined ? undefined : (value ?? null)));

const prepTime = z.number().int("Use whole minutes").min(0, "Use 0 or more minutes").max(240, "Use at most 240 minutes");
const dietary = z.nativeEnum(DietaryType, { errorMap: () => ({ message: "Choose veg, non-veg or egg" }) });

/** An ISO-8601 instant as returned in DTOs (`updatedAt`), used for optimistic concurrency. */
const instant = z
  .string()
  .datetime({ offset: true, message: "Reload the page and try again" })
  .transform((value) => new Date(value));

const categoryName = boundedText(80, { min: 2, label: "Category name" });
const itemName = boundedText(120, { min: 2, label: "Item name" });

// ─── Categories (E07; LD-MENU-01, SA-MENU-01…05) ───

export const categoryListQuerySchema = strictObject({
  /** `true` lists archived categories only; missing/false lists the active ones (TC-MENU-001). */
  archived: booleanParam.optional(),
});
export type CategoryListQueryInput = z.input<typeof categoryListQuerySchema>;

export const createCategorySchema = strictObject({
  name: categoryName,
  description: optionalText(500, "Description"),
  iconKey: iconKeyCreate,
});
export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type CreateCategoryData = z.output<typeof createCategorySchema>;

export const updateCategorySchema = strictObject({
  categoryId: uuidParam,
  name: categoryName.optional(),
  description: patchText(500, "Description"),
  iconKey: iconKeyPatch,
});
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;
export type UpdateCategoryData = z.output<typeof updateCategorySchema>;

/** SA-MENU-03 archive. */
export const categoryRefSchema = strictObject({ categoryId: uuidParam });
export type CategoryRefInput = z.input<typeof categoryRefSchema>;

/** SA-MENU-04: exactly the tenant's non-archived categories, in the new order. */
export const reorderCategoriesSchema = strictObject({ orderedIds: idList(500, "category") });
export type ReorderCategoriesInput = z.input<typeof reorderCategoriesSchema>;

export const setCategoryPublishedSchema = strictObject({ categoryId: uuidParam, published: z.boolean() });
export type SetCategoryPublishedInput = z.input<typeof setCategoryPublishedSchema>;

// ─── Items (E08; LD-MENU-02/03, SA-MENU-06…11) ───

export const MENU_ITEM_PAGE_SIZE = 25;

export const menuItemListQuerySchema = strictObject({
  categoryId: optionalIdParam,
  published: booleanParam.optional(),
  available: booleanParam.optional(),
  q: z
    .string()
    .trim()
    .max(80, "Search must be at most 80 characters")
    .optional()
    .transform((value) => value || undefined),
  /** `true` lists archived items only; missing/false lists the active ones. */
  archived: booleanParam.optional(),
  cursor: z
    .string()
    .max(2000, "Invalid cursor")
    .optional()
    .transform((value) => value || undefined),
  limit: z
    .union([z.number(), z.string().regex(/^\d{1,3}$/, "Use a whole number").transform(Number)])
    .pipe(z.number().int("Use a whole number").min(1, "Use at least 1").max(100, "Use at most 100"))
    .optional(),
});
export type MenuItemListQueryInput = z.input<typeof menuItemListQuerySchema>;
export type MenuItemListQueryData = z.output<typeof menuItemListQuerySchema>;

/** LD-MENU-03 detail, SA-MENU-08 archive. */
export const menuItemRefSchema = strictObject({ itemId: uuidParam });
export type MenuItemRefInput = z.input<typeof menuItemRefSchema>;

/** SA-MENU-06: created unpublished and available; variants and add-ons have their own actions (SA-MENU-12/13). */
export const createMenuItemSchema = strictObject({
  categoryId: uuidParam,
  kitchenSectionId: uuidParam.nullish().transform((value) => value ?? null),
  name: itemName,
  description: optionalText(1000, "Description"),
  imageUrl: imageUrlCreate,
  iconKey: iconKeyCreate,
  basePrice: zodMoney(),
  taxRate: zodTaxRate,
  dietaryType: dietary.nullish().transform((value) => value ?? null),
  prepTimeMinutes: prepTime.nullish().transform((value) => value ?? null),
});
export type CreateMenuItemInput = z.input<typeof createMenuItemSchema>;
export type CreateMenuItemData = z.output<typeof createMenuItemSchema>;

/**
 * SA-MENU-07: `expectedUpdatedAt` is the `updatedAt` the editor loaded; a newer row is 409 CONFLICT (TC-MENU-009).
 * Publication and availability have their own actions (and, for availability, their own permission).
 */
export const updateMenuItemSchema = strictObject({
  itemId: uuidParam,
  expectedUpdatedAt: instant,
  categoryId: uuidParam.optional(),
  kitchenSectionId: uuidParam.nullish(),
  name: itemName.optional(),
  description: patchText(1000, "Description"),
  imageUrl: imageUrlPatch,
  iconKey: iconKeyPatch,
  basePrice: zodMoney().optional(),
  taxRate: zodTaxRate.optional(),
  dietaryType: dietary.nullish(),
  prepTimeMinutes: prepTime.nullish(),
});
export type UpdateMenuItemInput = z.input<typeof updateMenuItemSchema>;
export type UpdateMenuItemData = z.output<typeof updateMenuItemSchema>;

/** SA-MENU-09: exactly the category's non-archived items, in the new order. */
export const reorderMenuItemsSchema = strictObject({ categoryId: uuidParam, orderedIds: idList(1000, "item") });
export type ReorderMenuItemsInput = z.input<typeof reorderMenuItemsSchema>;

export const setMenuItemPublishedSchema = strictObject({ itemId: uuidParam, published: z.boolean() });
export type SetMenuItemPublishedInput = z.input<typeof setMenuItemPublishedSchema>;

export const setMenuItemAvailabilitySchema = strictObject({ itemId: uuidParam, available: z.boolean() });
export type SetMenuItemAvailabilityInput = z.input<typeof setMenuItemAvailabilitySchema>;

// ─── Variants and add-ons (E09, E10; SA-MENU-12/13) ───

/** Names unique per item, case-insensitively (mirrors the partial unique indexes); listed ids distinct. */
function uniqueOptions(label: string) {
  return (options: ReadonlyArray<{ id?: string; name: string }>, ctx: z.RefinementCtx) => {
    const names = new Map<string, number>();
    const ids = new Set<string>();
    options.forEach((option, index) => {
      const key = option.name.toLowerCase();
      if (names.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "name"], message: `${label} names must be unique` });
      else names.set(key, index);
      if (option.id !== undefined) {
        if (ids.has(option.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "id"], message: `Each ${label.toLowerCase()} can be listed once` });
        ids.add(option.id);
      }
    });
  };
}

const variantInput = strictObject({
  /** Present for an existing variant of this item (else 404); absent for a new one. */
  id: uuidParam.optional(),
  name: boundedText(60, { label: "Variant name" }),
  price: zodMoney(),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

const addonInput = strictObject({
  id: uuidParam.optional(),
  name: boundedText(60, { label: "Add-on name" }),
  price: zodMoney(),
  isAvailable: z.boolean().default(true),
});

/** Replace-set: listed variants are upserted in this order, omitted ones archived (orders keep referencing them). */
export const replaceVariantsSchema = strictObject({
  itemId: uuidParam,
  variants: z
    .array(variantInput)
    .max(20, "At most 20 variants")
    .superRefine(uniqueOptions("Variant"))
    .refine((variants) => variants.filter((variant) => variant.isDefault).length <= 1, "Only one variant can be the default"),
});
export type ReplaceVariantsInput = z.input<typeof replaceVariantsSchema>;
export type ReplaceVariantsData = z.output<typeof replaceVariantsSchema>;

export const replaceAddonsSchema = strictObject({
  itemId: uuidParam,
  addons: z.array(addonInput).max(30, "At most 30 add-ons").superRefine(uniqueOptions("Add-on")),
});
export type ReplaceAddonsInput = z.input<typeof replaceAddonsSchema>;
export type ReplaceAddonsData = z.output<typeof replaceAddonsSchema>;

// ─── Daily menu (E11, E12; LD-DMENU-01/02, SA-DMENU-01…05) ───

export const DAILY_MENU_CALENDAR_MAX_DAYS = 62;

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) => (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS;

/** LD-DMENU-01: missing or blank date means today in the restaurant timezone. */
export const dailyMenuEditorQuerySchema = strictObject({
  businessDate: z
    .union([businessDateParam, z.literal("")])
    .optional()
    .transform((value) => value || undefined),
});
export type DailyMenuEditorQueryInput = z.input<typeof dailyMenuEditorQuerySchema>;

/** LD-DMENU-02: inclusive range of at most 62 business dates. */
export const dailyMenuCalendarQuerySchema = strictObject({ from: businessDateParam, to: businessDateParam }).superRefine((range, ctx) => {
  const days = daysBetween(range.from, range.to);
  if (days < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "The end date must not be before the start date" });
  else if (days + 1 > DAILY_MENU_CALENDAR_MAX_DAYS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: `Choose at most ${DAILY_MENU_CALENDAR_MAX_DAYS} days` });
  }
});
export type DailyMenuCalendarQueryInput = z.input<typeof dailyMenuCalendarQuerySchema>;

/** SA-DMENU-01: upsert by (tenant, business date); `itemIds` is the ordered item set. */
export const saveDailyMenuDraftSchema = strictObject({
  businessDate: businessDateParam,
  title: patchText(80, "Title"),
  note: patchText(280, "Note"),
  itemIds: z
    .array(uuidParam)
    .max(100, "At most 100 items")
    .refine((ids) => new Set(ids).size === ids.length, "Each item can be added once"),
});
export type SaveDailyMenuDraftInput = z.input<typeof saveDailyMenuDraftSchema>;
export type SaveDailyMenuDraftData = z.output<typeof saveDailyMenuDraftSchema>;

/** SA-DMENU-02/03/05. */
export const dailyMenuRefSchema = strictObject({ dailyMenuId: uuidParam });
export type DailyMenuRefInput = z.input<typeof dailyMenuRefSchema>;

/** SA-DMENU-04. */
export const copyDailyMenuSchema = strictObject({ fromBusinessDate: businessDateParam, toBusinessDate: businessDateParam }).refine(
  (input) => input.fromBusinessDate !== input.toBusinessDate,
  { path: ["toBusinessDate"], message: "Choose a different date to copy to" },
);
export type CopyDailyMenuInput = z.input<typeof copyDailyMenuSchema>;
export type CopyDailyMenuData = z.output<typeof copyDailyMenuSchema>;
