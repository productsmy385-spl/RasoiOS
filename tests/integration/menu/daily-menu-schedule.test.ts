import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDailyMenuAction, publishDailyMenuAction, unpublishDailyMenuAction } from "@/app/restaurant/menu/daily-actions";
import type { TenantContext } from "@/lib/auth/context-types";
import type { Permission } from "@/lib/auth/permissions";
import { publishedMenuForToday } from "@/lib/services/daily-menu";
import { asSeedUser, invokeAction, seedOnce, seeded, SEED_NOW, tenantIdOf, type TenantKey } from "../helpers/actors";
import { freezeTime, testDb } from "../setup/db";
import { dataOf } from "./results";

/**
 * S1-P11-T004 — daily menu scheduling across time zones (TC-TZ-003, REQ-DMENU-005, REQ-TZ-004).
 *
 * A future-dated PUBLISHED menu must become *today's* menu exactly at 00:00 in the restaurant's own timezone, and
 * not one minute earlier — independently per tenant. Tenant A is Asia/Kolkata (UTC+05:30) and Tenant B is
 * America/New_York (UTC−04:00 in September), so their midnights are 9½ hours apart:
 *
 *   2026-09-16 00:00 Asia/Kolkata    = 2026-09-15T18:30:00Z
 *   2026-09-16 00:00 America/New_York = 2026-09-16T04:00:00Z
 *
 * The clock is injected (`lib/time`), never the process timezone, so the test gives the same answer whether the
 * server runs in UTC or in Asia/Kolkata.
 */
const db = testDb();
let restoreClock: (() => void) | undefined;

beforeAll(seedOnce, 120_000);
afterEach(() => {
  restoreClock?.();
  restoreClock = undefined;
});

/** Runs `fn` with the clock pinned to `iso`. */
async function at<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  restoreClock?.();
  restoreClock = freezeTime(iso);
  return fn();
}

const KOLKATA_MIDNIGHT = "2026-09-15T18:30:00.000Z";
const NEW_YORK_MIDNIGHT = "2026-09-16T04:00:00.000Z";
const ONE_MINUTE = 60_000;
const minus = (iso: string, ms: number) => new Date(Date.parse(iso) - ms).toISOString();

const todayMenu = (tenant: TenantKey) => seeded(tenant, "daily:today");
const tomorrowMenu = (tenant: TenantKey) => seeded(tenant, "daily:tomorrow");

/** A tenant context built from the seeded rows, to read the service directly (the guards are covered elsewhere). */
async function contextFor(tenant: TenantKey): Promise<TenantContext> {
  const restaurant = await db.restaurant.findFirstOrThrow({ where: { tenantId: tenantIdOf(tenant) }, select: { id: true, timezone: true, currencyCode: true } });
  return {
    kind: "tenant",
    requestId: `tz-${tenant}`,
    userId: seeded(tenant, "user:MANAGER"),
    membershipId: seeded(tenant, "membership:MANAGER"),
    tenantId: tenantIdOf(tenant),
    role: "MANAGER",
    permissions: new Set<Permission>(),
    restaurant,
  };
}

/** What the restaurant's own console calls "today", and which menu that resolves to. */
async function viewFor(tenant: TenantKey) {
  await asSeedUser(tenant, "WAITER");
  const view = dataOf(await invokeAction(getDailyMenuAction));
  return { today: view.today, menuId: view.dailyMenu?.id ?? null, status: view.dailyMenu?.status ?? null };
}

