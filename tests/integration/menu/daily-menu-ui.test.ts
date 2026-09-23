import { afterAll, beforeAll, describe, expect, it } from "vitest";
import DailyMenuPage from "@/app/restaurant/daily-menu/page";
import {
  copyDailyMenuAction,
  deleteDraftDailyMenuAction,
  publishDailyMenuAction,
  saveDailyMenuDraftAction,
  unpublishDailyMenuAction,
} from "@/app/restaurant/menu/daily-actions";
import { setMenuItemPublishedAction } from "@/app/restaurant/menu/items-actions";
import { DailyMenuEditor, type DailyMenuEditorProps } from "@/components/menu/daily-menu-editor";
import { failureText } from "@/components/menu/feedback";
import { requireTenant } from "@/lib/auth/guards";
import { publishedMenuForToday } from "@/lib/services/daily-menu";
import { asAnonymous, asSeedUser, invokeAction, invokeLoader, SEED_NOW, seedOnce, seeded } from "../helpers/actors";
import { freezeTime } from "../setup/db";
import { dataOf, errorOf } from "./results";
import { requireComponent } from "./ui-tree";

/**
 * S1-P11-T003 — the daily menu editor (TC-DMENU-007).
 *
 * There is no authenticated end-to-end path for the console here (no Clerk test users, testing.md §2), so the screen
 * is driven through its loader: `invokeLoader` runs the Server Component as the seeded user and the assertions are on
 * what it resolved — the business date it chose, the menu and pickable items it passed down, and the capability flag
 * that decides whether the editor can save at all. Every change goes through the Server Actions the buttons call.
 *
 * The clock is pinned to the seed instant, so "today" is 2026-09-15 in Asia/Kolkata for Tenant A regardless of where
 * the test runs — the server decides the business date, never the browser.
 */
const TODAY = "2026-09-15";
const YESTERDAY = "2026-09-14";
const TOMORROW = "2026-09-16";
const IN_TWO_DAYS = "2026-09-17";
const IN_THREE_DAYS = "2026-09-18";

let restoreClock: () => void = () => {};

beforeAll(async () => {
  await seedOnce();
  restoreClock = freezeTime(SEED_NOW.toISOString());
}, 120_000);
afterAll(() => restoreClock());

const params = (values: Record<string, string> = {}) => ({ searchParams: Promise.resolve(values) });
const itemA = (key: string) => seeded("A", `item:${key}`);

async function editorFor(values: Record<string, string> = {}): Promise<DailyMenuEditorProps> {
  return requireComponent<DailyMenuEditorProps>(await invokeLoader(DailyMenuPage, params(values)), DailyMenuEditor, "DailyMenuEditor");
}

describe("/restaurant/daily-menu loader (LD-DMENU-01, LD-DMENU-02)", () => {
  it("defaults to today in the restaurant's timezone and carries the published menu, the pickable items and the recent menus", async () => {
    await asSeedUser("A", "MANAGER");
    const editor = await editorFor();

    expect(editor.today).toBe(TODAY);
    expect(editor.businessDate).toBe(TODAY);
    expect(editor.timezone).toBe("Asia/Kolkata");
    expect(editor.currencyCode).toBe("INR");
    expect(editor.dailyMenu?.status).toBe("PUBLISHED");
    expect(editor.dailyMenu?.items.map((item) => item.name)).toEqual(["Paneer Tikka", "Butter Chicken", "Masala Chai"]);
    expect(editor.pickableItems.map((item) => item.name)).toContain("Dal Makhani");
    expect(editor.pickableItems.every((item) => item.categoryName !== "")).toBe(true);
    expect(editor.previousMenus.map((menu) => menu.businessDate)).toContain(YESTERDAY);
    expect(editor.canManage).toBe(true);
  });

  it("covers a fortnight of statuses from today, so the strip is real data and not a guess", async () => {
    await asSeedUser("A", "MANAGER");
    const editor = await editorFor();
    const byDate = new Map(editor.calendar.map((entry) => [entry.businessDate, entry]));

    expect(byDate.get(TODAY)?.status).toBe("PUBLISHED");
    expect(byDate.get(TOMORROW)?.status).toBe("DRAFT");
    expect(byDate.get(TOMORROW)?.itemCount).toBe(3);
    // Yesterday is before the window, and days with no menu simply have no entry.
    expect(byDate.has(YESTERDAY)).toBe(false);
    expect(byDate.has(IN_TWO_DAYS)).toBe(false);
  });

  it("opens the date asked for, and falls back to today when the URL carries nonsense", async () => {
    await asSeedUser("A", "MANAGER");
    expect((await editorFor({ date: TOMORROW })).dailyMenu?.status).toBe("DRAFT");
    expect((await editorFor({ date: TOMORROW })).dailyMenu?.title).toBe("Tomorrow (draft)");
    expect((await editorFor({ date: "banana" })).businessDate).toBe(TODAY);
    expect((await editorFor({ date: "2026-13-45" })).businessDate).toBe(TODAY);
    expect((await editorFor({ date: IN_TWO_DAYS })).dailyMenu).toBeNull();
  });

  it("shows a past date read-only, and the server refuses to write to it whatever the screen allows", async () => {
    await asSeedUser("A", "MANAGER");
    const editor = await editorFor({ date: YESTERDAY });
    expect(editor.businessDate).toBe(YESTERDAY);
    expect(editor.today).toBe(TODAY);

    const refused = errorOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: YESTERDAY, itemIds: [itemA("masala-chai")] }));
    expect(refused.code).toBe("DATE_IN_PAST");
    expect(failureText({ ok: false, error: refused })).toBe(`${YESTERDAY} has already passed. Choose ${TODAY} or a later date.`);
  });

  it("SC-RBAC-08 opens read-only for CASHIER, KITCHEN and WAITER, and the server refuses their writes", async () => {
    for (const role of ["CASHIER", "KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      const editor = await editorFor();
      expect(editor.canManage, role).toBe(false);
      expect(editor.dailyMenu?.items.length, role).toBe(3);
      expect(errorOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: editor.dailyMenu!.id })).code, role).toBe("FORBIDDEN");
    }
    asAnonymous();
    expect(await invokeLoader(DailyMenuPage, params())).toEqual({ redirect: "/sign-in" });
  });
});

