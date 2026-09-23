import type { KotStatus } from "@prisma/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getKitchenSectionsAction, getKOTTicketsAction, updateKOTStatusAction } from "@/app/restaurant/kds/actions";
import KdsPage from "@/app/restaurant/kds/page";
import KitchenPage from "@/app/restaurant/kitchen/page";
import { TENANTS } from "@/prisma/seed-data/tenants";
import { testDb } from "../setup/db";
import { asAnonymous, asPlatformAdmin, asSeedUser, invokeAction, invokeLoader, seedOnce, seeded, tenantIdOf, type TenantKey } from "../helpers/actors";

// S1-P04-T007 kitchen/KOT retrofit: tenant from context only, kot:* permissions, sequential transitions (security.md §3.4),
// kitchen projection (SC-RBAC-07). Seeded orders: o2 ACCEPTED (KOT QUEUED), o3 PREPARING, o4 READY, o5 COMPLETED (SERVED),
// o6 CANCELLED (KOT CANCELLED).
const db = testDb();
const ACTIVE: KotStatus[] = ["QUEUED", "PREPARING", "READY"];
const RANDOM_UUID = "0b7a4a52-4f53-4c9e-9d6a-3f1f4c1d2e3a";

type KotSnapshot = { id: string; status: KotStatus; preparingAt: Date | null; readyAt: Date | null; servedAt: Date | null };
let seededKots: KotSnapshot[] = [];

beforeAll(seedOnce, 120_000);
beforeAll(async () => {
  seededKots = await db.kotTicket.findMany({ select: { id: true, status: true, preparingAt: true, readyAt: true, servedAt: true } });
});

// Tests that move seeded tickets put them back, so every test starts from the seeded states.
afterEach(async () => {
  const current = await db.kotTicket.findMany({ select: { id: true, status: true, preparingAt: true, readyAt: true, servedAt: true } });
  const byId = new Map(current.map((k) => [k.id, k]));
  for (const original of seededKots) {
    const now = byId.get(original.id);
    if (!now || JSON.stringify(now) === JSON.stringify(original)) continue;
    await db.kotTicket.update({
      where: { id: original.id },
      data: { status: original.status, preparingAt: original.preparingAt, readyAt: original.readyAt, servedAt: original.servedAt },
    });
  }
});

async function kotOf(tenant: TenantKey, orderKey: string) {
  return db.kotTicket.findFirstOrThrow({ where: { tenantId: tenantIdOf(tenant), orderId: seeded(tenant, `order:${orderKey}`) }, orderBy: { kotNumber: "asc" } });
}

function ok<T>(result: unknown): T {
  expect(result).toMatchObject({ ok: true });
  return (result as { ok: true; data: T }).data;
}

/** Every key in a JSON value, recursively. */
function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => [k, ...keysOf(v)]);
  return [];
}

