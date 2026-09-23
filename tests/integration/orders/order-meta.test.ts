import { beforeAll, describe, expect, it } from "vitest";
import { setOrderCustomerAction, setOrderPriorityAction } from "@/app/restaurant/orders/actions";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf, expectSameNotFound, orderState, RANDOM_UUID } from "./helpers";

/**
 * TC-KITCH-004 (SA-ORD-06) and the order half of TC-CUST-004 (SA-ORD-05), both `order:update_meta` (S1-P15-T003).
 *
 * Marking an order urgent must reach the kitchen: the order and every ticket of it still open take the new priority
 * in one transaction, so the board reorders on its next poll. A WAITER holds `order:update_meta` but may not set
 * HIGH, and a refused request changes nothing at all.
 */
const db = testDb();
const A = tenantIdOf("A");

beforeAll(seedOnce, 120_000);

const openKotPriorities = (orderId: string) =>
  db.kotTicket.findMany({ where: { tenantId: A, orderId, status: { in: ["QUEUED", "PREPARING", "READY"] } }, select: { priority: true } });

describe("TC-KITCH-004 order priority (SA-ORD-06)", () => {
  it("CASHIER sets HIGH and the order's open tickets follow", async () => {
    const orderId = seeded("A", "order:o2");
    expect((await openKotPriorities(orderId)).length).toBeGreaterThan(0);
    expect((await openKotPriorities(orderId)).every((kot) => kot.priority === "NORMAL")).toBe(true);

    await asSeedUser("A", "CASHIER");
    const result = dataOf(await invokeAction(setOrderPriorityAction, { orderId, priority: "HIGH" }));
    expect(result).toMatchObject({ orderId, priority: "HIGH" });
    expect(result.ticketsUpdated).toBeGreaterThan(0);

    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).priority).toBe("HIGH");
    expect((await openKotPriorities(orderId)).every((kot) => kot.priority === "HIGH")).toBe(true);

    const audit = await db.auditLog.findFirstOrThrow({
      where: { tenantId: A, action: "order.priority_changed", resourceId: orderId },
      orderBy: { createdAt: "desc" },
    });
    expect(audit.beforeState).toMatchObject({ priority: "NORMAL" });
    expect(audit.afterState).toMatchObject({ priority: "HIGH" });

    // Repeating the same target changes nothing further.
    const again = dataOf(await invokeAction(setOrderPriorityAction, { orderId, priority: "HIGH" }));
    expect(again.ticketsUpdated).toBe(0);
  });

  it("WAITER setting HIGH is FORBIDDEN and nothing changes", async () => {
    const orderId = seeded("A", "order:o4");
    const before = await orderState(orderId);

    await asSeedUser("A", "WAITER");
    expect(errorOf(await invokeAction(setOrderPriorityAction, { orderId, priority: "HIGH" })).code).toBe("FORBIDDEN");
    expect(await orderState(orderId)).toEqual(before);
    expect((await openKotPriorities(orderId)).every((kot) => kot.priority === "NORMAL")).toBe(true);

    // The same waiter may still take urgency *off* an order.
    await asSeedUser("A", "CASHIER");
    dataOf(await invokeAction(setOrderPriorityAction, { orderId, priority: "HIGH" }));
    await asSeedUser("A", "WAITER");
    expect(dataOf(await invokeAction(setOrderPriorityAction, { orderId, priority: "NORMAL" })).priority).toBe("NORMAL");
  });

  it("KITCHEN has no `order:update_meta` at all, and a closed order is frozen", async () => {
    await asSeedUser("A", "KITCHEN");
    expect(errorOf(await invokeAction(setOrderPriorityAction, { orderId: seeded("A", "order:o2"), priority: "NORMAL" })).code).toBe("FORBIDDEN");

    await asSeedUser("A", "MANAGER");
    const completed = errorOf(await invokeAction(setOrderPriorityAction, { orderId: seeded("A", "order:o5"), priority: "HIGH" }));
    expect(completed.code).toBe("INVALID_TRANSITION");
  });

  it("another tenant's order is NOT_FOUND, exactly like an unknown id (TI-027)", async () => {
    await asSeedUser("A", "MANAGER");
    expectSameNotFound(
      await invokeAction(setOrderPriorityAction, { orderId: seeded("B", "order:o2"), priority: "HIGH" }),
      await invokeAction(setOrderPriorityAction, { orderId: RANDOM_UUID, priority: "HIGH" }),
    );
    expect((await db.order.findUniqueOrThrow({ where: { id: seeded("B", "order:o2") } })).priority).toBe("NORMAL");
  });
});

describe("TC-CUST-004 linking a customer to an order (SA-ORD-05)", () => {
  it("links, unlinks and audits, without ever writing the customer's own profile", async () => {
    const orderId = seeded("A", "order:o1");
    const customerId = seeded("A", "customer:priya");
    const before = await db.customer.findUniqueOrThrow({ where: { id: customerId } });

    await asSeedUser("A", "CASHIER");
    expect(dataOf(await invokeAction(setOrderCustomerAction, { orderId, customerId }))).toEqual({ orderId, customerId });
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).customerId).toBe(customerId);
    expect(await db.customer.findUniqueOrThrow({ where: { id: customerId } })).toEqual(before);

    const audit = await db.auditLog.findFirstOrThrow({ where: { tenantId: A, action: "order.customer_linked", resourceId: orderId }, orderBy: { createdAt: "desc" } });
    expect(audit.afterState).toMatchObject({ customerId });

    expect(dataOf(await invokeAction(setOrderCustomerAction, { orderId, customerId: null }))).toEqual({ orderId, customerId: null });
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).customerId).toBeNull();
  });

  it("refuses another tenant's customer with the same answer as an unknown one", async () => {
    const orderId = seeded("A", "order:o1");
    await asSeedUser("A", "CASHIER");
    expectSameNotFound(
      await invokeAction(setOrderCustomerAction, { orderId, customerId: seeded("B", "customer:sam") }),
      await invokeAction(setOrderCustomerAction, { orderId, customerId: RANDOM_UUID }),
    );
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).customerId).toBeNull();
  });

  it("KITCHEN cannot link a customer to an order", async () => {
    await asSeedUser("A", "KITCHEN");
    expect(errorOf(await invokeAction(setOrderCustomerAction, { orderId: seeded("A", "order:o1"), customerId: seeded("A", "customer:sam") })).code).toBe("FORBIDDEN");
  });
});
