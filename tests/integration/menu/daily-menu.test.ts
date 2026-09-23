import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  copyDailyMenuAction,
  deleteDraftDailyMenuAction,
  getDailyMenuAction,
  getDailyMenuCalendarAction,
  publishDailyMenuAction,
  saveDailyMenuDraftAction,
  unpublishDailyMenuAction,
} from "@/app/restaurant/menu/daily-actions";
import { archiveMenuItemAction, createMenuItemAction, setMenuItemPublishedAction } from "@/app/restaurant/menu/items-actions";
import { asSeedUser, invokeAction, seedOnce, seeded, SEED_NOW, tenantIdOf } from "../helpers/actors";
import { freezeTime, testDb } from "../setup/db";
import { dataOf, errorOf, expectSameNotFound } from "./results";

/**
 * S1-P11-T001/T002/T005 — daily menu lifecycle, loaders, audit and isolation
 * (api.md LD-DMENU-01/02, SA-DMENU-01…05). TC-DMENU-001…004, TC-DMENU-006, TC-DMENU-008; TI-011, TI-012, TI-013.
 *
 * The clock is pinned to the seed instant so "today" is the seeded business date in each restaurant's own timezone
 * (Asia/Kolkata for A, America/New_York for B) and the seeded yesterday/today/tomorrow menus keep their meaning.
 */
const db = testDb();
let restoreClock: () => void;

beforeAll(seedOnce, 120_000);
beforeAll(() => {
  restoreClock = freezeTime(SEED_NOW.toISOString());
});
afterAll(() => restoreClock?.());

const TODAY = "2026-09-15";
const YESTERDAY = "2026-09-14";
const TOMORROW = "2026-09-16";

const itemA = (key: string) => seeded("A", `item:${key}`);
const menuA = (key: string) => seeded("A", `daily:${key}`);
const itemIdsOf = async (dailyMenuId: string) =>
  (await db.dailyMenuItem.findMany({ where: { dailyMenuId }, orderBy: { displayOrder: "asc" }, select: { menuItemId: true } })).map((i) => i.menuItemId);

describe("LD-DMENU-01 getDailyMenuAction (daily_menu:read)", () => {
  it("TC-DMENU-001 defaults to today in the restaurant timezone and offers only this tenant's items and recent menus", async () => {
    await asSeedUser("A", "KITCHEN");
    const view = dataOf(await invokeAction(getDailyMenuAction));

    expect(view.businessDate).toBe(TODAY);
    expect(view.today).toBe(TODAY);
    expect(view.dailyMenu?.id).toBe(menuA("today"));
    expect(view.dailyMenu?.status).toBe("PUBLISHED");
    expect(view.dailyMenu?.items.map((i) => i.menuItemId)).toEqual([itemA("paneer-tikka"), itemA("butter-chicken"), itemA("masala-chai")]);
    expect(view.dailyMenu?.items.map((i) => i.displayOrder)).toEqual([0, 1, 2]);

    const ownItems = new Set((await db.menuItem.findMany({ where: { tenantId: tenantIdOf("A") }, select: { id: true } })).map((i) => i.id));
    expect(view.pickableItems.length).toBeGreaterThan(0);
    expect(view.pickableItems.every((i) => ownItems.has(i.id))).toBe(true);
    expect(view.pickableItems.find((i) => i.id === itemA("paneer-tikka"))).toMatchObject({ categoryName: "Starters", basePrice: "280.00", dietaryType: "VEG" });

    // Copy sources are the menus *before* the viewed date, newest first.
    expect(view.previousMenus.map((m) => m.businessDate)).toEqual([YESTERDAY]);
    expect(view.previousMenus[0]).toMatchObject({ status: "PUBLISHED", itemCount: 3 });
  });

  it("TI-011 a business date both tenants use returns each caller's own menu only", async () => {
    await asSeedUser("A", "WAITER");
    const inA = dataOf(await invokeAction(getDailyMenuAction, { businessDate: TODAY }));
    expect(inA.dailyMenu?.id).toBe(menuA("today"));

    await asSeedUser("B", "WAITER");
    const inB = dataOf(await invokeAction(getDailyMenuAction, { businessDate: TODAY }));
    expect(inB.dailyMenu?.id).toBe(seeded("B", "daily:today"));
    expect((await db.dailyMenu.findUniqueOrThrow({ where: { id: inB.dailyMenu!.id } })).tenantId).toBe(tenantIdOf("B"));

    const itemsOfB = new Set((await db.menuItem.findMany({ where: { tenantId: tenantIdOf("B") }, select: { id: true } })).map((i) => i.id));
    expect(inB.dailyMenu!.items.every((i) => itemsOfB.has(i.menuItemId))).toBe(true);
  });

  it("TI-011 a date only the other tenant has a menu for comes back empty", async () => {
    await asSeedUser("B", "MANAGER");
    dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-11-01", itemIds: [seeded("B", "item:lemonade")] }));

    await asSeedUser("A", "WAITER");
    const view = dataOf(await invokeAction(getDailyMenuAction, { businessDate: "2026-11-01" }));
    expect(view.dailyMenu).toBeNull();
    expect(view.businessDate).toBe("2026-11-01");
  });

  it("rejects malformed dates and unknown keys with 422", async () => {
    await asSeedUser("A", "WAITER");
    expect(errorOf(await invokeAction(getDailyMenuAction, { businessDate: "2026-02-30" })).code).toBe("VALIDATION_ERROR");
    expect(errorOf(await invokeAction(getDailyMenuAction, { businessDate: "15-09-2026" })).code).toBe("VALIDATION_ERROR");
    expect(errorOf(await invokeAction(getDailyMenuAction, { businessDate: TODAY, tenantId: tenantIdOf("B") } as never)).code).toBe("VALIDATION_ERROR");
  });
});

