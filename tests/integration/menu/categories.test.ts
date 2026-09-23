import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import MenuLayout from "@/app/restaurant/menu/layout";
import {
  archiveCategoryAction,
  createCategoryAction,
  listMenuCategoriesAction,
  reorderCategoriesAction,
  setCategoryPublishedAction,
  updateCategoryAction,
} from "@/app/restaurant/menu/categories-actions";
import { archiveMenuItemAction, createMenuItemAction } from "@/app/restaurant/menu/items-actions";
import { getPublicRestaurant } from "@/lib/data/public-restaurant";
import { actorState } from "../helpers/actor-state";
import { asAnonymous, asSeedUser, invokeAction, invokeLoader, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { testDb } from "../setup/db";
import { dataOf, errorOf, expectSameNotFound } from "./results";

/**
 * S1-P10-T002 — category services and actions (api.md LD-MENU-01, SA-MENU-01…05).
 * TC-MENU-001, TC-MENU-004, TC-MENU-005, TC-MENU-006, TC-MENU-007; TI-003, TI-004.
 */
const db = testDb();

beforeAll(seedOnce, 120_000);

const categoryA = (key: string) => seeded("A", `category:${key}`);

describe("LD-MENU-01 listMenuCategoriesAction (menu:read)", () => {
  it("the /restaurant/menu route guard lets every tenant role in and redirects anonymous visitors", async () => {
    for (const role of ["TENANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      expect(await invokeLoader(MenuLayout, { children: "menu" })).toBe("menu");
    }
    asAnonymous();
    expect(await invokeLoader(MenuLayout, { children: "menu" })).toEqual({ redirect: "/sign-in" });
  });

  it("TC-MENU-001 / TI-001 lists exactly Tenant A's active categories in sort order, with item counts", async () => {
    await asSeedUser("A", "WAITER");
    const { items } = dataOf(await invokeAction(listMenuCategoriesAction));

    expect(items.map((c) => c.name)).toEqual(["Starters", "Mains", "Beverages"]);
    expect(items.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
    expect(items.map((c) => c.itemCount)).toEqual([3, 2, 2]);
    expect(items.every((c) => c.archivedAt === null)).toBe(true);

    const tenantB = await db.menuCategory.findMany({ where: { tenantId: tenantIdOf("B") }, select: { id: true } });
    const seen = new Set(items.map((c) => c.id));
    expect(tenantB.some((c) => seen.has(c.id))).toBe(false);
  });

  it("TC-MENU-001 archived categories are listed only when asked for", async () => {
    await asSeedUser("A", "MANAGER");
    const created = dataOf(await invokeAction(createCategoryAction, { name: "Seasonal specials" }));
    dataOf(await invokeAction(archiveCategoryAction, { categoryId: created.id }));

    const active = dataOf(await invokeAction(listMenuCategoriesAction));
    expect(active.items.some((c) => c.id === created.id)).toBe(false);

    const archived = dataOf(await invokeAction(listMenuCategoriesAction, { archived: true }));
    expect(archived.items.map((c) => c.id)).toContain(created.id);
    expect(archived.items.every((c) => c.archivedAt !== null)).toBe(true);
  });
});

describe("SA-MENU-01 createCategoryAction", () => {
  it("TC-MENU-004 appends the category after the last one and commits its audit row in the same transaction", async () => {
    await asSeedUser("A", "MANAGER");
    const before = dataOf(await invokeAction(listMenuCategoriesAction)).items;
    const created = dataOf(await invokeAction(createCategoryAction, { name: "  Desserts  ", description: "Sweet things" }));

    expect(created).toMatchObject({ name: "Desserts", description: "Sweet things", isPublished: true, archivedAt: null, itemCount: 0 });
    expect(created.sortOrder).toBe(Math.max(...before.map((c) => c.sortOrder)) + 1);
    expect((await db.menuCategory.findUniqueOrThrow({ where: { id: created.id } })).tenantId).toBe(tenantIdOf("A"));

    const audits = await db.auditLog.findMany({ where: { action: "menu_category.created", resourceId: created.id } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      tenantId: tenantIdOf("A"),
      actorType: "USER",
      actorUserId: seeded("A", "user:MANAGER"),
      actorRole: "MANAGER",
      resourceType: "menu_category",
      requestId: actorState.requestId,
    });
    expect(audits[0].afterState).toMatchObject({ name: "Desserts", isPublished: true });
  });

  it("TC-MENU-004 rejects a duplicate active name case-insensitively with 422 NAME_TAKEN and writes nothing", async () => {
    await asSeedUser("A", "MANAGER");
    const auditsBefore = await db.auditLog.count({ where: { tenantId: tenantIdOf("A"), action: "menu_category.created" } });

    for (const name of ["starters", "  STARTERS  ", "Starters"]) {
      expect(errorOf(await invokeAction(createCategoryAction, { name })).code).toBe("NAME_TAKEN");
    }
    expect(await db.menuCategory.count({ where: { tenantId: tenantIdOf("A"), name: { equals: "starters", mode: "insensitive" } } })).toBe(1);
    expect(await db.auditLog.count({ where: { tenantId: tenantIdOf("A"), action: "menu_category.created" } })).toBe(auditsBefore);
  });

  it("TC-MENU-004 names are independent per tenant, and an archived name can be reused", async () => {
    await asSeedUser("A", "MANAGER");
    dataOf(await invokeAction(createCategoryAction, { name: "Chef Specials" }));
    await asSeedUser("B", "MANAGER");
    const inB = dataOf(await invokeAction(createCategoryAction, { name: "chef specials" }));
    expect((await db.menuCategory.findUniqueOrThrow({ where: { id: inB.id } })).tenantId).toBe(tenantIdOf("B"));

    await asSeedUser("A", "MANAGER");
    const retired = dataOf(await invokeAction(createCategoryAction, { name: "Monsoon menu" }));
    dataOf(await invokeAction(archiveCategoryAction, { categoryId: retired.id }));
    const reused = dataOf(await invokeAction(createCategoryAction, { name: "MONSOON MENU" }));
    expect(reused.id).not.toBe(retired.id);
  });

  it("TC-MENU-004 validates lengths and rejects unknown keys, including tenantId and sortOrder (ADV-001)", async () => {
    await asSeedUser("A", "MANAGER");
    for (const input of [{ name: "X" }, { name: "x".repeat(81) }, { name: "Valid", description: "d".repeat(501) }, { name: "Valid", iconKey: "not-an-icon" }]) {
      expect(errorOf(await invokeAction(createCategoryAction, input)).code).toBe("VALIDATION_ERROR");
    }
    for (const extra of [{ tenantId: tenantIdOf("B") }, { sortOrder: 0 }, { isPublished: false }]) {
      const error = errorOf(await invokeAction(createCategoryAction, { name: "Injected", ...extra } as never));
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.fieldErrors?._?.[0]).toContain("Unknown field");
    }
    expect(await db.menuCategory.count({ where: { name: { in: ["Valid", "Injected"] } } })).toBe(0);
  });
});

describe("SA-MENU-02 / SA-MENU-03 update and archive", () => {
  it("TC-MENU-004 updates only the changed fields and audits them before/after", async () => {
    await asSeedUser("A", "MANAGER");
    const created = dataOf(await invokeAction(createCategoryAction, { name: "Breads", description: "From the tandoor" }));

    const updated = dataOf(await invokeAction(updateCategoryAction, { categoryId: created.id, name: "Breads & Rolls", description: "" }));
    expect(updated).toMatchObject({ name: "Breads & Rolls", description: null });

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "menu_category.updated", resourceId: created.id } });
    expect(audit.beforeState).toEqual({ name: "Breads", description: "From the tandoor" });
    expect(audit.afterState).toEqual({ name: "Breads & Rolls", description: null });

    // Re-sending the same values changes nothing and writes no second audit row.
    dataOf(await invokeAction(updateCategoryAction, { categoryId: created.id, name: "Breads & Rolls" }));
    expect(await db.auditLog.count({ where: { action: "menu_category.updated", resourceId: created.id } })).toBe(1);
  });

  it("TC-MENU-004 renaming onto another active name is 422 NAME_TAKEN and changes nothing", async () => {
    await asSeedUser("A", "MANAGER");
    const mains = categoryA("mains");
    expect(errorOf(await invokeAction(updateCategoryAction, { categoryId: mains, name: "beverages" })).code).toBe("NAME_TAKEN");
    expect((await db.menuCategory.findUniqueOrThrow({ where: { id: mains } })).name).toBe("Mains");
  });

  it("TI-003 updating a Tenant B category id is NOT_FOUND, identical to a random UUID; B is unchanged", async () => {
    const target = seeded("B", "category:starters");
    const before = await db.menuCategory.findUniqueOrThrow({ where: { id: target } });
    const auditsBefore = await db.auditLog.count({ where: { resourceId: target } });

    await asSeedUser("A", "MANAGER");
    expectSameNotFound(
      await invokeAction(updateCategoryAction, { categoryId: target, name: "Hijacked" }),
      await invokeAction(updateCategoryAction, { categoryId: randomUUID(), name: "Hijacked" }),
    );
    expect(await db.menuCategory.findUniqueOrThrow({ where: { id: target } })).toEqual(before);
    expect(await db.auditLog.count({ where: { resourceId: target } })).toBe(auditsBefore);
  });

  it("TC-MENU-005 archive is 409 CATEGORY_NOT_EMPTY while items are active, and succeeds once they are archived", async () => {
    await asSeedUser("A", "MANAGER");
    const category = dataOf(await invokeAction(createCategoryAction, { name: "Tasting menu" }));
    const item = dataOf(await invokeAction(createMenuItemAction, { categoryId: category.id, name: "Seven courses", basePrice: "2500.00", taxRate: "5" }));

    const blocked = errorOf(await invokeAction(archiveCategoryAction, { categoryId: category.id }));
    expect(blocked.code).toBe("CATEGORY_NOT_EMPTY");
    expect((await db.menuCategory.findUniqueOrThrow({ where: { id: category.id } })).archivedAt).toBeNull();
    expect(await db.auditLog.count({ where: { action: "menu_category.archived", resourceId: category.id } })).toBe(0);

    dataOf(await invokeAction(archiveMenuItemAction, { itemId: item.id }));
    const archived = dataOf(await invokeAction(archiveCategoryAction, { categoryId: category.id }));
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.isPublished).toBe(false);
    expect(await db.auditLog.count({ where: { action: "menu_category.archived", resourceId: category.id, tenantId: tenantIdOf("A") } })).toBe(1);

    // An archived category is gone for every later write: a second archive is NOT_FOUND, not a second 409.
    expect(errorOf(await invokeAction(archiveCategoryAction, { categoryId: category.id })).code).toBe("NOT_FOUND");
  });

  it("TI-004 archiving a Tenant B category id is NOT_FOUND, identical to a random UUID; B stays active", async () => {
    const target = seeded("B", "category:mains");
    await asSeedUser("A", "TENANT_ADMIN");
    expectSameNotFound(
      await invokeAction(archiveCategoryAction, { categoryId: target }),
      await invokeAction(archiveCategoryAction, { categoryId: randomUUID() }),
    );
    expect((await db.menuCategory.findUniqueOrThrow({ where: { id: target } })).archivedAt).toBeNull();
  });
});

