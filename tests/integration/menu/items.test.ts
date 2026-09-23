import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { saveDailyMenuDraftAction } from "@/app/restaurant/menu/daily-actions";
import {
  archiveMenuItemAction,
  createMenuItemAction,
  getMenuItemAction,
  listMenuItemsAction,
  reorderMenuItemsAction,
  setMenuItemAvailabilityAction,
  setMenuItemPublishedAction,
  updateMenuItemAction,
} from "@/app/restaurant/menu/items-actions";
import { createStaffOrderAction } from "@/app/restaurant/orders/actions";
import { getPublicRestaurant } from "@/lib/data/public-restaurant";
import { asSeedUser, invokeAction, seedOnce, seeded, SEED_NOW, tenantIdOf } from "../helpers/actors";
import { freezeTime, testDb } from "../setup/db";
import { dataOf, errorOf, expectSameNotFound } from "./results";

/**
 * S1-P10-T003 — menu item services and actions (api.md LD-MENU-02/03, SA-MENU-06…11).
 * TC-MENU-002, TC-MENU-003, TC-MENU-008, TC-MENU-009, TC-MENU-010, TC-MENU-011; TI-001, TI-002, TI-005…TI-008.
 */
const db = testDb();

beforeAll(seedOnce, 120_000);

const itemA = (key: string) => seeded("A", `item:${key}`);
const categoryA = (key: string) => seeded("A", `category:${key}`);

/** Creates an item as Tenant A's MANAGER; unpublished and available, per SA-MENU-06. */
async function newItem(name: string, extra: Record<string, unknown> = {}) {
  await asSeedUser("A", "MANAGER");
  return dataOf(await invokeAction(createMenuItemAction, { categoryId: categoryA("starters"), name, basePrice: "150.00", taxRate: "5", ...extra }));
}

const allItems = async () => dataOf(await invokeAction(listMenuItemsAction, { limit: 100 })).items;