describe("TC-TZ-003 a PUBLISHED menu for tomorrow goes live at local midnight, per tenant", () => {
  beforeAll(async () => {
    // Both tenants publish their seeded draft for 2026-09-16 while it is still 2026-09-15 for them.
    const restore = freezeTime(SEED_NOW.toISOString());
    try {
      for (const tenant of ["A", "B"] as const) {
        await asSeedUser(tenant, "MANAGER");
        const published = dataOf(await invokeAction(publishDailyMenuAction, { dailyMenuId: tomorrowMenu(tenant) }));
        expect(published.status).toBe("PUBLISHED");
        expect(published.businessDate).toBe("2026-09-16");
      }
    } finally {
      restore();
    }
  }, 60_000);

  it("Tenant A still sees 2026-09-15 one minute before midnight in Kolkata, and 2026-09-16 exactly at it", async () => {
    const before = await at(minus(KOLKATA_MIDNIGHT, ONE_MINUTE), () => viewFor("A"));
    expect(before).toEqual({ today: "2026-09-15", menuId: todayMenu("A"), status: "PUBLISHED" });

    const atMidnight = await at(KOLKATA_MIDNIGHT, () => viewFor("A"));
    expect(atMidnight).toEqual({ today: "2026-09-16", menuId: tomorrowMenu("A"), status: "PUBLISHED" });
  });

  it("at Kolkata's midnight it is still the previous business day for Tenant B (9½ hours behind)", async () => {
    const inB = await at(KOLKATA_MIDNIGHT, () => viewFor("B"));
    expect(inB).toEqual({ today: "2026-09-15", menuId: todayMenu("B"), status: "PUBLISHED" });

    const beforeNewYork = await at(minus(NEW_YORK_MIDNIGHT, ONE_MINUTE), () => viewFor("B"));
    expect(beforeNewYork).toEqual({ today: "2026-09-15", menuId: todayMenu("B"), status: "PUBLISHED" });

    const atNewYork = await at(NEW_YORK_MIDNIGHT, () => viewFor("B"));
    expect(atNewYork).toEqual({ today: "2026-09-16", menuId: tomorrowMenu("B"), status: "PUBLISHED" });
  });

  it("the public projection flips at the same instant and carries only published, non-archived items", async () => {
    const ctxA = await contextFor("A");
    const ctxB = await contextFor("B");

    const justBefore = await at(minus(KOLKATA_MIDNIGHT, ONE_MINUTE), async () => ({ a: await publishedMenuForToday(ctxA), b: await publishedMenuForToday(ctxB) }));
    expect(justBefore.a?.id).toBe(todayMenu("A"));
    expect(justBefore.b?.id).toBe(todayMenu("B"));

    const atKolkata = await at(KOLKATA_MIDNIGHT, async () => ({ a: await publishedMenuForToday(ctxA), b: await publishedMenuForToday(ctxB) }));
    expect(atKolkata.a?.id).toBe(tomorrowMenu("A"));
    expect(atKolkata.a?.items.length).toBeGreaterThan(0);
    expect(atKolkata.a?.items.every((item) => item.isPublished && !item.isArchived)).toBe(true);
    // Tenant B has not reached its own midnight yet.
    expect(atKolkata.b?.id).toBe(todayMenu("B"));

    const atNewYork = await at(NEW_YORK_MIDNIGHT, async () => ({ a: await publishedMenuForToday(ctxA), b: await publishedMenuForToday(ctxB) }));
    expect(atNewYork.a?.id).toBe(tomorrowMenu("A"));
    expect(atNewYork.b?.id).toBe(tomorrowMenu("B"));
  });

  it("an unpublished menu never becomes public, however the clock moves", async () => {
    await at(SEED_NOW.toISOString(), async () => {
      await asSeedUser("A", "MANAGER");
      dataOf(await invokeAction(unpublishDailyMenuAction, { dailyMenuId: tomorrowMenu("A") }));
    });

    const ctxA = await contextFor("A");
    const atKolkata = await at(KOLKATA_MIDNIGHT, () => publishedMenuForToday(ctxA));
    expect(atKolkata).toBeNull();

    // The console still shows the menu for that business date, marked UNPUBLISHED.
    const view = await at(KOLKATA_MIDNIGHT, () => viewFor("A"));
    expect(view).toEqual({ today: "2026-09-16", menuId: tomorrowMenu("A"), status: "UNPUBLISHED" });
  });
});