describe("SA-MENU-04 reorderCategoriesAction", () => {
  it("TC-MENU-006 reorders the whole active set and audits the order before/after", async () => {
    await asSeedUser("A", "MANAGER");
    const before = dataOf(await invokeAction(listMenuCategoriesAction)).items.map((c) => c.id);
    const reversed = [...before].reverse();

    const { items } = dataOf(await invokeAction(reorderCategoriesAction, { orderedIds: reversed }));
    expect(items.map((c) => c.id)).toEqual(reversed);
    expect(items.map((c) => c.sortOrder)).toEqual(reversed.map((_, index) => index));

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "menu_category.reordered", tenantId: tenantIdOf("A") }, orderBy: { createdAt: "desc" } });
    expect(audit.beforeState).toEqual({ orderedIds: before });
    expect(audit.afterState).toEqual({ orderedIds: reversed });

    dataOf(await invokeAction(reorderCategoriesAction, { orderedIds: before }));
    expect(dataOf(await invokeAction(listMenuCategoriesAction)).items.map((c) => c.id)).toEqual(before);
  });

  it("TC-MENU-006 / ADV-003 a Tenant B id is NOT_FOUND, a stale partial list is 422, and neither reorders anything", async () => {
    await asSeedUser("A", "MANAGER");
    const current = dataOf(await invokeAction(listMenuCategoriesAction)).items.map((c) => c.id);

    expectSameNotFound(
      await invokeAction(reorderCategoriesAction, { orderedIds: [...current.slice(1), seeded("B", "category:starters")] }),
      await invokeAction(reorderCategoriesAction, { orderedIds: [...current.slice(1), randomUUID()] }),
    );
    expect(errorOf(await invokeAction(reorderCategoriesAction, { orderedIds: current.slice(1) })).code).toBe("VALIDATION_ERROR");
    expect(errorOf(await invokeAction(reorderCategoriesAction, { orderedIds: [current[0], current[0]] })).code).toBe("VALIDATION_ERROR");

    expect(dataOf(await invokeAction(listMenuCategoriesAction)).items.map((c) => c.id)).toEqual(current);
  });
});

