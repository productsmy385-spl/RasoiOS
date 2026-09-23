import { TENANT_ROLES } from "@/prisma/seed-data/tenants";
import { beforeAll, describe, expect, it } from "vitest";
import { getCustomersAction } from "@/app/restaurant/customers/actions";
import { getOrdersAction } from "@/app/restaurant/orders/actions";
import { testDb } from "../setup/db";
import { asAnonymous, asPlatformAdmin, asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf } from "./helpers";

// S1-P04-T007 — LD-ORD-01 / LD-CUS-01 (interim getOrdersAction `order:read`, getCustomersAction `customer:read`):
// Tenant A never sees a Tenant B row, KITCHEN gets the kitchen projection, and a tenantId in the input is 422.
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");

beforeAll(seedOnce, 120_000);

describe("LD-ORD-01 order list", () => {
  it("TC-QA-003 / TI-021: listing orders as Tenant A never returns a Tenant B row (checked against a direct database count)", async () => {
    const bCount = await db.order.count({ where: { tenantId: B } });
    expect(bCount).toBeGreaterThan(0); // the mirror tenant has orders, so a leak would be visible

    for (const role of TENANT_ROLES) {
      await asSeedUser("A", role);
      const { orders } = dataOf(await invokeAction(getOrdersAction));
      const ids = orders.map((o) => o.id);
      expect(ids.length, role).toBe(await db.order.count({ where: { tenantId: A } }));
      expect(await db.order.count({ where: { id: { in: ids }, tenantId: { not: A } } }), role).toBe(0);
      expect(ids).not.toContain(seeded("B", "order:o1"));
      expect(ids).toContain(seeded("A", "order:o1"));
    }
  });

  it("filters by status and search stay inside Tenant A (both tenants have a customer named Sam Taylor)", async () => {
    await asSeedUser("A", "CASHIER");
    const { orders: newOrders } = dataOf(await invokeAction(getOrdersAction, { status: "NEW" }));
    expect(newOrders.map((o) => o.id)).toEqual([seeded("A", "order:o1")]);

    const { orders: sams } = dataOf(await invokeAction(getOrdersAction, { search: "Sam Taylor" }));
    expect(sams.map((o) => o.id).sort()).toEqual([seeded("A", "order:o2"), seeded("A", "order:y2")].sort());
    expect(sams.every((o) => o.customer?.id === seeded("A", "customer:sam"))).toBe(true);
  });

  it("returns JSON-safe DTOs: money as two-decimal strings, instants as ISO strings", async () => {
    await asSeedUser("A", "MANAGER");
    const { orders } = dataOf(await invokeAction(getOrdersAction, { status: "ACCEPTED" }));
    const order = orders.find((o) => o.id === seeded("A", "order:o2"));
    expect(order).toBeDefined();
    const row = await db.order.findUniqueOrThrow({ where: { id: seeded("A", "order:o2") } });
    expect(order).toMatchObject({ totalAmount: row.totalAmount.toFixed(2), currencyCode: "INR", createdAt: row.createdAt.toISOString(), version: row.version });
    expect(order!.items[0].lineTotal).toMatch(/^\d+\.\d{2}$/);
    expect(JSON.parse(JSON.stringify(orders))).toEqual(orders);
  });

  it("security.md §3.3 row 23: KITCHEN gets the kitchen projection — no customer data, amounts or payment state", async () => {
    await asSeedUser("A", "KITCHEN");
    const { orders } = dataOf(await invokeAction(getOrdersAction));
    expect(orders.length).toBeGreaterThan(0);
    for (const order of orders) {
      expect(order).toMatchObject({ customer: null, subtotalAmount: null, taxAmount: null, totalAmount: null, paymentStatus: null });
      expect(order.items.every((i) => i.lineTotal === null && i.unitPriceSnapshot === null)).toBe(true);
    }
    expect(JSON.stringify(orders)).not.toMatch(/Sam Taylor|\+9199|clerk_test/);
    // Customer fields are not searchable either (no PII oracle).
    expect(dataOf(await invokeAction(getOrdersAction, { search: "Sam Taylor" })).orders).toEqual([]);
  });

  it("TI-022 / ADV-001: a tenantId (or any unknown key) in the filters is 422 VALIDATION_ERROR", async () => {
    await asSeedUser("A", "CASHIER");
    const error = errorOf(await invokeAction(getOrdersAction, { tenantId: B } as never));
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(error.fieldErrors)).toContain("tenantId");
    expect(errorOf(await invokeAction(getOrdersAction, { status: "SHIPPED" } as never)).code).toBe("VALIDATION_ERROR");
  });

  it("TI-061: signed-out callers and the platform admin (no tenant context) get no orders", async () => {
    asAnonymous();
    expect(errorOf(await invokeAction(getOrdersAction)).code).toBe("UNAUTHENTICATED");
    await asPlatformAdmin();
    expect(errorOf(await invokeAction(getOrdersAction)).code).toBe("NO_ACTIVE_MEMBERSHIP");
  });
});

