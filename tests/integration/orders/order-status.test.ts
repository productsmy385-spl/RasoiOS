import type { TenantRole } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { recordPaymentAction } from "@/app/restaurant/transactions/actions";
import { createStaffOrderAction, updateOrderStatusAction } from "@/app/restaurant/orders/actions";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf, expectSameNotFound, orderState, RANDOM_UUID, xminOf } from "./helpers";

// S1-P04-T007 — SA-ORD-02 / SA-ORD-03 (interim updateOrderStatusAction): `order:read` first, then the permission for
// the requested target (security.md §3.4); row-29 cancel rule; reason required; optimistic concurrency on version;
// audit in the same transaction. Tests transition their own orders; seeded orders are only used for denied attempts.
const db = testDb();
const A = tenantIdOf("A");
const PANEER_A = seeded("A", "item:paneer-tikka");

beforeAll(seedOnce, 120_000);

async function transition(role: TenantRole, orderId: string, status: string, extra: Record<string, unknown> = {}) {
  await asSeedUser("A", role);
  return invokeAction(updateOrderStatusAction, { orderId, status, ...extra } as never);
}

async function newOrder(): Promise<string> {
  await asSeedUser("A", "CASHIER");
  // Paneer Tikka has variants, so a line must name one (ADR-010 §2). "Full" is 280.00 @ 5 % → 294.00.
  const full = await db.menuItemVariant.findFirstOrThrow({ where: { tenantId: A, menuItemId: PANEER_A, name: "Full" }, select: { id: true } });
  const input = { idempotencyKey: randomUUID(), orderType: "TAKEAWAY" as const, items: [{ menuItemId: PANEER_A, variantId: full.id, quantity: 1 }] };
  return dataOf(await invokeAction(createStaffOrderAction, input)).order.id;
}

/** Records full payment of the order (paneer 280.00 + 5% = 294.00) as the cashier. */
async function payInFull(orderId: string) {
  await asSeedUser("A", "CASHIER");
  return dataOf(await invokeAction(recordPaymentAction, { orderId, idempotencyKey: randomUUID(), method: "CARD", amount: "294.00" }));
}

/** Marks every kitchen ticket of the order READY in the database, without touching the order's own status. */
async function kitchenReady(orderId: string): Promise<void> {
  await db.kotTicket.updateMany({ where: { tenantId: A, orderId }, data: { status: "READY", readyAt: new Date() } });
}

async function acceptedOrder(): Promise<string> {
  const id = await newOrder();
  dataOf(await transition("CASHIER", id, "ACCEPTED"));
  return id;
}