describe("SA-MENU-05 setCategoryPublishedAction", () => {
  it("TC-MENU-007 unpublishing hides the category (and its items) from the public site; publishing brings it back", async () => {
    const beverages = categoryA("beverages");
    const namesOnSite = async () => (await getPublicRestaurant("spice-route")).categories.map((c) => c.name);

    expect(await namesOnSite()).toContain("Beverages");

    await asSeedUser("A", "MANAGER");
    const hidden = dataOf(await invokeAction(setCategoryPublishedAction, { categoryId: beverages, published: false }));
    expect(hidden.isPublished).toBe(false);
    expect(await namesOnSite()).not.toContain("Beverages");
    const unpublished = await db.auditLog.findFirstOrThrow({ where: { action: "menu_category.unpublished", resourceId: beverages } });
    expect(unpublished).toMatchObject({ beforeState: { isPublished: true }, afterState: { isPublished: false } });

    // Idempotent: repeating the same state writes no second audit row.
    dataOf(await invokeAction(setCategoryPublishedAction, { categoryId: beverages, published: false }));
    expect(await db.auditLog.count({ where: { action: "menu_category.unpublished", resourceId: beverages } })).toBe(1);

    dataOf(await invokeAction(setCategoryPublishedAction, { categoryId: beverages, published: true }));
    expect(await namesOnSite()).toContain("Beverages");
    expect(await db.auditLog.count({ where: { action: "menu_category.published", resourceId: beverages } })).toBe(1);
  });
});