describe("LD-CUS-01 customer list", () => {
  it("TI-031: Tenant A's customer list contains only Tenant A customers (search 'Sam Taylor' → A's record only)", async () => {
    for (const role of ["TENANT_ADMIN", "MANAGER", "CASHIER", "WAITER"] as const) {
      await asSeedUser("A", role);
      const { customers } = dataOf(await invokeAction(getCustomersAction));
      const ids = customers.map((c) => c.id);
      expect(ids.length, role).toBe(await db.customer.count({ where: { tenantId: A, archivedAt: null } }));
      expect(await db.customer.count({ where: { id: { in: ids }, tenantId: { not: A } } }), role).toBe(0);
    }

    const { customers: sams } = dataOf(await invokeAction(getCustomersAction, { query: "Sam Taylor" }));
    expect(sams.map((c) => c.id)).toEqual([seeded("A", "customer:sam")]);
    expect(sams[0]).toMatchObject({ phoneE164: "+919900000001", orderCount: 2 });
    expect(sams[0].lastOrder?.totalAmount).toMatch(/^\d+\.\d{2}$/);
  });

  it("TI-033: searching by a Tenant B customer's phone or email finds nothing in Tenant A", async () => {
    await asSeedUser("A", "CASHIER");
    expect(dataOf(await invokeAction(getCustomersAction, { query: "+12125550001" })).customers).toEqual([]);
    expect(dataOf(await invokeAction(getCustomersAction, { query: "sam.taylor.b" })).customers).toEqual([]);
    expect(dataOf(await invokeAction(getCustomersAction, { query: "Jordan" })).customers).toEqual([]);
  });

  it("ADV-018: SQL and LIKE wildcard characters in search text are matched literally", async () => {
    await asSeedUser("A", "CASHIER");
    expect(dataOf(await invokeAction(getCustomersAction, { query: "priya" })).customers.map((c) => c.id)).toEqual([seeded("A", "customer:priya")]);
    expect(dataOf(await invokeAction(getCustomersAction, { query: "' OR 1=1 --" })).customers).toEqual([]);
    expect(dataOf(await invokeAction(getCustomersAction, { query: "%" })).customers).toEqual([]);
    expect(dataOf(await invokeAction(getCustomersAction, { query: "S_m" })).customers).toEqual([]); // as a wildcard it would match "Sam"
    expect(dataOf(await invokeAction(getCustomersAction, { query: "clerk_test" })).customers.length).toBeGreaterThan(0); // literal "_" still matches
    expect(dataOf(await invokeAction(getOrdersAction, { search: "%" })).orders).toEqual([]);
  });

  it("TC-RBAC-135: KITCHEN cannot list customers (403 FORBIDDEN)", async () => {
    await asSeedUser("A", "KITCHEN");
    expect(errorOf(await invokeAction(getCustomersAction)).code).toBe("FORBIDDEN");
  });

  it("ADV-001: a tenantId in the customer search input is 422 VALIDATION_ERROR", async () => {
    await asSeedUser("A", "MANAGER");
    const error = errorOf(await invokeAction(getCustomersAction, { query: "Sam", tenantId: B } as never));
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(error.fieldErrors)).toContain("tenantId");
  });
});