describe("SA-ORD-02 status transitions (TC-ORDER-005, TC-RBAC-126…128)", () => {
  it("CASHIER accepts a NEW order: version + 1, acceptedAt, order.status_changed audited in the same transaction", async () => {
    const id = await newOrder();
    // security.md §3.4: a NEW order has no kitchen ticket; acceptance generates it.
    expect(await db.kotTicket.count({ where: { tenantId: A, orderId: id } })).toBe(0);
    const cashier = await asSeedUser("A", "CASHIER");
    const result = dataOf(await invokeAction(updateOrderStatusAction, { orderId: id, status: "ACCEPTED" }));
    expect(result).toEqual({ orderId: id, status: "ACCEPTED", version: 1 });

    const row = await db.order.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ status: "ACCEPTED", version: 1, tenantId: A });
    expect(row.acceptedAt).toBeInstanceOf(Date);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "order.status_changed", resourceId: id } });
    expect(audit).toMatchObject({ tenantId: A, actorUserId: cashier.userId, actorRole: "CASHIER", resourceType: "order" });
    expect(audit.beforeState).toMatchObject({ status: "NEW", version: 0 });
    expect(audit.afterState).toMatchObject({ status: "ACCEPTED", version: 1 });
    expect(await xminOf("audit_logs", audit.id)).toBe(await xminOf("orders", id));
    expect(await db.kotTicket.count({ where: { tenantId: A, orderId: id } })).toBeGreaterThan(0);
  });

  it("each step needs its own permission: KITCHEN prepares and readies, CASHIER/WAITER complete", async () => {
    const id = await acceptedOrder();
    expect(errorOf(await transition("CASHIER", id, "PREPARING")).code).toBe("FORBIDDEN");
    expect(errorOf(await transition("WAITER", id, "PREPARING")).code).toBe("FORBIDDEN");
    expect(dataOf(await transition("KITCHEN", id, "PREPARING")).status).toBe("PREPARING");
    // §3.4: the order follows the kitchen — READY is refused while a ticket is still being prepared.
    expect(errorOf(await transition("KITCHEN", id, "READY")).code).toBe("INVALID_TRANSITION");
    await kitchenReady(id);
    expect(dataOf(await transition("KITCHEN", id, "READY")).status).toBe("READY");
    expect(errorOf(await transition("KITCHEN", id, "COMPLETED")).code).toBe("FORBIDDEN");
    // BR-ORD-06 / Q-007 A: an unpaid order cannot be completed (422 PAYMENT_REQUIRED) and stays READY.
    const unpaid = errorOf(await transition("WAITER", id, "COMPLETED"));
    expect(unpaid.code).toBe("PAYMENT_REQUIRED");
    expect((await orderState(id)).status).toBe("READY");
    expect((await payInFull(id)).paymentStatus).toBe("PAID"); // the payment bumps the version (ledger totals) but not the status
    expect(dataOf(await transition("WAITER", id, "COMPLETED"))).toEqual({ orderId: id, status: "COMPLETED", version: 5 });

    const row = await db.order.findUniqueOrThrow({ where: { id } });
    expect([row.acceptedAt, row.preparingAt, row.readyAt, row.completedAt].every((d) => d instanceof Date)).toBe(true);
    expect(await db.auditLog.count({ where: { action: "order.status_changed", resourceId: id } })).toBe(4);
  });

  it("TC-RBAC-126: KITCHEN cannot accept — 403 FORBIDDEN before any lookup, and nothing changes", async () => {
    const id = await newOrder();
    const before = await orderState(id);
    expect(errorOf(await transition("KITCHEN", id, "ACCEPTED")).code).toBe("FORBIDDEN");
    expect(errorOf(await transition("KITCHEN", RANDOM_UUID, "ACCEPTED")).code).toBe("FORBIDDEN");
    expect(await orderState(id)).toEqual(before);
  });

  it("invalid transitions are 409 INVALID_TRANSITION and change nothing (security.md §3.4)", async () => {
    const id = await newOrder();
    const before = await orderState(id);
    expect(errorOf(await transition("MANAGER", id, "READY")).code).toBe("INVALID_TRANSITION");
    expect(errorOf(await transition("MANAGER", id, "COMPLETED")).code).toBe("INVALID_TRANSITION");
    expect(await orderState(id)).toEqual(before);

    const seededCases: Array<[string, string, Record<string, unknown>]> = [
      ["order:o5", "CANCELLED", { reason: "Customer asked to cancel" }], // COMPLETED is terminal
      ["order:o6", "ACCEPTED", {}], // CANCELLED is terminal
      ["order:o7", "COMPLETED", {}], // REFUNDED is terminal
    ];
    for (const [label, status, extra] of seededCases) {
      const orderId = seeded("A", label);
      const state = await orderState(orderId);
      expect(errorOf(await transition("MANAGER", orderId, status, extra)).code, `${label} → ${status}`).toBe("INVALID_TRANSITION");
      expect(await orderState(orderId)).toEqual(state);
    }
  });

  it("rejects NEW/REFUNDED/unknown targets, malformed ids and any tenantId in the input with 422", async () => {
    const id = await newOrder();
    for (const status of ["NEW", "REFUNDED", "SERVED", ""]) {
      expect(errorOf(await transition("MANAGER", id, status)).code, status).toBe("VALIDATION_ERROR");
    }
    expect(errorOf(await transition("MANAGER", "not-a-uuid", "ACCEPTED")).code).toBe("VALIDATION_ERROR");
    const withTenant = errorOf(await transition("MANAGER", id, "ACCEPTED", { tenantId: A }));
    expect(withTenant.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(withTenant.fieldErrors)).toContain("tenantId");
    expect((await orderState(id)).status).toBe("NEW");
  });

  it("repeating the same target is a no-op success (api.md SA-ORD-02 idempotency): no version bump, no second audit", async () => {
    const id = await acceptedOrder();
    expect(dataOf(await transition("CASHIER", id, "ACCEPTED"))).toEqual({ orderId: id, status: "ACCEPTED", version: 1 });
    expect(await db.auditLog.count({ where: { action: "order.status_changed", resourceId: id } })).toBe(1);
    expect(await db.kotTicket.count({ where: { tenantId: A, orderId: id } })).toBe(1);
  });

  it("TC-ORDER-009: two concurrent transitions from the same version — one succeeds, the other is 409 CONFLICT", async () => {
    const id = await acceptedOrder();
    await asSeedUser("A", "MANAGER");
    const results = await Promise.all([
      invokeAction(updateOrderStatusAction, { orderId: id, status: "PREPARING", expectedVersion: 1 }),
      invokeAction(updateOrderStatusAction, { orderId: id, status: "CANCELLED", reason: "Guest left", expectedVersion: 1 }),
    ]);
    const ok = results.filter((r) => "ok" in r && r.ok);
    const failed = results.filter((r) => "ok" in r && !r.ok).map((r) => errorOf(r).code);
    expect(ok).toHaveLength(1);
    expect(failed).toEqual(["CONFLICT"]);
    expect((await orderState(id)).version).toBe(2);
    expect(await db.auditLog.count({ where: { action: { in: ["order.status_changed", "order.cancelled"] }, resourceId: id } })).toBe(2);
  });

  it("a stale expectedVersion is 409 CONFLICT (SC-API-03)", async () => {
    const id = await newOrder();
    const before = await orderState(id);
    expect(errorOf(await transition("CASHIER", id, "ACCEPTED", { expectedVersion: 3 })).code).toBe("CONFLICT");
    expect(await orderState(id)).toEqual(before);
    expect(dataOf(await transition("CASHIER", id, "ACCEPTED", { expectedVersion: 0 })).version).toBe(1);
  });
});