describe("LD-DMENU-02 getDailyMenuCalendarAction (daily_menu:read)", () => {
  it("TC-DMENU-001 returns the tenant's menus in the range, oldest first, and refuses ranges over 62 days", async () => {
    await asSeedUser("A", "CASHIER");
    const { items, today } = dataOf(await invokeAction(getDailyMenuCalendarAction, { from: "2026-09-01", to: "2026-09-30" }));

    expect(today).toBe(TODAY);
    expect(items.map((m) => m.businessDate)).toEqual([YESTERDAY, TODAY, TOMORROW]);
    expect(items.map((m) => m.status)).toEqual(["PUBLISHED", "PUBLISHED", "DRAFT"]);
    expect(items.every((m) => m.itemCount === 3)).toBe(true);

    expect(errorOf(await invokeAction(getDailyMenuCalendarAction, { from: "2026-01-01", to: "2026-12-31" })).code).toBe("VALIDATION_ERROR");
    expect(errorOf(await invokeAction(getDailyMenuCalendarAction, { from: "2026-09-30", to: "2026-09-01" })).code).toBe("VALIDATION_ERROR");
  });
});

describe("SA-DMENU-01 saveDailyMenuDraftAction", () => {
  it("TC-DMENU-002 / TC-DMENU-008 creates a DRAFT with ordered items, then replaces the set, auditing both", async () => {
    await asSeedUser("A", "MANAGER");
    const created = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-10", title: "Festival menu", itemIds: [itemA("butter-chicken"), itemA("paneer-tikka")] }));
    expect(created.status).toBe("DRAFT");
    expect(created.dailyMenu.businessDate).toBe("2026-10-10");
    expect(created.dailyMenu.items.map((i) => [i.menuItemId, i.displayOrder])).toEqual([
      [itemA("butter-chicken"), 0],
      [itemA("paneer-tikka"), 1],
    ]);
    expect((await db.dailyMenu.findUniqueOrThrow({ where: { id: created.dailyMenuId } })).tenantId).toBe(tenantIdOf("A"));

    const createdAudit = await db.auditLog.findFirstOrThrow({ where: { action: "daily_menu.created", resourceId: created.dailyMenuId } });
    expect(createdAudit).toMatchObject({ tenantId: tenantIdOf("A"), actorRole: "MANAGER", resourceType: "daily_menu" });
    expect(createdAudit.afterState).toMatchObject({ businessDate: "2026-10-10", status: "DRAFT", itemIds: [itemA("butter-chicken"), itemA("paneer-tikka")] });

    const saved = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-10", itemIds: [itemA("masala-chai")] }));
    expect(saved.dailyMenuId).toBe(created.dailyMenuId);
    expect(await itemIdsOf(saved.dailyMenuId)).toEqual([itemA("masala-chai")]);

    const updated = await db.auditLog.findFirstOrThrow({ where: { action: "daily_menu.items_updated", resourceId: created.dailyMenuId } });
    expect(updated.beforeState).toMatchObject({ itemIds: [itemA("butter-chicken"), itemA("paneer-tikka")] });
    expect(updated.afterState).toMatchObject({ itemIds: [itemA("masala-chai")] });
  });

  it("TC-DMENU-002 refuses a business date the restaurant has already lived through", async () => {
    await asSeedUser("A", "MANAGER");
    const error = errorOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: YESTERDAY, itemIds: [itemA("masala-chai")] }));
    expect(error.code).toBe("DATE_IN_PAST");
    expect(await itemIdsOf(menuA("yesterday"))).toHaveLength(3);

    // Today itself is always allowed.
    expect(dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: TODAY, itemIds: await itemIdsOf(menuA("today")) })).status).toBe("PUBLISHED");
  });

  it("TI-012 a Tenant B item id — alone or mixed in — is NOT_FOUND like a random UUID, and nothing is created", async () => {
    await asSeedUser("A", "MANAGER");
    const random = await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-11", itemIds: [randomUUID()] });
    expectSameNotFound(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-11", itemIds: [seeded("B", "item:clam-chowder")] }), random);
    expectSameNotFound(
      await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-11", itemIds: [itemA("paneer-tikka"), seeded("B", "item:grilled-salmon")] }),
      random,
    );
    expect(await db.dailyMenu.count({ where: { businessDate: new Date("2026-10-11T00:00:00.000Z") } })).toBe(0);
  });

  it("TI-012 adding a Tenant B item to an existing Tenant A menu leaves its items unchanged", async () => {
    const before = await itemIdsOf(menuA("tomorrow"));
    await asSeedUser("A", "MANAGER");
    expect(errorOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: TOMORROW, itemIds: [itemA("chicken-65"), seeded("B", "item:coffee")] })).code).toBe("NOT_FOUND");
    expect(await itemIdsOf(menuA("tomorrow"))).toEqual(before);
  });

  it("TC-DMENU-002 an archived item of the tenant is NOT_FOUND, and duplicates or unknown keys are 422", async () => {
    await asSeedUser("A", "MANAGER");
    const item = dataOf(await invokeAction(createMenuItemAction, { categoryId: seeded("A", "category:mains"), name: "Retired curry", basePrice: "200.00", taxRate: "5" }));
    dataOf(await invokeAction(archiveMenuItemAction, { itemId: item.id }));
    expect(errorOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-12", itemIds: [item.id] })).code).toBe("NOT_FOUND");

    const chai = itemA("masala-chai");
    expect(errorOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-12", itemIds: [chai, chai] })).code).toBe("VALIDATION_ERROR");
    for (const extra of [{ tenantId: tenantIdOf("A") }, { status: "PUBLISHED" }, { dailyMenuId: randomUUID() }]) {
      expect(errorOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-12", itemIds: [chai], ...extra } as never)).code).toBe("VALIDATION_ERROR");
    }
    expect(await db.dailyMenu.count({ where: { businessDate: new Date("2026-10-12T00:00:00.000Z") } })).toBe(0);
  });
});

describe("SA-DMENU-02 / SA-DMENU-03 publish and unpublish", () => {
  it("TC-DMENU-003 / TC-DMENU-008 DRAFT → PUBLISHED → UNPUBLISHED → PUBLISHED, each transition audited once", async () => {
    await asSeedUser("A", "MANAGER");
    const draft = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-20", itemIds: [itemA("dal-makhani")] }));

    const published = dataOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: draft.dailyMenuId }));
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).not.toBeNull();
    expect((await db.dailyMenu.findUniqueOrThrow({ where: { id: draft.dailyMenuId } })).publishedByUserId).toBe(seeded("A", "user:MANAGER"));

    const publishAudit = await db.auditLog.findFirstOrThrow({ where: { action: "daily_menu.published", resourceId: draft.dailyMenuId } });
    expect(publishAudit.beforeState).toMatchObject({ status: "DRAFT", itemIds: [itemA("dal-makhani")] });
    expect(publishAudit.afterState).toMatchObject({ status: "PUBLISHED", itemIds: [itemA("dal-makhani")] });

    // Publishing an already published menu is a no-op, not a second audit row.
    dataOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: draft.dailyMenuId }));
    expect(await db.auditLog.count({ where: { action: "daily_menu.published", resourceId: draft.dailyMenuId } })).toBe(1);

    const unpublished = dataOf(await invokeAction(unpublishDailyMenuAction, { dailyMenuId: draft.dailyMenuId }));
    expect(unpublished.status).toBe("UNPUBLISHED");
    expect(unpublished.unpublishedAt).not.toBeNull();
    expect(await db.auditLog.count({ where: { action: "daily_menu.unpublished", resourceId: draft.dailyMenuId } })).toBe(1);

    expect(errorOf(await invokeAction(unpublishDailyMenuAction, { dailyMenuId: draft.dailyMenuId })).code).toBe("NOT_PUBLISHED");
    expect(errorOf(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: draft.dailyMenuId })).code).toBe("NOT_DRAFT");

    expect(dataOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: draft.dailyMenuId })).status).toBe("PUBLISHED");
    expect(await db.auditLog.count({ where: { action: "daily_menu.published", resourceId: draft.dailyMenuId } })).toBe(2);
  });

  it("TC-DMENU-003 an empty menu is 422 DAILY_MENU_EMPTY and an unpublished item is 422 ITEM_NOT_PUBLISHED", async () => {
    await asSeedUser("A", "MANAGER");
    const empty = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-21", itemIds: [] }));
    expect(errorOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: empty.dailyMenuId })).code).toBe("DAILY_MENU_EMPTY");

    const unlisted = dataOf(await invokeAction(createMenuItemAction, { categoryId: seeded("A", "category:mains"), name: "Trial dish", basePrice: "310.00", taxRate: "5" }));
    const draft = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-21", itemIds: [unlisted.id] }));
    const blocked = errorOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: draft.dailyMenuId }));
    expect(blocked.code).toBe("ITEM_NOT_PUBLISHED");
    expect(blocked.message).toContain("Trial dish");
    expect((await db.dailyMenu.findUniqueOrThrow({ where: { id: draft.dailyMenuId } })).status).toBe("DRAFT");

    dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: unlisted.id, published: true }));
    expect(dataOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: draft.dailyMenuId })).status).toBe("PUBLISHED");
  });

  it("TI-013 publish, unpublish and delete of Tenant B menu ids are NOT_FOUND like a random UUID; B is unchanged", async () => {
    const draftB = seeded("B", "daily:tomorrow");
    const publishedB = seeded("B", "daily:today");
    const before = await db.dailyMenu.findMany({ where: { id: { in: [draftB, publishedB] } }, orderBy: { id: "asc" } });

    await asSeedUser("A", "MANAGER");
    expectSameNotFound(await invokeAction(publishDailyMenuAction, { dailyMenuId: draftB }), await invokeAction(publishDailyMenuAction, { dailyMenuId: randomUUID() }));
    expectSameNotFound(await invokeAction(unpublishDailyMenuAction, { dailyMenuId: publishedB }), await invokeAction(unpublishDailyMenuAction, { dailyMenuId: randomUUID() }));
    expectSameNotFound(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: draftB }), await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: randomUUID() }));

    expect(await db.dailyMenu.findMany({ where: { id: { in: [draftB, publishedB] } }, orderBy: { id: "asc" } })).toEqual(before);
  });
});

