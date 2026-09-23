import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PlatformContext } from "@/lib/auth/context-types";
import { requirePlatform } from "@/lib/auth/guards";
import { getPlatformDashboard, inspectTenant, listTenantsForPlatform } from "@/lib/services/platform-tenants";
import { fixedClock, overrideClock } from "@/lib/time/clock";
import { tenantListQueryFromSearchParams } from "@/lib/validation/platform";
import { createTenant } from "../../factories";
import { testDb } from "../setup/db";
import { SEED_TENANTS, asPlatformAdmin, seedOnce, staffEmail, tenantIdOf } from "../helpers/actors";
import { RANDOM_UUID } from "../orders/helpers";

// LD-ADM-01 dashboard, LD-ADM-02 tenant list and LD-ADM-03 inspection (TC-ADMIN-006) — S1-P06-T001.
const db = testDb();
const PAGER_COUNT = 30;
const pagerName = (n: number) => `Pager ${String(n).padStart(2, "0")}`;
const pagerSlug = (n: number) => `pager-${String(n).padStart(2, "0")}`;

beforeAll(async () => {
  await seedOnce();
  for (let n = 1; n <= PAGER_COUNT; n++) await createTenant(db, { name: pagerName(n), slug: pagerSlug(n) });
}, 120_000);

let restoreClock: (() => void) | undefined;
afterEach(async () => {
  restoreClock?.();
  restoreClock = undefined;
  await db.tenant.updateMany({ data: { status: "ACTIVE", suspendedAt: null, suspensionReason: null } });
});

async function platformCtx(): Promise<PlatformContext> {
  await asPlatformAdmin();
  return requirePlatform("platform:tenant:read");
}