describe("SA-ORD-03 cancellation (TC-ORDER-007, TC-RBAC-129, security.md §3.3 row 29)", () => {
  it("WAITER cancels a NEW order with a reason; order.cancelled carries the reason in the same transaction", async () => {
    const id = await newOrder();
    const waiter = await asSeedUser("A", "WAITER");
    const result = dataOf(await invokeAction(updateOrderStatusAction, { orderId: id, status: "CANCELLED", reason: "  Guest changed their mind  " }));
    expect(result).toEqual({ orderId: id, status: "CANCELLED", version: 1 });

    const row = await db.order.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ status: "CANCELLED", cancelReason: "Guest changed their mind", cancelledByUserId: waiter.userId });
    expect(row.cancelledAt).toBeInstanceOf(Date);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "order.cancelled", resourceId: id } });
    expect(audit).toMatchObject({ tenantId: A, actorUserId: waiter.userId, actorRole: "WAITER", reason: "Guest changed their mind" });
    expect(await xminOf("audit_logs", audit.id)).toBe(await xminOf("orders", id));
  });

  it("Q-008 B: MANAGER and TENANT_ADMIN cancel PREPARING and READY orders; CASHIER and WAITER get 403", async () => {
    const preparing = await acceptedOrder();
    dataOf(await transition("KITCHEN", preparing, "PREPARING"));
    const ready = await acceptedOrder();
    dataOf(await transition("KITCHEN", ready, "PREPARING"));
    await kitchenReady(ready);
    dataOf(await transition("KITCHEN", ready, "READY"));

    for (const id of [preparing, ready]) {
      const before = await orderState(id);
      for (const role of ["CASHIER", "WAITER"] as const) {
        expect(errorOf(await transition(role, id, "CANCELLED", { reason: "Guest walked out" })).code, role).toBe("FORBIDDEN");
      }
      expect(await orderState(id)).toEqual(before);
    }
    expect(dataOf(await transition("MANAGER", preparing, "CANCELLED", { reason: "Guest walked out" })).status).toBe("CANCELLED");
    expect(dataOf(await transition("TENANT_ADMIN", ready, "CANCELLED", { reason: "Guest walked out" })).status).toBe("CANCELLED");
    expect(await db.auditLog.count({ where: { action: "order.cancelled", resourceId: { in: [preparing, ready] } } })).toBe(2);
  });

  it("TC-ORDER-007: cancelling is blocked while money is held (409 REFUND_REQUIRED) and nothing changes", async () => {
    const id = await newOrder();
    await asSeedUser("A", "CASHIER");
    dataOf(await invokeAction(recordPaymentAction, { orderId: id, idempotencyKey: randomUUID(), method: "CARD", amount: "100.00" }));
    const before = await orderState(id);
    expect(errorOf(await transition("MANAGER", id, "CANCELLED", { reason: "Guest walked out" })).code).toBe("REFUND_REQUIRED");
    expect(await orderState(id)).toEqual(before);
    expect(await db.auditLog.count({ where: { action: "order.cancelled", resourceId: id } })).toBe(0);
  });

  it("a reason is required: missing or shorter than 5 characters is 422 and nothing changes", async () => {
    const id = await newOrder();
    const before = await orderState(id);
    for (const extra of [{}, { reason: "" }, { reason: "   " }, { reason: "no" }]) {
      const error = errorOf(await transition("CASHIER", id, "CANCELLED", extra));
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.fieldErrors?.reason?.length).toBeGreaterThan(0);
    }
    expect(errorOf(await transition("CASHIER", id, "CANCELLED", { reason: "x".repeat(281) })).code).toBe("VALIDATION_ERROR");
    expect(await orderState(id)).toEqual(before);
  });

  it("CASHIER and WAITER cannot cancel an ACCEPTED order (403); MANAGER and TENANT_ADMIN can", async () => {
    const id = await acceptedOrder();
    const before = await orderState(id);
    expect(errorOf(await transition("WAITER", id, "CANCELLED", { reason: "Guest left early" })).code).toBe("FORBIDDEN");
    expect(errorOf(await transition("CASHIER", id, "CANCELLED", { reason: "Guest left early" })).code).toBe("FORBIDDEN");
    expect(await orderState(id)).toEqual(before);

    const manager = await asSeedUser("A", "MANAGER");
    expect(dataOf(await invokeAction(updateOrderStatusAction, { orderId: id, status: "CANCELLED", reason: "Guest left early" })).status).toBe("CANCELLED");
    const row = await db.order.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ status: "CANCELLED", cancelReason: "Guest left early", cancelledByUserId: manager.userId, version: 2 });

    const second = await acceptedOrder();
    expect(dataOf(await transition("TENANT_ADMIN", second, "CANCELLED", { reason: "Kitchen out of paneer" })).status).toBe("CANCELLED");
  });

  it("KITCHEN has no order:cancel (403 FORBIDDEN)", async () => {
    const id = await newOrder();
    const before = await orderState(id);
    expect(errorOf(await transition("KITCHEN", id, "CANCELLED", { reason: "Out of stock" })).code).toBe("FORBIDDEN");
    expect(await orderState(id)).toEqual(before);
  });
});