describe("SA-DMENU-04 copyDailyMenuAction", () => {
  it("TC-DMENU-004 / TC-DMENU-008 copies a previous date and reports the items it had to skip", async () => {
    await asSeedUser("A", "MANAGER");
    const keep = dataOf(await invokeAction(createMenuItemAction, { categoryId: seeded("A", "category:mains"), name: "Copy Keeper", basePrice: "150.00", taxRate: "5" }));
    dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: keep.id, published: true }));
    const unpublished = dataOf(await invokeAction(createMenuItemAction, { categoryId: seeded("A", "category:mains"), name: "Copy Draft", basePrice: "160.00", taxRate: "5" }));
    const archived = dataOf(await invokeAction(createMenuItemAction, { categoryId: seeded("A", "category:mains"), name: "Copy Gone", basePrice: "170.00", taxRate: "5" }));
    dataOf(await invokeAction(archiveMenuItemAction, { itemId: archived.id }));

    // A past-dated source menu is history, so it is written directly — the service refuses to edit past dates.
    const source = await db.dailyMenu.create({
      data: {
        tenantId: tenantIdOf("A"),
        businessDate: new Date("2026-09-10T00:00:00.000Z"),
        status: "PUBLISHED",
        title: "Old favourites",
        note: "Back by request",
        createdByUserId: seeded("A", "user:MANAGER"),
      },
    });
    await db.dailyMenuItem.createMany({
      data: [keep.id, unpublished.id, archived.id].map((menuItemId, displayOrder) => ({
        tenantId: tenantIdOf("A"),
        dailyMenuId: source.id,
        menuItemId,
        displayOrder,
      })),
    });

    const result = dataOf(await invokeAction(copyDailyMenuAction, { fromBusinessDate: "2026-09-10", toBusinessDate: "2026-10-30" }));
    expect(result.copiedCount).toBe(1);
    expect(result.skipped).toEqual([
      { menuItemId: unpublished.id, name: "Copy Draft", reason: "NOT_PUBLISHED" },
      { menuItemId: archived.id, name: "Copy Gone", reason: "ARCHIVED" },
    ]);
    expect(result.dailyMenu).toMatchObject({ businessDate: "2026-10-30", status: "DRAFT", title: "Old favourites", note: "Back by request", copiedFromBusinessDate: "2026-09-10" });
    expect(await itemIdsOf(result.dailyMenuId)).toEqual([keep.id]);
    expect((await db.dailyMenu.findUniqueOrThrow({ where: { id: result.dailyMenuId } })).copiedFromDailyMenuId).toBe(source.id);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "daily_menu.copied", resourceId: result.dailyMenuId } });
    expect(audit.afterState).toMatchObject({ businessDate: "2026-10-30", copiedFromBusinessDate: "2026-09-10", itemIds: [keep.id] });
  });

  it("TC-DMENU-004 refuses an unknown source, a past target and a target that is already published", async () => {
    await asSeedUser("A", "MANAGER");
    expect(errorOf(await invokeAction(copyDailyMenuAction, { fromBusinessDate: "2025-01-01", toBusinessDate: "2026-11-11" })).code).toBe("NOT_FOUND");
    expect(errorOf(await invokeAction(copyDailyMenuAction, { fromBusinessDate: TODAY, toBusinessDate: YESTERDAY })).code).toBe("DATE_IN_PAST");
    expect(errorOf(await invokeAction(copyDailyMenuAction, { fromBusinessDate: TODAY, toBusinessDate: TODAY })).code).toBe("VALIDATION_ERROR");

    const target = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-11-12", itemIds: [itemA("paneer-tikka")] }));
    dataOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: target.dailyMenuId }));
    expect(errorOf(await invokeAction(copyDailyMenuAction, { fromBusinessDate: TODAY, toBusinessDate: "2026-11-12" })).code).toBe("TARGET_PUBLISHED");
    expect(await itemIdsOf(target.dailyMenuId)).toEqual([itemA("paneer-tikka")]);
  });

  it("TI-013 a source date that only Tenant B has a menu for is NOT_FOUND for Tenant A", async () => {
    await asSeedUser("B", "MANAGER");
    dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-12-01", itemIds: [seeded("B", "item:coffee")] }));

    await asSeedUser("A", "MANAGER");
    expectSameNotFound(
      await invokeAction(copyDailyMenuAction, { fromBusinessDate: "2026-12-01", toBusinessDate: "2026-12-05" }),
      await invokeAction(copyDailyMenuAction, { fromBusinessDate: "2026-12-02", toBusinessDate: "2026-12-05" }),
    );
    expect(await db.dailyMenu.count({ where: { tenantId: tenantIdOf("A"), businessDate: new Date("2026-12-05T00:00:00.000Z") } })).toBe(0);
  });
});

