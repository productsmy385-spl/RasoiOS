import { beforeAll, describe, expect, it, vi } from "vitest";
import AuditPage from "@/app/restaurant/audit/page";
import { diffFields } from "@/components/audit/audit-entry";
import { listTenantAudit, truncateIp } from "@/lib/data/audit";
import { requireTenant } from "@/lib/auth/guards";
import { testDb } from "../setup/db";
import { asSeedUser, invokeLoader, seedOnce, tenantIdOf } from "../helpers/actors";

// TC-AUDIT-005 — the tenant audit viewer (S1-P23-T002, LD-AUD-01, TI-050): a restaurant sees its own trail and
// nothing else, MANAGER is refused, platform rows never appear, and addresses are shown only as a /24 prefix.
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");

beforeAll(seedOnce, 120_000);

const searchParams = (params: Record<string, string> = {}) => ({ searchParams: Promise.resolve(params) });

/**
 * Text of a Server Component tree. Child components are not rendered here, so their props carry the words the user
 * would see (a PageHeader's title, an EmptyState's description); those count as text too.
 */
function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return "";
  return Object.values(props).map(textOf).join(" ");
}

describe("TC-AUDIT-005 tenant audit log", () => {
  it("returns only this tenant's rows, newest first, and never a platform row", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const ctx = await requireTenant("audit:read");
    const { items } = await listTenantAudit(ctx, { limit: 100 });
    expect(items.length).toBeGreaterThan(0);

    const ids = items.map((i) => i.id);
    expect(await db.auditLog.count({ where: { id: { in: ids }, OR: [{ tenantId: { not: A } }, { tenantId: null }] } })).toBe(0);

    const times = items.map((i) => Date.parse(i.createdAt));
    expect(times).toEqual([...times].sort((x, y) => y - x));

    // Tenant B has its own rows; none of them are here.
    expect(await db.auditLog.count({ where: { tenantId: B } })).toBeGreaterThan(0);
    // A platform row (tenant_id NULL) exists from the seed's bootstrap and stays out of the tenant trail.
    const platformRows = await db.auditLog.count({ where: { tenantId: null } });
    if (platformRows > 0) expect(items.every((i) => i.action.startsWith("platform.") === false)).toBe(true);
  });

  it("filters by action, resource type and date range, and pages with a cursor", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const ctx = await requireTenant("audit:read");

    const all = await listTenantAudit(ctx, { limit: 100 });
    const sample = all.items[0];
    const byAction = await listTenantAudit(ctx, { action: sample.action, limit: 100 });
    expect(byAction.items.every((i) => i.action === sample.action)).toBe(true);

    const byResource = await listTenantAudit(ctx, { resourceType: sample.resourceType, limit: 100 });
    expect(byResource.items.every((i) => i.resourceType === sample.resourceType)).toBe(true);

    const future = await listTenantAudit(ctx, { from: new Date("2099-01-01T00:00:00Z") });
    expect(future.items).toEqual([]);

    const firstPage = await listTenantAudit(ctx, { limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).toBeTruthy();
    const secondPage = await listTenantAudit(ctx, { limit: 2, cursor: firstPage.nextCursor! });
    expect(secondPage.items.map((i) => i.id)).not.toContain(firstPage.items[0].id);
  });

  it("shows an address only as a network prefix", () => {
    expect(truncateIp("203.0.113.47")).toBe("203.0.113.0/24");
    expect(truncateIp("2001:db8:1:2::1")).toBe("2001:db8:1::/48");
    expect(truncateIp(null)).toBeNull();
  });

  it("the diff lists only the fields that changed, with a word for each kind", () => {
    const changes = diffFields({ name: "Chai", price: "40.00", note: "hot" }, { name: "Masala Chai", price: "40.00", spice: "mild" });
    expect(changes.map((c) => [c.field, c.kind])).toEqual([
      ["name", "changed"],
      ["note", "removed"],
      ["spice", "added"],
    ]);
  });
});

describe("TC-AUDIT-005 the page itself", () => {
  it("renders the trail for TENANT_ADMIN and refuses every other role", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const page = await invokeLoader(AuditPage, searchParams());
    const text = textOf(page);
    expect(text).toContain("Audit log");
    expect(text).toContain("Asia/Kolkata");

    for (const role of ["MANAGER", "CASHIER", "KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      const denied = await invokeLoader(AuditPage, searchParams());
      expect(denied, role).toMatchObject({ redirect: "/account/forbidden" });
    }
  });

  it("ignores a tenantId in the query and reads only the filters it owns", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const page = await invokeLoader(AuditPage, searchParams({ tenantId: B, action: "order.created" }));
    const text = textOf(page);
    expect(text).not.toContain(B);
    expect(text).toContain("Audit log");
  });
});

describe("TC-AUDIT-007 request metadata on the trail", () => {
  it("records the address our proxy saw and the user agent, and ignores a spoofed chain when no proxy is trusted", async () => {
    const { actorState } = await import("../helpers/actor-state");
    await asSeedUser("A", "TENANT_ADMIN");
    actorState.headers.set("x-forwarded-for", "9.9.9.9, 203.0.113.9");
    actorState.headers.set("user-agent", `Mozilla/5.0 ${"x".repeat(400)}`);
    try {
      // With TRUSTED_PROXY_HOPS unset we can prove nothing, so no address is stored.
      const untrusted = await recordSomething();
      expect(untrusted.ipAddress).toBeNull();
      expect(untrusted.userAgent?.length).toBe(256);

      // With one trusted proxy, the right-most entry is ours and the client's claim is discarded.
      vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
      const trusted = await recordSomething();
      expect(trusted.ipAddress).toBe("203.0.113.9");
      expect(await db.auditLog.count({ where: { tenantId: A, ipAddress: "9.9.9.9" } })).toBe(0);

      // The viewer only ever shows the network prefix.
      const ctx = await requireTenant("audit:read");
      const { items } = await listTenantAudit(ctx, { action: "customer.created", limit: 5 });
      expect(items.some((i) => i.ipPrefix === "203.0.113.0/24")).toBe(true);
      expect(items.every((i) => i.ipPrefix !== "203.0.113.9")).toBe(true);
    } finally {
      vi.unstubAllEnvs();
      actorState.headers.delete("x-forwarded-for");
      actorState.headers.delete("user-agent");
    }
  });
});

/** Performs one audited write and returns the row it produced. */
async function recordSomething() {
  const { createCustomerAction } = await import("@/app/restaurant/customers/actions");
  const { invokeAction } = await import("../helpers/actors");
  const result = await invokeAction(createCustomerAction, { fullName: `Metadata ${Math.random().toString(36).slice(2, 8)}` } as never);
  if (!("ok" in result) || !result.ok) throw new Error(`expected the customer to be created, got ${JSON.stringify(result)}`);
  const row = await db.auditLog.findFirstOrThrow({ where: { action: "customer.created", resourceId: result.data.id } });
  await db.customer.delete({ where: { id: result.data.id } });
  return row;
}