describe("LD-MENU-02 listMenuItemsAction (menu:read)", () => {
  it("TC-MENU-002 / TI-001 a WAITER reads exactly Tenant A's active items, in category then display order", async () => {
    await asSeedUser("A", "WAITER");
    const items = await allItems();

    const expected = await db.menuItem.findMany({
      where: { tenantId: tenantIdOf("A"), archivedAt: null },
      orderBy: [{ category: { sortOrder: "asc" } }, { category: { name: "asc" } }, { categoryId: "asc" }, { displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    expect(items.map((i) => i.id)).toEqual(expected.map((i) => i.id));

    const tenantB = await db.menuItem.findMany({ where: { tenantId: tenantIdOf("B") }, select: { id: true, name: true } });
    const ids = new Set(items.map((i) => i.id));
    const names = new Set(items.map((i) => i.name));
    expect(tenantB.filter((b) => ids.has(b.id) || names.has(b.name))).toEqual([]);

    // Money leaves as two-decimal strings; "from" price is the cheapest active variant (ADR-010 §1).
    expect(items.find((i) => i.id === itemA("paneer-tikka"))).toMatchObject({
      basePrice: "280.00",
      priceFrom: "160.00",
      taxRate: "5.00",
      categoryName: "Starters",
      dietaryType: "VEG",
      variantCount: 2,
      addonCount: 0,
    });
    expect(items.find((i) => i.id === itemA("butter-chicken"))).toMatchObject({ priceFrom: "360.00", addonCount: 2, dietaryType: "NON_VEG" });
    expect(items.find((i) => i.id === itemA("masala-omelette"))?.dietaryType).toBe("EGG");
  });

  it("TC-MENU-002 filters by category, publication, availability and search — and matches % literally (ADV-018)", async () => {
    const discounted = await newItem("50% Off Thali", { basePrice: "199.00" });
    await asSeedUser("A", "MANAGER");
    dataOf(await invokeAction(setMenuItemAvailabilityAction, { itemId: discounted.id, available: false }));

    const byCategory = dataOf(await invokeAction(listMenuItemsAction, { categoryId: categoryA("beverages"), limit: 100 })).items;
    expect(byCategory.map((i) => i.id).sort()).toEqual([itemA("masala-chai"), itemA("lime-soda")].sort());

    const unpublished = dataOf(await invokeAction(listMenuItemsAction, { published: false, limit: 100 })).items;
    expect(unpublished.map((i) => i.id)).toContain(discounted.id);
    expect(unpublished.every((i) => !i.isPublished)).toBe(true);

    const unavailable = dataOf(await invokeAction(listMenuItemsAction, { available: "false", limit: 100 })).items;
    expect(unavailable.map((i) => i.id)).toEqual([discounted.id]);

    expect(dataOf(await invokeAction(listMenuItemsAction, { q: "chai", limit: 100 })).items.map((i) => i.id)).toEqual([itemA("masala-chai")]);
    expect(dataOf(await invokeAction(listMenuItemsAction, { q: "50%", limit: 100 })).items.map((i) => i.id)).toEqual([discounted.id]);
    // A bare "%" would match everything if the pattern were not escaped.
    expect(dataOf(await invokeAction(listMenuItemsAction, { q: "%", limit: 100 })).items.map((i) => i.id)).toEqual([discounted.id]);
  });

  it("TC-MENU-002 pages with a cursor: pages never overlap and together equal the whole list", async () => {
    await asSeedUser("A", "MANAGER");
    const everything = await allItems();
    expect(everything.length).toBeGreaterThan(4);

    const seen: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 20; page++) {
      const result = dataOf(await invokeAction(listMenuItemsAction, { limit: 2, ...(cursor ? { cursor } : {}) }));
      expect(result.items.length).toBeLessThanOrEqual(2);
      seen.push(...result.items.map((i) => i.id));
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
    expect(seen).toEqual(everything.map((i) => i.id));
    expect(new Set(seen).size).toBe(seen.length);

    expect(errorOf(await invokeAction(listMenuItemsAction, { cursor: "not-a-cursor" })).code).toBe("VALIDATION_ERROR");
  });

  it("TC-MENU-002 archived items are listed only when asked for", async () => {
    const retired = await newItem("Winter soup");
    dataOf(await invokeAction(archiveMenuItemAction, { itemId: retired.id }));

    expect((await allItems()).some((i) => i.id === retired.id)).toBe(false);
    const archived = dataOf(await invokeAction(listMenuItemsAction, { archived: true, limit: 100 })).items;
    expect(archived.map((i) => i.id)).toContain(retired.id);
    expect(archived.every((i) => i.archivedAt !== null)).toBe(true);
  });

  it("every tenant role may read the list", async () => {
    for (const role of ["TENANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      expect((await allItems()).length).toBeGreaterThan(0);
    }
  });
});

describe("LD-MENU-03 getMenuItemAction (menu:read)", () => {
  it("TC-MENU-003 returns the item with its variants, add-ons and the tenant's kitchen sections", async () => {
    await asSeedUser("A", "WAITER");
    const { item, kitchenSections } = dataOf(await invokeAction(getMenuItemAction, { itemId: itemA("paneer-tikka") }));

    expect(item).toMatchObject({ name: "Paneer Tikka", basePrice: "280.00", priceFrom: "160.00", taxRate: "5.00", categoryName: "Starters", kitchenSectionName: "Tandoor" });
    expect(item.variants.map((v) => [v.name, v.price, v.isDefault])).toEqual([
      ["Half", "160.00", false],
      ["Full", "280.00", true],
    ]);

    const butter = dataOf(await invokeAction(getMenuItemAction, { itemId: itemA("butter-chicken") })).item;
    expect(butter.addons.map((a) => [a.name, a.price])).toEqual([
      ["Extra Butter", "30.00"],
      ["Butter Naan", "60.00"],
    ]);

    expect(kitchenSections.map((s) => s.code)).toEqual(["MAIN", "TANDOOR", "BAR"]);
    expect(kitchenSections.every((s) => typeof s.id === "string")).toBe(true);
  });

  it("TI-002 a Tenant B item id is NOT_FOUND, identical to a random UUID", async () => {
    await asSeedUser("A", "MANAGER");
    expectSameNotFound(
      await invokeAction(getMenuItemAction, { itemId: seeded("B", "item:clam-chowder") }),
      await invokeAction(getMenuItemAction, { itemId: randomUUID() }),
    );
  });
});

describe("SA-MENU-06 createMenuItemAction", () => {
  it("TC-MENU-008 creates an unpublished, available item with NUMERIC money and audits it in the same transaction", async () => {
    const item = await newItem("Gulab Jamun", {
      description: "Warm dumplings",
      basePrice: "150.50",
      taxRate: "5",
      dietaryType: "VEG",
      prepTimeMinutes: 12,
      kitchenSectionId: seeded("A", "section:MAIN"),
    });
    expect(item).toMatchObject({
      name: "Gulab Jamun",
      basePrice: "150.50",
      priceFrom: "150.50",
      taxRate: "5.00",
      dietaryType: "VEG",
      prepTimeMinutes: 12,
      imageUrl: null,
      isAvailable: true,
      isPublished: false,
      kitchenSectionName: "Main Kitchen",
      variants: [],
      addons: [],
    });

    const row = await db.menuItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(row.tenantId).toBe(tenantIdOf("A"));
    expect(row.basePrice).toEqual(new Prisma.Decimal("150.50"));
    expect(row.basePrice).toBeInstanceOf(Prisma.Decimal);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "menu_item.created", resourceId: item.id } });
    expect(audit).toMatchObject({ tenantId: tenantIdOf("A"), actorRole: "MANAGER", resourceType: "menu_item" });
    expect(audit.afterState).toMatchObject({ name: "Gulab Jamun", basePrice: "150.50", taxRate: "5.00", isPublished: false });
  });

  it("TC-MENU-008 / TI-005 / TI-010 a Tenant B category or kitchen section is NOT_FOUND, identical to a random UUID", async () => {
    await asSeedUser("A", "MANAGER");
    const base = { name: "Smuggled", basePrice: "10.00", taxRate: "5" };
    expectSameNotFound(
      await invokeAction(createMenuItemAction, { ...base, categoryId: seeded("B", "category:starters") }),
      await invokeAction(createMenuItemAction, { ...base, categoryId: randomUUID() }),
    );
    expectSameNotFound(
      await invokeAction(createMenuItemAction, { ...base, categoryId: categoryA("starters"), kitchenSectionId: seeded("B", "section:GRILL") }),
      await invokeAction(createMenuItemAction, { ...base, categoryId: categoryA("starters"), kitchenSectionId: randomUUID() }),
    );
    expect(await db.menuItem.count({ where: { name: "Smuggled" } })).toBe(0);
  });

  it("TC-MENU-008 rejects float, negative, exponent and over-precise prices, out-of-range tax and non-https images", async () => {
    await asSeedUser("A", "MANAGER");
    const base = { categoryId: categoryA("starters"), name: "Bad price", taxRate: "5" };
    for (const basePrice of ["-1", "1e3", "1.005", " 12", "1,000", 12.5]) {
      expect(errorOf(await invokeAction(createMenuItemAction, { ...base, basePrice } as never)).code).toBe("VALIDATION_ERROR");
    }
    for (const taxRate of ["101", "-5", "abc"]) {
      expect(errorOf(await invokeAction(createMenuItemAction, { ...base, basePrice: "10.00", taxRate })).code).toBe("VALIDATION_ERROR");
    }
    // Q-009 A: images are allow-listed https links only; with no host allow-listed, every link is rejected.
    for (const imageUrl of ["http://example.com/x.png", "javascript:alert(1)", "https://images.example.com/x.png"]) {
      expect(errorOf(await invokeAction(createMenuItemAction, { ...base, basePrice: "10.00", imageUrl })).code).toBe("VALIDATION_ERROR");
    }
    expect(await db.menuItem.count({ where: { name: "Bad price" } })).toBe(0);
  });

  it("ADV-001 a tenantId, a publication flag or an availability flag in the body is 422 (unknown key)", async () => {
    await asSeedUser("A", "MANAGER");
    const base = { categoryId: categoryA("starters"), name: "Injected", basePrice: "10.00", taxRate: "5" };
    for (const extra of [{ tenantId: tenantIdOf("B") }, { isPublished: true }, { isAvailable: false }, { displayOrder: 0 }, { price: "1.00" }]) {
      const error = errorOf(await invokeAction(createMenuItemAction, { ...base, ...extra } as never));
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.fieldErrors?._?.[0]).toContain("Unknown field");
    }
    expect(await db.menuItem.count({ where: { name: "Injected" } })).toBe(0);
  });
});

describe("SA-MENU-07 updateMenuItemAction", () => {
  it("TC-MENU-009 a stale expectedUpdatedAt is 409 CONFLICT and writes nothing", async () => {
    const item = await newItem("Kulfi");
    const stale = item.updatedAt;

    dataOf(await invokeAction(updateMenuItemAction, { itemId: item.id, expectedUpdatedAt: stale, name: "Malai Kulfi" }));
    const conflict = errorOf(await invokeAction(updateMenuItemAction, { itemId: item.id, expectedUpdatedAt: stale, name: "Someone else's name" }));
    expect(conflict.code).toBe("CONFLICT");
    expect((await db.menuItem.findUniqueOrThrow({ where: { id: item.id } })).name).toBe("Malai Kulfi");
  });

  it("TC-MENU-009 a price or tax change writes menu_item.price_changed with before/after; other fields audit separately", async () => {
    const item = await newItem("Rasmalai", { description: "Chilled" });
    const updated = dataOf(
      await invokeAction(updateMenuItemAction, { itemId: item.id, expectedUpdatedAt: item.updatedAt, basePrice: "175.50", description: "Chilled and creamy" }),
    );
    expect(updated).toMatchObject({ basePrice: "175.50", description: "Chilled and creamy" });

    const price = await db.auditLog.findFirstOrThrow({ where: { action: "menu_item.price_changed", resourceId: item.id } });
    expect(price.beforeState).toEqual({ basePrice: "150.00", taxRate: "5.00" });
    expect(price.afterState).toEqual({ basePrice: "175.50", taxRate: "5.00" });

    const fields = await db.auditLog.findFirstOrThrow({ where: { action: "menu_item.updated", resourceId: item.id } });
    expect(fields.beforeState).toEqual({ description: "Chilled" });
    expect(fields.afterState).toEqual({ description: "Chilled and creamy" });

    // Re-sending the same price is not a price change.
    dataOf(await invokeAction(updateMenuItemAction, { itemId: item.id, expectedUpdatedAt: updated.updatedAt, basePrice: "175.5" }));
    expect(await db.auditLog.count({ where: { action: "menu_item.price_changed", resourceId: item.id } })).toBe(1);
  });

  it("TI-006 updating a Tenant B item is NOT_FOUND like a random UUID; B is unchanged", async () => {
    const target = seeded("B", "item:clam-chowder");
    const before = await db.menuItem.findUniqueOrThrow({ where: { id: target } });

    await asSeedUser("A", "MANAGER");
    const expectedUpdatedAt = before.updatedAt.toISOString();
    expectSameNotFound(
      await invokeAction(updateMenuItemAction, { itemId: target, expectedUpdatedAt, basePrice: "0.01" }),
      await invokeAction(updateMenuItemAction, { itemId: randomUUID(), expectedUpdatedAt, basePrice: "0.01" }),
    );
    expect(await db.menuItem.findUniqueOrThrow({ where: { id: target } })).toEqual(before);
  });

  it("moving an own item into a Tenant B category is NOT_FOUND and leaves it where it was", async () => {
    const item = await newItem("Mango Mousse");
    expect(errorOf(await invokeAction(updateMenuItemAction, { itemId: item.id, expectedUpdatedAt: item.updatedAt, categoryId: seeded("B", "category:mains") })).code).toBe("NOT_FOUND");
    expect((await db.menuItem.findUniqueOrThrow({ where: { id: item.id } })).categoryId).toBe(categoryA("starters"));

    const moved = dataOf(await invokeAction(updateMenuItemAction, { itemId: item.id, expectedUpdatedAt: item.updatedAt, categoryId: categoryA("mains") }));
    expect(moved.categoryName).toBe("Mains");
  });

  it("ADV-001 publication and availability are not fields of an update (422 unknown key)", async () => {
    const item = await newItem("Phirni");
    for (const extra of [{ tenantId: tenantIdOf("B") }, { isAvailable: false }, { isPublished: true }, { variants: [] }]) {
      expect(errorOf(await invokeAction(updateMenuItemAction, { itemId: item.id, expectedUpdatedAt: item.updatedAt, ...extra } as never)).code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("SA-MENU-09 reorderMenuItemsAction", () => {
  it("reorders exactly the category's active items; a foreign or other-category id is NOT_FOUND", async () => {
    await asSeedUser("A", "MANAGER");
    const inCategory = (await allItems()).filter((i) => i.categoryId === categoryA("beverages")).map((i) => i.id);
    const reversed = [...inCategory].reverse();

    const { items } = dataOf(await invokeAction(reorderMenuItemsAction, { categoryId: categoryA("beverages"), orderedIds: reversed }));
    expect(items.map((i) => i.id)).toEqual(reversed);
    expect(items.map((i) => i.displayOrder)).toEqual(reversed.map((_, index) => index));

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "menu_item.reordered", resourceId: categoryA("beverages") } });
    expect(audit.beforeState).toEqual({ orderedIds: inCategory });
    expect(audit.afterState).toEqual({ orderedIds: reversed });

    expect(errorOf(await invokeAction(reorderMenuItemsAction, { categoryId: categoryA("beverages"), orderedIds: [seeded("B", "item:lemonade")] })).code).toBe("NOT_FOUND");
    expect(errorOf(await invokeAction(reorderMenuItemsAction, { categoryId: categoryA("beverages"), orderedIds: [itemA("paneer-tikka")] })).code).toBe("NOT_FOUND");
    expect(errorOf(await invokeAction(reorderMenuItemsAction, { categoryId: categoryA("beverages"), orderedIds: [reversed[0]] })).code).toBe("VALIDATION_ERROR");

    dataOf(await invokeAction(reorderMenuItemsAction, { categoryId: categoryA("beverages"), orderedIds: inCategory }));
  });
});

describe("SA-MENU-10 setMenuItemPublishedAction", () => {
  it("TC-MENU-007 publishing needs a published category and a sellable price, and then shows the item publicly", async () => {
    const item = await newItem("Tandoori Broccoli", { basePrice: "220.00" });
    const onSite = async () =>
      (await getPublicRestaurant("spice-route")).categories.flatMap((c) => c.items).map((i) => i.id);

    expect(await onSite()).not.toContain(item.id);

    const published = dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: item.id, published: true }));
    expect(published.isPublished).toBe(true);
    expect(await onSite()).toContain(item.id);
    expect(await db.auditLog.count({ where: { action: "menu_item.published", resourceId: item.id } })).toBe(1);

    dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: item.id, published: false }));
    expect(await onSite()).not.toContain(item.id);
    expect(await db.auditLog.count({ where: { action: "menu_item.unpublished", resourceId: item.id } })).toBe(1);
  });

  it("TC-MENU-007 a free item with no available variant, and an item in an unpublished category, cannot be published", async () => {
    const free = await newItem("Complimentary Water", { basePrice: "0" });
    expect(errorOf(await invokeAction(setMenuItemPublishedAction, { itemId: free.id, published: true })).code).toBe("PRICE_REQUIRED");

    const hidden = dataOf(await invokeAction(createMenuItemAction, { categoryId: categoryA("mains"), name: "Hidden curry", basePrice: "300.00", taxRate: "5" }));
    await db.menuCategory.update({ where: { id: categoryA("mains") }, data: { isPublished: false } });
    expect(errorOf(await invokeAction(setMenuItemPublishedAction, { itemId: hidden.id, published: true })).code).toBe("CATEGORY_NOT_PUBLISHED");
    await db.menuCategory.update({ where: { id: categoryA("mains") }, data: { isPublished: true } });

    expect((await db.menuItem.findUniqueOrThrow({ where: { id: hidden.id } })).isPublished).toBe(false);
  });
});

