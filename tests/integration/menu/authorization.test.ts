import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  archiveCategoryAction,
  createCategoryAction,
  listMenuCategoriesAction,
  reorderCategoriesAction,
  setCategoryPublishedAction,
  updateCategoryAction,
} from "@/app/restaurant/menu/categories-actions";
import {
  copyDailyMenuAction,
  deleteDraftDailyMenuAction,
  getDailyMenuAction,
  getDailyMenuCalendarAction,
  publishDailyMenuAction,
  saveDailyMenuDraftAction,
  unpublishDailyMenuAction,
} from "@/app/restaurant/menu/daily-actions";
import {
  archiveMenuItemAction,
  createMenuItemAction,
  getMenuItemAction,
  listMenuItemsAction,
  replaceMenuItemAddonsAction,
  replaceMenuItemVariantsAction,
  reorderMenuItemsAction,
  setMenuItemAvailabilityAction,
  setMenuItemPublishedAction,
  updateMenuItemAction,
} from "@/app/restaurant/menu/items-actions";
import type { ActionResult } from "@/lib/http/action";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf, type ControlFlow } from "../helpers/actors";
import { testDb } from "../setup/db";
import { dataOf, errorOf } from "./results";

/**
 * S1-P10-T008 — menu authorization (security.md §3.3 rows 18–22, RBAC matrix rows 18–22). TC-MENU-017.
 *
 * `menu:read` and `daily_menu:read` belong to every tenant role; `menu:manage`, `menu:availability:update` and
 * `daily_menu:manage` only to TENANT_ADMIN and MANAGER. Every guard runs before the input is parsed and before any
 * row is read, so a forbidden caller gets the same FORBIDDEN for a real id, a foreign id and a random one — a 403
 * never reveals whether something exists (SC-RBAC-01, SC-TEN-04).
 */
const db = testDb();

beforeAll(seedOnce, 120_000);

const READ_ONLY_ROLES = ["CASHIER", "KITCHEN", "WAITER"] as const;
const MANAGING_ROLES = ["TENANT_ADMIN", "MANAGER"] as const;
const ALL_ROLES = [...MANAGING_ROLES, ...READ_ONLY_ROLES] as const;

const categoryA = seeded("A", "category:starters");
const itemA = seeded("A", "item:paneer-tikka");
const draftA = seeded("A", "daily:tomorrow");
const publishedA = seeded("A", "daily:today");

type Probe = { endpoint: string; permission: string; invoke: () => Promise<ActionResult<unknown> | ControlFlow> };

/** Every managing endpoint, probed with ids that exist in Tenant A so only the permission can be the reason. */
const MANAGE_PROBES: Probe[] = [
  { endpoint: "createCategoryAction", permission: "menu:manage", invoke: () => invokeAction(createCategoryAction, { name: "Forbidden category" }) },
  { endpoint: "updateCategoryAction", permission: "menu:manage", invoke: () => invokeAction(updateCategoryAction, { categoryId: categoryA, name: "Forbidden rename" }) },
  { endpoint: "archiveCategoryAction", permission: "menu:manage", invoke: () => invokeAction(archiveCategoryAction, { categoryId: categoryA }) },
  { endpoint: "reorderCategoriesAction", permission: "menu:manage", invoke: () => invokeAction(reorderCategoriesAction, { orderedIds: [categoryA] }) },
  { endpoint: "setCategoryPublishedAction", permission: "menu:manage", invoke: () => invokeAction(setCategoryPublishedAction, { categoryId: categoryA, published: false }) },
  {
    endpoint: "createMenuItemAction",
    permission: "menu:manage",
    invoke: () => invokeAction(createMenuItemAction, { categoryId: categoryA, name: "Forbidden dish", basePrice: "1.00", taxRate: "5" }),
  },
  {
    endpoint: "updateMenuItemAction",
    permission: "menu:manage",
    invoke: () => invokeAction(updateMenuItemAction, { itemId: itemA, expectedUpdatedAt: "2026-09-15T08:30:00.000Z", name: "Forbidden rename" }),
  },
  { endpoint: "archiveMenuItemAction", permission: "menu:manage", invoke: () => invokeAction(archiveMenuItemAction, { itemId: itemA }) },
  { endpoint: "reorderMenuItemsAction", permission: "menu:manage", invoke: () => invokeAction(reorderMenuItemsAction, { categoryId: categoryA, orderedIds: [itemA] }) },
  { endpoint: "setMenuItemPublishedAction", permission: "menu:manage", invoke: () => invokeAction(setMenuItemPublishedAction, { itemId: itemA, published: false }) },
  {
    endpoint: "replaceMenuItemVariantsAction",
    permission: "menu:manage",
    invoke: () => invokeAction(replaceMenuItemVariantsAction, { itemId: itemA, variants: [{ name: "Forbidden", price: "1" }] }),
  },
  {
    endpoint: "replaceMenuItemAddonsAction",
    permission: "menu:manage",
    invoke: () => invokeAction(replaceMenuItemAddonsAction, { itemId: itemA, addons: [{ name: "Forbidden", price: "1" }] }),
  },
  { endpoint: "setMenuItemAvailabilityAction", permission: "menu:availability:update", invoke: () => invokeAction(setMenuItemAvailabilityAction, { itemId: itemA, available: false }) },
  {
    endpoint: "saveDailyMenuDraftAction",
    permission: "daily_menu:manage",
    invoke: () => invokeAction(saveDailyMenuDraftAction, { businessDate: "2027-01-05", itemIds: [itemA] }),
  },
  { endpoint: "publishDailyMenuAction", permission: "daily_menu:manage", invoke: () => invokeAction(publishDailyMenuAction, { dailyMenuId: draftA }) },
  { endpoint: "unpublishDailyMenuAction", permission: "daily_menu:manage", invoke: () => invokeAction(unpublishDailyMenuAction, { dailyMenuId: publishedA }) },
  {
    endpoint: "copyDailyMenuAction",
    permission: "daily_menu:manage",
    invoke: () => invokeAction(copyDailyMenuAction, { fromBusinessDate: "2026-09-15", toBusinessDate: "2027-01-06" }),
  },
  { endpoint: "deleteDraftDailyMenuAction", permission: "daily_menu:manage", invoke: () => invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: draftA }) },
];

