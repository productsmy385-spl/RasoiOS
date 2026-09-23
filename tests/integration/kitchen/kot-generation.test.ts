import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createStaffOrderAction, updateOrderStatusAction } from "@/app/restaurant/orders/actions";
import { businessDateFor } from "@/lib/time/business-date";
import { COUNTER_LIMITS } from "@/lib/data/counters";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf, orderState } from "../orders/helpers";

// TC-KOT-001 / TC-KOT-008 — KOTs are generated per kitchen section inside the acceptance transaction and cancelled with
// the order (S1-P14-T001, S1-P14-T003, security.md §3.4, U-KOT-2).
const db = testDb();
const A = tenantIdOf("A");
const ITEM = { chai: seeded("A", "item:masala-chai"), chicken65: seeded("A", "item:chicken-65"), omelette: seeded("A", "item:masala-omelette") };

beforeAll(seedOnce, 120_000);

/** A NEW Tenant A order with one BAR line (masala chai) and two MAIN lines (chicken 65, omelette). */
async function twoSectionOrder(): Promise<string> {
  await asSeedUser("A", "CASHIER");
  const result = await invokeAction(createStaffOrderAction, {
    idempotencyKey: randomUUID(),
    orderType: "DINE_IN",
    tableLabel: "T4",
    notes: "Birthday table",
    items: [
      { menuItemId: ITEM.chai, quantity: 2, specialInstructions: "Less sugar" },
      { menuItemId: ITEM.chicken65, quantity: 1 },
      { menuItemId: ITEM.omelette, quantity: 3 },
    ],
  } as never);
  return dataOf(result).order.id;
}

async function accept(orderId: string, role: "CASHIER" | "MANAGER" = "CASHIER") {
  await asSeedUser("A", role);
  return invokeAction(updateOrderStatusAction, { orderId, status: "ACCEPTED" });
}

describe("TC-KOT-001 KOT generation on acceptance", () => {
  it("a NEW order has no KOTs; accepting it creates one QUEUED ticket per section with the right items, audited, in the same transaction", async () => {
    const orderId = await twoSectionOrder();
    expect(await db.kotTicket.count({ where: { orderId } })).toBe(0);

    const { userId } = await asSeedUser("A", "CASHIER");
    dataOf(await accept(orderId));

    const kots = await db.kotTicket.findMany({ where: { orderId }, include: { items: { include: { orderItem: true } }, kitchenSection: true }, orderBy: { kotNumber: "asc" } });
    expect(kots).toHaveLength(2);
    const bySection = Object.fromEntries(kots.map((k) => [k.kitchenSection?.code ?? "NONE", k]));
    expect(Object.keys(bySection).sort()).toEqual(["BAR", "MAIN"]);
    expect(bySection.BAR.items.map((i) => [i.itemLabelSnapshot, i.quantity, i.instructionsSnapshot])).toEqual([["Masala Chai", 2, "Less sugar"]]);
    expect(bySection.MAIN.items.map((i) => [i.itemLabelSnapshot, i.quantity]).sort()).toEqual([["Chicken 65", 1], ["Masala Omelette", 3]]);
    for (const kot of kots) {
      expect(kot).toMatchObject({ tenantId: A, status: "QUEUED", roundNumber: 1, orderTypeSnapshot: "DINE_IN", tableLabelSnapshot: "T4", notesSnapshot: "Birthday table" });
      expect(kot.kotNumber).toMatch(/^K-\d{3}$/);
      expect(kot.items.every((i) => i.tenantId === A && i.orderItem.orderId === orderId)).toBe(true);
    }
    expect(new Set(kots.map((k) => k.kotNumber)).size).toBe(2);

    const audits = await db.auditLog.findMany({ where: { action: "kot.generated", resourceId: { in: kots.map((k) => k.id) } } });
    expect(audits).toHaveLength(2);
    expect(audits.every((a) => a.tenantId === A && a.actorUserId === userId && a.actorRole === "CASHIER")).toBe(true);
    const [acceptAudit] = await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM orders WHERE id = ${orderId}::uuid`;
    const kotXmins = await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM kot_tickets WHERE order_id = ${orderId}::uuid`;
    expect(kotXmins.every((k) => k.xmin === acceptAudit.xmin)).toBe(true);
  });

  it("repeating the acceptance creates no duplicate tickets", async () => {
    const orderId = await twoSectionOrder();
    dataOf(await accept(orderId));
    dataOf(await accept(orderId)); // same target → no-op
    expect(await db.kotTicket.count({ where: { orderId } })).toBe(2);
    expect(await db.auditLog.count({ where: { action: "kot.generated", afterState: { path: ["orderId"], equals: orderId } } })).toBe(2);
  });

  it("if KOT generation fails, the acceptance rolls back with it (no ACCEPTED order without tickets)", async () => {
    const orderId = await twoSectionOrder();
    const before = await orderState(orderId);
    const today = businessDateFor(new Date(), "Asia/Kolkata");
    const key = { tenantId_counterType_businessDate: { tenantId: A, counterType: "KOT" as const, businessDate: today } };
    const counter = await db.tenantCounter.findUnique({ where: key });
    await db.tenantCounter.upsert({ where: key, create: { tenantId: A, counterType: "KOT", businessDate: today, lastValue: COUNTER_LIMITS.KOT }, update: { lastValue: COUNTER_LIMITS.KOT } });
    try {
      expect(errorOf(await accept(orderId)).code).toBe("DAILY_NUMBER_LIMIT");
      expect(await orderState(orderId)).toEqual(before);
      expect(await db.kotTicket.count({ where: { orderId } })).toBe(0);
      expect(await db.auditLog.count({ where: { action: "order.status_changed", resourceId: orderId } })).toBe(0);
    } finally {
      await db.tenantCounter.update({ where: key, data: { lastValue: counter?.lastValue ?? 0 } });
    }
  });
});