describe("TI-036 kitchen board lists only the caller's tenant", () => {
  it("KITCHEN of Tenant A sees exactly Tenant A's active KOTs (count matches the database)", async () => {
    await asSeedUser("A", "KITCHEN");
    const tickets = ok<Array<{ id: string; status: KotStatus }>>(await invokeAction(getKOTTicketsAction));

    const expected = await db.kotTicket.findMany({ where: { tenantId: tenantIdOf("A"), status: { in: ACTIVE } }, select: { id: true } });
    expect(expected.length).toBeGreaterThan(0);
    expect(tickets.map((t) => t.id).sort()).toEqual(expected.map((k) => k.id).sort());

    const tenantBIds = new Set((await db.kotTicket.findMany({ where: { tenantId: tenantIdOf("B") }, select: { id: true } })).map((k) => k.id));
    expect(tenantBIds.size).toBeGreaterThan(0);
    expect(tickets.some((t) => tenantBIds.has(t.id))).toBe(false);
  });

  it("a status filter still returns only Tenant A rows", async () => {
    await asSeedUser("A", "KITCHEN");
    for (const status of ["SERVED", "CANCELLED", "QUEUED"] as const) {
      const tickets = ok<Array<{ id: string; status: KotStatus }>>(await invokeAction(getKOTTicketsAction, { status }));
      const expected = await db.kotTicket.count({ where: { tenantId: tenantIdOf("A"), status } });
      expect(tickets, status).toHaveLength(expected);
      expect(tickets.every((t) => t.status === status)).toBe(true);
    }
  });

  it("kitchen sections are Tenant A's only", async () => {
    await asSeedUser("A", "KITCHEN");
    const sections = ok<Array<{ id: string; name: string; code: string }>>(await invokeAction(getKitchenSectionsAction));
    expect(sections.map((s) => s.code).sort()).toEqual(TENANTS[0].sections.map((s) => s.code).sort());
  });

  it("TI-037 filtering by a Tenant B section id returns no tickets and no Tenant B data", async () => {
    await asSeedUser("A", "KITCHEN");
    const sectionB = await db.kitchenSection.findFirstOrThrow({ where: { tenantId: tenantIdOf("B") } });
    expect(await db.kotTicket.count({ where: { kitchenSectionId: sectionB.id } })).toBeGreaterThan(0);
    expect(await invokeAction(getKOTTicketsAction, { kitchenSectionId: sectionB.id })).toEqual({ ok: true, data: [] });
    expect(await invokeAction(getKOTTicketsAction, { kitchenSectionId: "not-a-uuid" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("ADV-001 a tenantId key in the filters is rejected (422), never honoured", async () => {
    await asSeedUser("A", "KITCHEN");
    const result = await invokeAction(getKOTTicketsAction, { tenantId: tenantIdOf("B") } as never);
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("ADV-024 signed-out callers and platform admins get no kitchen data", async () => {
    asAnonymous();
    expect(await invokeAction(getKOTTicketsAction)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect(await invokeAction(getKitchenSectionsAction)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    await asPlatformAdmin();
    expect(await invokeAction(getKOTTicketsAction)).toMatchObject({ ok: false, error: { code: "NO_ACTIVE_MEMBERSHIP" } });
  });

  it("both kitchen pages run the tenant page guard before rendering", async () => {
    // Only the redirect paths are asserted: rendering the client board needs the Next.js JSX runtime.
    asAnonymous();
    expect(await invokeLoader(KdsPage)).toEqual({ redirect: "/sign-in" });
    expect(await invokeLoader(KitchenPage)).toEqual({ redirect: "/sign-in" });
    await asPlatformAdmin();
    for (const page of [KdsPage, KitchenPage]) {
      expect(await invokeLoader(page)).toEqual({ redirect: expect.stringMatching(/^\/account\/no-access/) });
    }
  });
});

describe("TC-RBAC-011 (kitchen part) KOT payload is the kitchen projection", () => {
  it("contains no customer name/phone/email and no amount fields for any KOT", async () => {
    await asSeedUser("A", "KITCHEN");
    const all: unknown[] = [];
    for (const status of ["QUEUED", "PREPARING", "READY", "SERVED", "CANCELLED"] as const) {
      all.push(...ok<unknown[]>(await invokeAction(getKOTTicketsAction, { status })));
    }
    expect(all).toHaveLength(await db.kotTicket.count({ where: { tenantId: tenantIdOf("A") } }));

    const forbiddenKey = /customer|phone|email|name$|amount|price|total|subtotal|tax|paid|refund|payment|currency|discount/i;
    const allowedKeys = new Set(["name"]); // kitchen section name
    const leaked = [...new Set(keysOf(all))].filter((k) => forbiddenKey.test(k) && !allowedKeys.has(k));
    expect(leaked).toEqual([]);

    // Seeded orders o2/o5/o7 have customers: none of their personal data may appear anywhere in the payload.
    const text = JSON.stringify(all);
    const customers = await db.customer.findMany({ where: { tenantId: tenantIdOf("A") } });
    expect(customers.length).toBeGreaterThan(0);
    for (const customer of customers) {
      for (const value of [customer.fullName, customer.phoneE164, customer.email].filter((v): v is string => Boolean(v))) {
        expect(text, `customer data "${value}" leaked`).not.toContain(value);
      }
    }
    // The kitchen card still has what it needs.
    const sample = all[0] as Record<string, unknown>;
    for (const key of ["kotNumber", "status", "priority", "orderNumber", "orderTypeSnapshot", "tableLabelSnapshot", "notesSnapshot", "queuedAt", "kitchenSection", "items"]) {
      expect(sample, key).toHaveProperty(key);
    }
    expect((sample.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      quantity: expect.any(Number),
      itemLabelSnapshot: expect.any(String),
    });
  });
});

describe("SA-KOT-01 transitions (security.md §3.4, TC-KOT-003/004 interim)", () => {
  it("KITCHEN moves QUEUED → PREPARING → READY, stamping times and auditing each step", async () => {
    const { userId } = await asSeedUser("A", "KITCHEN");
    const kot = await kotOf("A", "o2");
    expect(kot.status).toBe("QUEUED");

    const preparing = ok<{ id: string; status: KotStatus; preparingAt: string | null }>(
      await invokeAction(updateKOTStatusAction, { kotId: kot.id, toStatus: "PREPARING" }),
    );
    expect(preparing).toMatchObject({ id: kot.id, status: "PREPARING", preparingAt: expect.any(String) });
    const ready = ok<{ status: KotStatus; readyAt: string | null }>(await invokeAction(updateKOTStatusAction, { kotId: kot.id, toStatus: "READY" }));
    expect(ready).toMatchObject({ status: "READY", readyAt: expect.any(String) });

    const row = await db.kotTicket.findUniqueOrThrow({ where: { id: kot.id } });
    expect(row).toMatchObject({ status: "READY", preparingAt: expect.any(Date), readyAt: expect.any(Date), servedAt: null });

    const audits = await db.auditLog.findMany({ where: { action: "kot.status_changed", resourceId: kot.id }, orderBy: { createdAt: "asc" } });
    expect(audits).toHaveLength(2);
    expect(audits.map((a) => [a.beforeState, a.afterState])).toEqual([
      [{ status: "QUEUED" }, { status: "PREPARING" }],
      [{ status: "PREPARING" }, { status: "READY" }],
    ]);
    for (const a of audits) {
      expect(a).toMatchObject({ tenantId: tenantIdOf("A"), actorType: "USER", actorUserId: userId, actorRole: "KITCHEN", resourceType: "kot_ticket" });
    }
  });

  it("QUEUED → READY and other skips or reversals are 409 INVALID_TRANSITION and change nothing", async () => {
    await asSeedUser("A", "KITCHEN");
    const auditsBefore = await db.auditLog.count({ where: { action: "kot.status_changed", tenantId: tenantIdOf("A") } });
    const cases: Array<[string, KotStatus]> = [
      ["o2", "READY"], // QUEUED → READY (the baseline table allowed this)
      ["o2", "SERVED"], // QUEUED → SERVED
      ["o3", "QUEUED"], // PREPARING → QUEUED
      ["o3", "SERVED"], // PREPARING → SERVED
      ["o5", "PREPARING"], // SERVED → PREPARING
      ["o6", "PREPARING"], // CANCELLED → PREPARING
      ["o2", "CANCELLED"], // cancellation happens only through the order
    ];
    for (const [orderKey, toStatus] of cases) {
      const kot = await kotOf("A", orderKey);
      const result = await invokeAction(updateKOTStatusAction, { kotId: kot.id, toStatus });
      expect(result, `${kot.status} → ${toStatus}`).toMatchObject({ ok: false, error: { code: "INVALID_TRANSITION" } });
      expect((await db.kotTicket.findUniqueOrThrow({ where: { id: kot.id } })).status).toBe(kot.status);
    }
    expect(await db.auditLog.count({ where: { action: "kot.status_changed", tenantId: tenantIdOf("A") } })).toBe(auditsBefore);
  });

  it("repeating the current status is a no-op (no timestamp change, no audit)", async () => {
    await asSeedUser("A", "KITCHEN");
    const kot = await kotOf("A", "o3");
    const auditsBefore = await db.auditLog.count({ where: { action: "kot.status_changed", resourceId: kot.id } });
    const result = ok<{ status: KotStatus }>(await invokeAction(updateKOTStatusAction, { kotId: kot.id, toStatus: "PREPARING" }));
    expect(result.status).toBe("PREPARING");
    expect(await db.kotTicket.findUniqueOrThrow({ where: { id: kot.id } })).toMatchObject({ status: "PREPARING", preparingAt: kot.preparingAt });
    expect(await db.auditLog.count({ where: { action: "kot.status_changed", resourceId: kot.id } })).toBe(auditsBefore);
  });

  it("WAITER cannot start or ready a KOT (403 FORBIDDEN) but can serve READY → SERVED", async () => {
    const { userId } = await asSeedUser("A", "WAITER");
    const queued = await kotOf("A", "o2");
    const preparing = await kotOf("A", "o3");
    expect(await invokeAction(updateKOTStatusAction, { kotId: queued.id, toStatus: "PREPARING" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await invokeAction(updateKOTStatusAction, { kotId: preparing.id, toStatus: "READY" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect((await db.kotTicket.findUniqueOrThrow({ where: { id: queued.id } })).status).toBe("QUEUED");
    expect((await db.kotTicket.findUniqueOrThrow({ where: { id: preparing.id } })).status).toBe("PREPARING");

    const ready = await kotOf("A", "o4");
    expect(ready.status).toBe("READY");
    const served = ok<{ status: KotStatus; servedAt: string | null }>(await invokeAction(updateKOTStatusAction, { kotId: ready.id, toStatus: "SERVED" }));
    expect(served).toMatchObject({ status: "SERVED", servedAt: expect.any(String) });
    expect(await db.auditLog.count({ where: { action: "kot.status_changed", resourceId: ready.id, actorUserId: userId, actorRole: "WAITER" } })).toBe(1);
  });

  it("CASHIER cannot start a KOT; the permission is checked before the ticket is looked up", async () => {
    await asSeedUser("A", "CASHIER");
    const queued = await kotOf("A", "o2");
    expect(await invokeAction(updateKOTStatusAction, { kotId: queued.id, toStatus: "PREPARING" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    // A random id gets the same 403, not a 404: no existence oracle for callers without the permission.
    expect(await invokeAction(updateKOTStatusAction, { kotId: RANDOM_UUID, toStatus: "PREPARING" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe("TI-038 / ADV-002 other tenants' KOTs are not found", () => {
  it("Tenant A kitchen updating a Tenant B KOT id gets 404 identical to a random UUID; Tenant B's ticket is unchanged", async () => {
    await asSeedUser("A", "KITCHEN");
    const kotB = await kotOf("B", "o2");
    expect(kotB.status).toBe("QUEUED");

    const foreign = await invokeAction(updateKOTStatusAction, { kotId: kotB.id, toStatus: "PREPARING" });
    const random = await invokeAction(updateKOTStatusAction, { kotId: RANDOM_UUID, toStatus: "PREPARING" });
    expect(foreign).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(random).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const strip = (r: unknown) => ({ ...(r as { error: Record<string, unknown> }).error, requestId: undefined });
    expect(strip(foreign)).toEqual(strip(random));

    const serveForeign = await invokeAction(updateKOTStatusAction, { kotId: (await kotOf("B", "o4")).id, toStatus: "SERVED" });
    expect(serveForeign).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });

    expect((await db.kotTicket.findUniqueOrThrow({ where: { id: kotB.id } })).status).toBe("QUEUED");
    expect(await db.auditLog.count({ where: { action: "kot.status_changed", resourceId: kotB.id } })).toBe(0);
  });

  it("ADV-001 a tenantId key in the update body is rejected (422) and nothing changes", async () => {
    await asSeedUser("A", "KITCHEN");
    const kotB = await kotOf("B", "o2");
    const kotA = await kotOf("A", "o2");
    for (const kotId of [kotA.id, kotB.id]) {
      const result = await invokeAction(updateKOTStatusAction, { kotId, toStatus: "PREPARING", tenantId: tenantIdOf("B") } as never);
      expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", fieldErrors: { _: [expect.stringContaining("tenantId")] } } });
    }
    expect((await db.kotTicket.findUniqueOrThrow({ where: { id: kotA.id } })).status).toBe("QUEUED");
    expect((await db.kotTicket.findUniqueOrThrow({ where: { id: kotB.id } })).status).toBe("QUEUED");
  });

  it("malformed ids are 422, never a database error", async () => {
    await asSeedUser("A", "KITCHEN");
    expect(await invokeAction(updateKOTStatusAction, { kotId: "' OR 1=1 --", toStatus: "PREPARING" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(await invokeAction(updateKOTStatusAction, { kotId: RANDOM_UUID, toStatus: "COOKING" } as never)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });
});