describe("SA-DMENU-05 deleteDraftDailyMenuAction", () => {
  it("TC-DMENU-006 / TC-DMENU-008 deletes a DRAFT with its items and audits the set it held", async () => {
    await asSeedUser("A", "MANAGER");
    const draft = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-25", itemIds: [itemA("paneer-tikka"), itemA("lime-soda")] }));

    expect(dataOf(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: draft.dailyMenuId }))).toEqual({ id: draft.dailyMenuId });
    expect(await db.dailyMenu.count({ where: { id: draft.dailyMenuId } })).toBe(0);
    expect(await db.dailyMenuItem.count({ where: { dailyMenuId: draft.dailyMenuId } })).toBe(0);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "daily_menu.deleted", resourceId: draft.dailyMenuId } });
    expect(audit.beforeState).toMatchObject({ businessDate: "2026-10-25", status: "DRAFT", itemIds: [itemA("paneer-tikka"), itemA("lime-soda")] });
    expect(audit.afterState).toBeNull();

    expect(errorOf(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: menuA("today") })).code).toBe("NOT_DRAFT");
    expect(await db.dailyMenu.count({ where: { id: menuA("today") } })).toBe(1);
  });

  it("TC-DMENU-006 clears the copy-source reference of menus copied from the deleted draft (data-model E11)", async () => {
    await asSeedUser("A", "MANAGER");
    const source = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-26", itemIds: [itemA("paneer-tikka")] }));
    const copy = dataOf(await invokeAction(copyDailyMenuAction, { fromBusinessDate: "2026-10-26", toBusinessDate: "2026-10-27" }));
    expect((await db.dailyMenu.findUniqueOrThrow({ where: { id: copy.dailyMenuId } })).copiedFromDailyMenuId).toBe(source.dailyMenuId);

    dataOf(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: source.dailyMenuId }));
    expect(await db.dailyMenu.findUniqueOrThrow({ where: { id: copy.dailyMenuId } })).toMatchObject({ copiedFromDailyMenuId: null, tenantId: tenantIdOf("A") });
  });

  it("refuses to delete a draft a social post still refers to", async () => {
    await asSeedUser("A", "MANAGER");
    const draft = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: "2026-10-28", itemIds: [itemA("masala-chai")] }));
    await db.socialPost.create({
      data: {
        tenantId: tenantIdOf("A"),
        channel: "WHATSAPP",
        cardType: "DAILY_MENU",
        dailyMenuId: draft.dailyMenuId,
        caption: "Coming soon",
        shareUrl: "https://example.test/share",
        status: "DRAFT",
        createdByUserId: seeded("A", "user:MANAGER"),
      },
    });

    expect(errorOf(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: draft.dailyMenuId })).code).toBe("DAILY_MENU_IN_USE");
    expect(await db.dailyMenu.count({ where: { id: draft.dailyMenuId } })).toBe(1);
  });
});