describe("SA-MENU-11 setMenuItemAvailabilityAction (menu:availability:update)", () => {
  it("TC-MENU-011 a sold-out item cannot be ordered and shows as unavailable on the public site", async () => {
    const item = await newItem("Jalebi", { basePrice: "90.00" });
    dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: item.id, published: true }));

    const soldOut = dataOf(await invokeAction(setMenuItemAvailabilityAction, { itemId: item.id, available: false }));
    expect(soldOut.isAvailable).toBe(false);
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "menu_item.availability_changed", resourceId: item.id } });
    expect(audit).toMatchObject({ beforeState: { isAvailable: true }, afterState: { isAvailable: false } });

    await asSeedUser("A", "CASHIER");
    const rejected = errorOf(
      await invokeAction(createStaffOrderAction, { idempotencyKey: randomUUID(), orderType: "TAKEAWAY", items: [{ menuItemId: item.id, quantity: 1 }] }),
    );
    // SA-ORD-01: an unavailable item is 422 ITEM_UNAVAILABLE and the answer names the item that blocked the order.
    expect(rejected.code).toBe("ITEM_UNAVAILABLE");
    expect(`${rejected.message} ${JSON.stringify(rejected.fieldErrors ?? {})}`).toContain("Jalebi");

    // The public page still lists it, flagged unavailable, rather than hiding it silently.
    const publicItem = (await getPublicRestaurant("spice-route")).categories.flatMap((c) => c.items).find((i) => i.id === item.id);
    expect(publicItem).toMatchObject({ isAvailable: false });

    await asSeedUser("A", "MANAGER");
    dataOf(await invokeAction(setMenuItemAvailabilityAction, { itemId: item.id, available: true }));
    await asSeedUser("A", "CASHIER");
    const accepted = dataOf(
      await invokeAction(createStaffOrderAction, { idempotencyKey: randomUUID(), orderType: "TAKEAWAY", items: [{ menuItemId: item.id, quantity: 1 }] }),
    );
    expect(accepted.order.items).toHaveLength(1);
  });

  it("TI-008 toggling availability or publication of a Tenant B item is NOT_FOUND like a random UUID; B is unchanged", async () => {
    const target = seeded("B", "item:clam-chowder");
    await asSeedUser("A", "MANAGER");
    expectSameNotFound(
      await invokeAction(setMenuItemAvailabilityAction, { itemId: target, available: false }),
      await invokeAction(setMenuItemAvailabilityAction, { itemId: randomUUID(), available: false }),
    );
    expectSameNotFound(
      await invokeAction(setMenuItemPublishedAction, { itemId: target, published: false }),
      await invokeAction(setMenuItemPublishedAction, { itemId: randomUUID(), published: false }),
    );
    expect(await db.menuItem.findUniqueOrThrow({ where: { id: target } })).toMatchObject({ isAvailable: true, isPublished: true });
  });
});