describe("daily menu refusals the editor has to explain", () => {
  it("422 DAILY_MENU_EMPTY — a menu with nothing on it cannot be published", async () => {
    await asSeedUser("A", "MANAGER");
    const draft = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: IN_TWO_DAYS, title: "Empty", itemIds: [] }));
    const refused = errorOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: draft.dailyMenuId }));

    expect(refused.code).toBe("DAILY_MENU_EMPTY");
    expect(failureText({ ok: false, error: refused })).toBe("Add at least one item before publishing this menu.");
    dataOf(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: draft.dailyMenuId }));
  });

  it("422 ITEM_NOT_PUBLISHED — the refusal names the items that have to be dealt with first", async () => {
    await asSeedUser("A", "MANAGER");
    dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: itemA("dal-makhani"), published: false }));

    const draft = dataOf(
      await invokeAction(saveDailyMenuDraftAction, { businessDate: IN_THREE_DAYS, itemIds: [itemA("butter-chicken"), itemA("dal-makhani")] }),
    );
    const refused = errorOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: draft.dailyMenuId }));
    expect(refused.code).toBe("ITEM_NOT_PUBLISHED");
    expect(failureText({ ok: false, error: refused })).toContain("Dal Makhani");

    // The screen also flags it before the attempt: the loader marks the chosen item as unpublished.
    const editor = await editorFor({ date: IN_THREE_DAYS });
    expect(editor.dailyMenu?.items.find((item) => item.name === "Dal Makhani")?.isPublished).toBe(false);

    dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: itemA("dal-makhani"), published: true }));
    dataOf(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: draft.dailyMenuId }));
  });

  it("409 TARGET_PUBLISHED — copying over a published day is refused rather than silently rewriting it", async () => {
    await asSeedUser("A", "MANAGER");
    const refused = errorOf(await invokeAction(copyDailyMenuAction, { fromBusinessDate: YESTERDAY, toBusinessDate: TODAY }));
    expect(refused.code).toBe("TARGET_PUBLISHED");
    expect(failureText({ ok: false, error: refused })).toContain("Unpublish it before copying over it.");
  });
});

describe("TC-DMENU-007 a manager copies yesterday's menu, reorders it, publishes it and it is live today", () => {
  it("runs the whole flow through the same actions the buttons call", async () => {
    await asSeedUser("A", "MANAGER");
    const before = await editorFor();
    const published = before.dailyMenu!;

    // 1. Today is already published, so it is hidden first — which is exactly what the screen's message says to do.
    dataOf(await invokeAction(unpublishDailyMenuAction, { dailyMenuId: published.id }));
    expect((await editorFor()).dailyMenu?.status).toBe("UNPUBLISHED");

    // 2. Copy yesterday's menu onto today.
    const copied = dataOf(await invokeAction(copyDailyMenuAction, { fromBusinessDate: YESTERDAY, toBusinessDate: TODAY }));
    expect(copied.copiedCount).toBe(3);
    expect(copied.skipped).toEqual([]);

    // 3. Reorder: the list on screen is saved as the new order.
    const copiedOrder = copied.dailyMenu.items.map((item) => item.menuItemId);
    const reordered = [...copiedOrder].reverse();
    const saved = dataOf(await invokeAction(saveDailyMenuDraftAction, { businessDate: TODAY, title: "Today's specials", itemIds: reordered }));
    expect(saved.dailyMenu.items.map((item) => item.menuItemId)).toEqual(reordered);

    // 4. Publish.
    const live = dataOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: saved.dailyMenuId }));
    expect(live.status).toBe("PUBLISHED");
    expect(live.publishedAt).not.toBeNull();

    // 5. The screen reads back the published, reordered menu…
    const after = await editorFor();
    expect(after.dailyMenu?.status).toBe("PUBLISHED");
    expect(after.dailyMenu?.items.map((item) => item.menuItemId)).toEqual(reordered);
    expect(after.dailyMenu?.title).toBe("Today's specials");
    expect(after.calendar.find((entry) => entry.businessDate === TODAY)?.status).toBe("PUBLISHED");

    // …and so does the projection the public site renders for today.
    const ctx = await requireTenant("daily_menu:read");
    const publicMenu = await publishedMenuForToday(ctx);
    expect(publicMenu?.items.map((item) => item.menuItemId)).toEqual(reordered);
    expect(publicMenu?.items.every((item) => item.isPublished && !item.isArchived)).toBe(true);
  });

  it("only a draft can be deleted — a published day is refused with the reason", async () => {
    await asSeedUser("A", "MANAGER");
    const editor = await editorFor();
    const refused = errorOf(await invokeAction(deleteDraftDailyMenuAction, { dailyMenuId: editor.dailyMenu!.id }));
    expect(refused.code).toBe("NOT_DRAFT");
    expect(failureText({ ok: false, error: refused })).toBe("Only a draft menu can be deleted. Unpublish it first.");
  });
});