describe("TC-KOT-008 KOTs are cancelled with the order", () => {
  it("cancelling an ACCEPTED order cancels its QUEUED tickets in the same transaction and audits each", async () => {
    const orderId = await twoSectionOrder();
    dataOf(await accept(orderId));
    await asSeedUser("A", "MANAGER");
    dataOf(await invokeAction(updateOrderStatusAction, { orderId, status: "CANCELLED", reason: "Guest left before food" }));

    const kots = await db.kotTicket.findMany({ where: { orderId } });
    expect(kots.map((k) => k.status)).toEqual(["CANCELLED", "CANCELLED"]);
    expect(kots.every((k) => k.cancelledAt instanceof Date)).toBe(true);
    const audits = await db.auditLog.findMany({ where: { action: "kot.status_changed", resourceId: { in: kots.map((k) => k.id) } } });
    expect(audits).toHaveLength(2);
    expect(audits.every((a) => (a.afterState as { status: string }).status === "CANCELLED")).toBe(true);
    const xmins = await db.$queryRaw<{ xmin: string }[]>`SELECT DISTINCT xmin::text AS xmin FROM kot_tickets WHERE order_id = ${orderId}::uuid`;
    const [orderXmin] = await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM orders WHERE id = ${orderId}::uuid`;
    expect(xmins).toEqual([orderXmin]);
  });

  it("SERVED tickets are never altered when the order is cancelled", async () => {
    const orderId = await twoSectionOrder();
    dataOf(await accept(orderId));
    const [served, open] = await db.kotTicket.findMany({ where: { orderId }, orderBy: { kotNumber: "asc" } });
    await db.kotTicket.update({ where: { id: served.id }, data: { status: "SERVED", servedAt: new Date() } });
    await asSeedUser("A", "MANAGER");
    dataOf(await invokeAction(updateOrderStatusAction, { orderId, status: "CANCELLED", reason: "Guest left after starters" }));
    expect((await db.kotTicket.findUniqueOrThrow({ where: { id: served.id } })).status).toBe("SERVED");
    expect((await db.kotTicket.findUniqueOrThrow({ where: { id: open.id } })).status).toBe("CANCELLED");
  });
});