describe("SA-MENU-08 archiveMenuItemAction", () => {
  it("TC-MENU-010 archiving unpublishes the item and removes it from today's and later daily menus, never past ones", async () => {
    const restoreClock = freezeTime(SEED_NOW.toISOString());
    try {
      const item = await newItem("Seasonal Halwa", { basePrice: "160.00" });
      dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: item.id, published: true }));

      // Yesterday's menu is history: it is written directly, because the service refuses to edit a past date.
      const yesterday = seeded("A", "daily:yesterday");
      await db.dailyMenuItem.create({ data: { tenantId: tenantIdOf("A"), dailyMenuId: yesterday, menuItemId: item.id, displayOrder: 9 } });

      const todayMenu = seeded("A", "daily:today");
      const todayDate = (await db.dailyMenu.findUniqueOrThrow({ where: { id: todayMenu } })).businessDate.toISOString().slice(0, 10);
      const tomorrowDate = (await db.dailyMenu.findUniqueOrThrow({ where: { id: seeded("A", "daily:tomorrow") } })).businessDate.toISOString().slice(0, 10);
      dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: todayDate, itemIds: [itemA("masala-chai"), item.id] }));
      dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: tomorrowDate, itemIds: [item.id, itemA("dal-makhani")] }));

      const archived = dataOf(await invokeAction(archiveMenuItemAction, { itemId: item.id }));
      expect(archived.archivedAt).not.toBeNull();
      expect(await db.menuItem.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ isPublished: false, isAvailable: false });

      const menusStillHolding = await db.dailyMenuItem.findMany({ where: { menuItemId: item.id }, select: { dailyMenuId: true } });
      expect(menusStillHolding.map((m) => m.dailyMenuId)).toEqual([yesterday]);

      // The remaining items keep a gap-free display order.
      const remaining = await db.dailyMenuItem.findMany({ where: { dailyMenuId: seeded("A", "daily:tomorrow") }, orderBy: { displayOrder: "asc" } });
      expect(remaining.map((r) => r.displayOrder)).toEqual(remaining.map((_, index) => index));

      const audit = await db.auditLog.findFirstOrThrow({ where: { action: "menu_item.archived", resourceId: item.id } });
      expect(audit.afterState).toMatchObject({ removedFromDailyMenus: [todayDate, tomorrowDate] });
      expect(await db.auditLog.count({ where: { action: "daily_menu.items_updated", resourceId: { in: [todayMenu, seeded("A", "daily:tomorrow")] }, reason: "Menu item archived" } })).toBe(2);

      // Archived is terminal for editing.
      expect(errorOf(await invokeAction(updateMenuItemAction, { itemId: item.id, expectedUpdatedAt: archived.updatedAt, name: "Revived" })).code).toBe("NOT_FOUND");
    } finally {
      restoreClock();
    }
  });

  it("TI-007 archiving a Tenant B item is NOT_FOUND like a random UUID; B stays active", async () => {
    const target = seeded("B", "item:calamari");
    await asSeedUser("A", "TENANT_ADMIN");
    expectSameNotFound(await invokeAction(archiveMenuItemAction, { itemId: target }), await invokeAction(archiveMenuItemAction, { itemId: randomUUID() }));
    expect((await db.menuItem.findUniqueOrThrow({ where: { id: target } })).archivedAt).toBeNull();
  });
});