describe("TI-025 / TI-026 / ADV-002 Tenant B orders are invisible to Tenant A", () => {
  it("accepting, moving or cancelling a Tenant B order is NOT_FOUND exactly like a random UUID, and Tenant B is unchanged", async () => {
    const cases: Array<[string, string, Record<string, unknown>]> = [
      ["order:o1", "ACCEPTED", {}], // NEW
      ["order:o2", "PREPARING", {}], // ACCEPTED
      ["order:o3", "READY", {}], // PREPARING
      ["order:o4", "COMPLETED", {}], // READY
      ["order:o1", "CANCELLED", { reason: "Probing another tenant" }],
      ["order:o2", "CANCELLED", { reason: "Probing another tenant" }],
    ];
    const bOrderIds = [...new Set(cases.map(([label]) => seeded("B", label)))];
    const before = await Promise.all(bOrderIds.map(orderState));
    const auditsBefore = await db.auditLog.count({ where: { resourceId: { in: bOrderIds } } });

    for (const [label, status, extra] of cases) {
      const foreign = await transition("MANAGER", seeded("B", label), status, extra);
      const random = await transition("MANAGER", RANDOM_UUID, status, extra);
      expectSameNotFound(foreign, random);
      expect(JSON.stringify(foreign)).not.toMatch(/Harbour|Sam Taylor|20260915/);
    }

    expect(await Promise.all(bOrderIds.map(orderState))).toEqual(before);
    expect(await db.auditLog.count({ where: { resourceId: { in: bOrderIds } } })).toBe(auditsBefore);
  });
});