/** Every key path in a JSON value, with array indexes collapsed to `[]`. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => keyPaths(item, `${prefix}[]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [`${prefix}.${key}`, ...keyPaths(child, `${prefix}.${key}`)]);
  }
  return [];
}

describe("TC-ADMIN-006 tenant inspection returns metadata, members and counts only", () => {
  it("projects exactly the documented fields with counts from the database and audits the inspection", async () => {
    const ctx = await platformCtx();
    restoreClock = overrideClock(fixedClock("2026-09-16T00:00:00.000Z"));
    const inspection = await inspectTenant(ctx, tenantIdOf("A"));

    expect([...new Set(keyPaths(inspection))].sort()).toEqual(
      [
        ".tenant",
        ".tenant.id",
        ".tenant.name",
        ".tenant.slug",
        ".tenant.status",
        ".tenant.suspendedAt",
        ".tenant.suspensionReason",
        ".tenant.createdAt",
        // Provisioning vs handed over (S1-P06-T009, ADR-013 §7): derived from the audit trail, not a column.
        ".tenant.provisioningState",
        ".tenant.handedOverAt",
        ".restaurant",
        ".restaurant.name",
        ".restaurant.timezone",
        ".restaurant.currencyCode",
        ".restaurant.websitePublished",
        ".restaurant.city",
        ".restaurant.countryCode",
        ".members",
        ".members[].membershipId",
        ".members[].fullName",
        ".members[].email",
        ".members[].role",
        ".members[].status",
        ".members[].invitedAt",
        ".members[].acceptedAt",
        ".members[].invitationSent",
        ".counts",
        ".counts.menuItems",
        ".counts.ordersLast30Days",
        ".counts.printAgentsActive",
        ".lifecycle",
        ".lifecycle[].id",
        ".lifecycle[].action",
        ".lifecycle[].actorRole",
        ".lifecycle[].reason",
        ".lifecycle[].createdAt",
      ].sort(),
    );

    expect(inspection.tenant).toMatchObject({ id: tenantIdOf("A"), name: "Spice Route", slug: "spice-route", status: "ACTIVE", suspendedAt: null });
    expect(inspection.restaurant).toEqual({ name: "Spice Route", timezone: "Asia/Kolkata", currencyCode: "INR", websitePublished: true, city: "Bengaluru", countryCode: "IN" });
    const since = new Date("2026-08-17T00:00:00.000Z");
    expect(inspection.counts).toEqual({
      menuItems: await db.menuItem.count({ where: { tenantId: tenantIdOf("A"), archivedAt: null } }),
      ordersLast30Days: await db.order.count({ where: { tenantId: tenantIdOf("A"), createdAt: { gte: since } } }),
      printAgentsActive: await db.printAgent.count({ where: { tenantId: tenantIdOf("A"), status: "ACTIVE" } }),
    });
    expect(inspection.counts.menuItems).toBeGreaterThan(0);
    expect(inspection.counts.ordersLast30Days).toBeGreaterThan(0);

    expect(inspection.members).toHaveLength(await db.userTenant.count({ where: { tenantId: tenantIdOf("A") } }));
    expect(inspection.members.find((m) => m.email === staffEmail(SEED_TENANTS.A, "admin"))).toMatchObject({ role: "TENANT_ADMIN", status: "ACTIVE" });
    expect(inspection.members.find((m) => m.email === staffEmail(SEED_TENANTS.A, "waiter2"))).toMatchObject({ role: "WAITER", status: "INVITED", invitationSent: false });
    expect(inspection.lifecycle.map((e) => e.action)).toContain("tenant.created");
    expect(inspection.lifecycle.every((e) => e.action.startsWith("tenant.") || e.action.startsWith("tenant_admin."))).toBe(true);

    // No operational row of any kind: orders, customers, transactions, menu content, private settings.
    const json = JSON.stringify(inspection);
    const order = await db.order.findFirstOrThrow({ where: { tenantId: tenantIdOf("A") } });
    const transaction = await db.transaction.findFirstOrThrow({ where: { tenantId: tenantIdOf("A") } });
    const customer = await db.customer.findFirstOrThrow({ where: { tenantId: tenantIdOf("A") } });
    const item = await db.menuItem.findFirstOrThrow({ where: { tenantId: tenantIdOf("A") } });
    for (const value of [order.id, order.orderNumber, transaction.id, customer.id, customer.fullName, item.id, item.name, "Sam Taylor", "Paneer Tikka", "Starters", "29ABCDE1234F1Z5", "Thank you for dining with us.", "+918041234567", "hello.spiceroute", "Harbour Grill"]) {
      expect(json).not.toContain(value);
    }

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "platform.tenant_inspected", resourceId: tenantIdOf("A") } });
    expect(audit).toMatchObject({ tenantId: tenantIdOf("A"), actorType: "USER", actorUserId: ctx.userId, actorRole: "SUPER_ADMIN", resourceType: "tenant" });
  });

  it("shows the suspension and its reason to the platform", async () => {
    const ctx = await platformCtx();
    await db.tenant.update({ where: { id: tenantIdOf("B") }, data: { status: "SUSPENDED", suspendedAt: new Date("2026-09-20T10:00:00.000Z"), suspensionReason: "Licence renewal pending" } });
    const inspection = await inspectTenant(ctx, tenantIdOf("B"));
    expect(inspection.tenant).toMatchObject({ status: "SUSPENDED", suspendedAt: "2026-09-20T10:00:00.000Z", suspensionReason: "Licence renewal pending" });
    expect(inspection.restaurant).toMatchObject({ timezone: "America/New_York", currencyCode: "USD" });
  });

  it("an unknown or malformed tenant id is NOT_FOUND and is not audited", async () => {
    const ctx = await platformCtx();
    const before = await db.auditLog.count({ where: { action: "platform.tenant_inspected" } });
    await expect(inspectTenant(ctx, RANDOM_UUID)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(inspectTenant(ctx, "not-a-uuid")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.auditLog.count({ where: { action: "platform.tenant_inspected" } })).toBe(before);
  });
});

describe("LD-ADM-01 platform dashboard", () => {
  it("counts active and suspended tenants and lists the newest tenants", async () => {
    const ctx = await platformCtx();
    await db.tenant.update({ where: { id: tenantIdOf("B") }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: "Dashboard test" } });
    const dashboard = await getPlatformDashboard(ctx);
    const total = PAGER_COUNT + 2;
    expect(dashboard.tenantCounts).toEqual({ active: total - 1, suspended: 1 });
    const newest = await db.tenant.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10, select: { id: true } });
    expect(dashboard.recentTenants.map((t) => t.id)).toEqual(newest.map((t) => t.id));
    expect(Object.keys(dashboard.recentTenants[0]).sort()).toEqual(["createdAt", "id", "name", "slug", "status"]);
  });

  it("recent platform audit contains platform and lifecycle events only — never tenant operational events", async () => {
    const ctx = await platformCtx();
    const { recentPlatformAudit } = await getPlatformDashboard(ctx);
    expect(recentPlatformAudit.length).toBeGreaterThan(0);
    for (const row of recentPlatformAudit) {
      expect(row.tenantId === null || /^(tenant|tenant_admin|platform)\./.test(row.action), row.action).toBe(true);
    }
    expect(recentPlatformAudit.map((r) => r.action)).not.toEqual(expect.arrayContaining(["staff.invited"]));
    expect(recentPlatformAudit.map((r) => r.action)).not.toEqual(expect.arrayContaining(["day_close.performed"]));
    const created = recentPlatformAudit.find((r) => r.action === "tenant.created" && r.tenantId === tenantIdOf("B"));
    expect(created?.tenantName).toBe("Harbour Grill");

    // Without platform:audit:read the audit list is empty (defence in depth).
    const readOnly = { ...ctx, permissions: new Set(["platform:tenant:read"]) } as PlatformContext;
    expect((await getPlatformDashboard(readOnly)).recentPlatformAudit).toEqual([]);
  });
});

describe("LD-ADM-02 tenant list", () => {
  const names = (page: { items: Array<{ name: string }> }) => page.items.map((t) => t.name);

  it("pages through tenants by name with an opaque cursor", async () => {
    const ctx = await platformCtx();
    const first = await listTenantsForPlatform(ctx, { q: "pager" });
    expect(names(first)).toEqual(Array.from({ length: 25 }, (_, i) => pagerName(i + 1)));
    expect(first.nextCursor).toEqual(expect.any(String));
    const second = await listTenantsForPlatform(ctx, { q: "pager", cursor: first.nextCursor! });
    expect(names(second)).toEqual(Array.from({ length: 5 }, (_, i) => pagerName(i + 26)));
    expect(second.nextCursor).toBeNull();

    const all = await listTenantsForPlatform(ctx, { limit: 100 });
    expect(all.items).toHaveLength(PAGER_COUNT + 2);
    expect(names(all)).toEqual([...names(all)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    const spice = all.items.find((t) => t.slug === "spice-route")!;
    expect(Object.keys(spice).sort()).toEqual(["createdAt", "id", "memberCount", "name", "slug", "status", "websitePublished"]);
    expect(spice).toMatchObject({ websitePublished: true, memberCount: await db.userTenant.count({ where: { tenantId: tenantIdOf("A"), status: "ACTIVE" } }) });
  });

  it("sorts newest first and walks every page without gaps or repeats", async () => {
    const ctx = await platformCtx();
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 10; guard++) {
      const page = await listTenantsForPlatform(ctx, { sort: "createdAt", limit: 7, ...(cursor ? { cursor } : {}) });
      seen.push(...page.items.map((t) => t.id));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    const expected = await db.tenant.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } });
    expect(seen).toEqual(expected.map((t) => t.id));
  });

  it("filters by status and searches name and slug case-insensitively with LIKE wildcards escaped", async () => {
    const ctx = await platformCtx();
    await db.tenant.update({ where: { slug: pagerSlug(5) }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: "Filter test" } });
    expect(names(await listTenantsForPlatform(ctx, { status: "SUSPENDED" }))).toEqual([pagerName(5)]);
    expect((await listTenantsForPlatform(ctx, { status: "ACTIVE", q: "pager", limit: 100 })).items).toHaveLength(PAGER_COUNT - 1);
    expect(names(await listTenantsForPlatform(ctx, { q: "PAGER 1" }))).toEqual(Array.from({ length: 10 }, (_, i) => pagerName(i + 10)));
    expect(names(await listTenantsForPlatform(ctx, { q: "harbour-gr" }))).toEqual(["Harbour Grill"]);
    expect((await listTenantsForPlatform(ctx, { q: "%" })).items).toEqual([]);
    expect((await listTenantsForPlatform(ctx, { q: "_" })).items).toEqual([]);
    expect((await listTenantsForPlatform(ctx, { q: "pager\\" })).items).toEqual([]);
  });

  it("a row changing status between pages neither shifts nor skips the next page", async () => {
    const ctx = await platformCtx();
    const first = await listTenantsForPlatform(ctx, { q: "pager", status: "ACTIVE", limit: 5 });
    expect(names(first)).toEqual([1, 2, 3, 4, 5].map(pagerName));
    await db.tenant.update({ where: { slug: pagerSlug(5) }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: "Boundary test" } });
    const second = await listTenantsForPlatform(ctx, { q: "pager", status: "ACTIVE", limit: 5, cursor: first.nextCursor! });
    expect(names(second)).toEqual([6, 7, 8, 9, 10].map(pagerName));
  });

  it("rejects invalid queries and cursors with VALIDATION_ERROR", async () => {
    const ctx = await platformCtx();
    const byName = await listTenantsForPlatform(ctx, { limit: 1 });
    const invalid: Array<Record<string, unknown>> = [
      { q: "x".repeat(81) },
      { status: "DELETED" },
      { sort: "revenue" },
      { limit: 0 },
      { limit: 101 },
      { cursor: "not-a-cursor" },
      { cursor: byName.nextCursor, sort: "createdAt" },
      { cursor: Buffer.from(JSON.stringify({ s: "name", id: RANDOM_UUID })).toString("base64url") },
      { tenantId: tenantIdOf("A") },
    ];
    for (const input of invalid) {
      await expect(listTenantsForPlatform(ctx, input as never), JSON.stringify(input)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });

  it("builds the query from Next.js searchParams, ignoring unrelated keys", () => {
    expect(tenantListQueryFromSearchParams({ q: ["spice", "harbour"], status: "ACTIVE", utm_source: "mail", limit: "", cursor: undefined })).toEqual({ q: "spice", status: "ACTIVE" });
  });
});