/** A fingerprint of everything these probes could have changed. */
async function menuSnapshot() {
  const tenantId = tenantIdOf("A");
  return {
    categories: await db.menuCategory.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    items: await db.menuItem.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    variants: await db.menuItemVariant.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    addons: await db.menuItemAddon.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    dailyMenus: await db.dailyMenu.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    dailyMenuItems: await db.dailyMenuItem.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    audits: await db.auditLog.count({ where: { tenantId } }),
  };
}

describe("TC-MENU-017 menu authorization", () => {
  it("CASHIER, KITCHEN and WAITER are FORBIDDEN on every managing endpoint, and nothing changes", async () => {
    const before = await menuSnapshot();

    for (const role of READ_ONLY_ROLES) {
      await asSeedUser("A", role);
      for (const probe of MANAGE_PROBES) {
        const error = errorOf(await probe.invoke());
        expect(error.code, `${role} → ${probe.endpoint} (${probe.permission})`).toBe("FORBIDDEN");
      }
    }

    expect(await menuSnapshot()).toEqual(before);
  });

  it("the guard runs before the lookup: a random, a foreign and a real id all answer FORBIDDEN alike", async () => {
    await asSeedUser("A", "WAITER");
    const answers = await Promise.all(
      [itemA, seeded("B", "item:clam-chowder"), randomUUID()].map(async (id) => errorOf(await invokeAction(archiveMenuItemAction, { itemId: id }))),
    );
    expect(answers.map((a) => a.code)).toEqual(["FORBIDDEN", "FORBIDDEN", "FORBIDDEN"]);
    expect(new Set(answers.map((a) => a.message)).size).toBe(1);

    // Even a structurally invalid id is FORBIDDEN, never a validation hint.
    expect(errorOf(await invokeAction(archiveMenuItemAction, { itemId: "not-a-uuid" })).code).toBe("FORBIDDEN");
  });

  it("every tenant role may read categories, items, item detail, the daily menu and the calendar", async () => {
    for (const role of ALL_ROLES) {
      await asSeedUser("A", role);
      expect(dataOf(await invokeAction(listMenuCategoriesAction)).items.length).toBeGreaterThan(0);
      expect(dataOf(await invokeAction(listMenuItemsAction)).items.length).toBeGreaterThan(0);
      expect(dataOf(await invokeAction(getMenuItemAction, { itemId: itemA })).item.id).toBe(itemA);
      expect(dataOf(await invokeAction(getDailyMenuAction, { businessDate: "2026-09-15" })).dailyMenu?.id).toBe(publishedA);
      expect(dataOf(await invokeAction(getDailyMenuCalendarAction, { from: "2026-09-01", to: "2026-09-30" })).items.length).toBeGreaterThan(0);
    }
  });

  it("TENANT_ADMIN and MANAGER pass every managing guard and reach the service (NOT_FOUND, not FORBIDDEN)", async () => {
    // Side-effect-free probes: an id no tenant owns, so an allowed role can only get NOT_FOUND from the service.
    const allowedProbes: Array<Omit<Probe, "endpoint">> = [
      { permission: "menu:manage", invoke: () => invokeAction(archiveCategoryAction, { categoryId: randomUUID() }) },
      { permission: "menu:manage", invoke: () => invokeAction(archiveMenuItemAction, { itemId: randomUUID() }) },
      { permission: "menu:manage", invoke: () => invokeAction(replaceMenuItemVariantsAction, { itemId: randomUUID(), variants: [] }) },
      { permission: "menu:manage", invoke: () => invokeAction(replaceMenuItemAddonsAction, { itemId: randomUUID(), addons: [] }) },
      { permission: "menu:availability:update", invoke: () => invokeAction(setMenuItemAvailabilityAction, { itemId: randomUUID(), available: false }) },
      { permission: "daily_menu:manage", invoke: () => invokeAction(publishDailyMenuAction, { dailyMenuId: randomUUID() }) },
      { permission: "daily_menu:manage", invoke: () => invokeAction(unpublishDailyMenuAction, { dailyMenuId: randomUUID() }) },
      { permission: "daily_menu:manage", invoke: () => invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: randomUUID() }) },
    ];

    const before = await menuSnapshot();
    for (const role of MANAGING_ROLES) {
      await asSeedUser("A", role);
      for (const probe of allowedProbes) {
        expect(errorOf(await probe.invoke()).code, `${role} → ${probe.permission}`).toBe("NOT_FOUND");
      }
    }
    expect(await menuSnapshot()).toEqual(before);
  });
});