describe("TC-ORDER-006 every requestable transition × every tenant role (security.md §3.3 + §3.4)", () => {
  // Expectations come from the spec fixture (tests/fixtures/rbac-matrix.json) and the row-29 rule, not from the code.
  const matrix: Array<{ permission: string; allow: Record<string, string> }> = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../fixtures/rbac-matrix.json"), "utf8"),
  );
  const holds = (role: TenantRole, permission: string) => matrix.find((r) => r.permission === permission)!.allow[role] !== "deny";
  const ROLES: TenantRole[] = ["TENANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"];
  const CASES: Array<{ from: "NEW" | "ACCEPTED" | "PREPARING" | "READY"; to: string; permission: string; managersOnly?: boolean }> = [
    { from: "NEW", to: "ACCEPTED", permission: "order:accept" },
    { from: "ACCEPTED", to: "PREPARING", permission: "order:kitchen_update" },
    { from: "PREPARING", to: "READY", permission: "order:kitchen_update" },
    { from: "READY", to: "COMPLETED", permission: "order:complete" },
    { from: "NEW", to: "CANCELLED", permission: "order:cancel" },
    { from: "ACCEPTED", to: "CANCELLED", permission: "order:cancel", managersOnly: true },
    { from: "PREPARING", to: "CANCELLED", permission: "order:cancel", managersOnly: true },
    { from: "READY", to: "CANCELLED", permission: "order:cancel", managersOnly: true },
  ];

  async function orderIn(state: "NEW" | "ACCEPTED" | "PREPARING" | "READY", paid: boolean, kitchenDone = false): Promise<string> {
    const id = state === "NEW" ? await newOrder() : await acceptedOrder();
    if (state === "PREPARING" || state === "READY") dataOf(await transition("KITCHEN", id, "PREPARING"));
    // The order only reaches READY once its tickets are ready (§3.4); `kitchenDone` also sets that up for the
    // PREPARING → READY row, where the test is about who may request the transition.
    if (state === "READY" || kitchenDone) await kitchenReady(id);
    if (state === "READY") dataOf(await transition("KITCHEN", id, "READY"));
    if (paid) await payInFull(id);
    return id;
  }

  for (const c of CASES) {
    it(`${c.from} → ${c.to}`, async () => {
      for (const role of ROLES) {
        const id = await orderIn(c.from, c.to === "COMPLETED", c.from === "PREPARING" && c.to === "READY");
        const allowed = holds(role, c.permission) && (!c.managersOnly || role === "TENANT_ADMIN" || role === "MANAGER");
        const result = await transition(role, id, c.to, c.to === "CANCELLED" ? { reason: "Role matrix check" } : {});
        if (allowed) expect(dataOf(result).status, `${role} ${c.from}→${c.to}`).toBe(c.to);
        else {
          expect(errorOf(result).code, `${role} ${c.from}→${c.to}`).toBe("FORBIDDEN");
          expect((await orderState(id)).status).toBe(c.from);
        }
      }
    }, 60_000);
  }
});
