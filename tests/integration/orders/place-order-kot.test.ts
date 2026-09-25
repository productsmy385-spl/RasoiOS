import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createStaffOrderAction } from "@/app/restaurant/orders/actions";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { testDb } from "../setup/db";
import { dataOf } from "../printing/helpers";

/**
 * TC-KOT-AUTO-001…006 — "Place order" sends the KOT automatically (S1-P12/P14/P16; architecture.md §6.2).
 *
 * One Server Action, one transaction: order + snapshot lines + ACCEPTED + one KOT per kitchen section + a KOT print job
 * for each section that has a printer. The response says what really happened to every ticket — queued to an online
 * agent, queued behind an offline agent, or no printer for that station — and never claims "printed".
 * Seed (Tenant A): MAIN has the kitchen printer (agent "Counter PC"), BAR has no printer.
 */
const db = testDb();
const A = tenantIdOf("A");
const ITEM = { chai: seeded("A", "item:masala-chai"), chicken65: seeded("A", "item:chicken-65") };
const AGENT = seeded("A", "agent:active");
const KITCHEN_PRINTER = seeded("A", "printer:kitchen");

beforeAll(seedOnce, 120_000);

function placeOrder(key = randomUUID()) {
  return invokeAction(createStaffOrderAction, {
    idempotencyKey: key,
    orderType: "DINE_IN",
    tableLabel: "T7",
    sendToKitchen: true,
    items: [
      { menuItemId: ITEM.chicken65, quantity: 2, specialInstructions: "Less spicy" },
      { menuItemId: ITEM.chai, quantity: 1 },
    ],
  } as never);
}

async function setAgentSeen(at: Date | null) {
  await db.printAgent.update({ where: { id: AGENT }, data: { lastSeenAt: at } });
}

describe("TC-KOT-AUTO-001 place order → order, KOTs and print job in one step", () => {
  it("creates the accepted order, a ticket per section and a KOT job for the MAIN printer — no extra action", async () => {
    await setAgentSeen(new Date());
    await asSeedUser("A", "CASHIER");
    const { order, kitchen } = dataOf(await placeOrder());

    expect(order.status).toBe("ACCEPTED");
    const tickets = await db.kotTicket.findMany({ where: { tenantId: A, orderId: order.id }, include: { kitchenSection: true } });
    expect(tickets.map((t) => t.kitchenSection?.code).sort()).toEqual(["BAR", "MAIN"]);

    const jobs = await db.printJob.findMany({ where: { tenantId: A, kotTicketId: { in: tickets.map((t) => t.id) } } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ jobType: "KOT", status: "PENDING", printerId: KITCHEN_PRINTER, isReprint: false });

    // What the cashier is told: MAIN queued to an online agent, BAR has no printer. Nothing says "printed".
    const byNumber = new Map(tickets.map((t) => [t.kotNumber, t.kitchenSection?.code]));
    const states = Object.fromEntries(kitchen!.tickets.map((t) => [byNumber.get(t.kotNumber), t.state]));
    expect(states).toEqual({ MAIN: "QUEUED", BAR: "NO_PRINTER" });
  });
});

describe("TC-KOT-AUTO-002 offline agent never fails the order", () => {
  it("reports AGENT_OFFLINE, keeps the job PENDING, and the order is still placed", async () => {
    await setAgentSeen(new Date(Date.now() - 10 * 60_000));
    try {
      await asSeedUser("A", "CASHIER");
      const { order, kitchen } = dataOf(await placeOrder());
      expect(order.status).toBe("ACCEPTED");
      expect(kitchen!.tickets.map((t) => t.state).sort()).toEqual(["AGENT_OFFLINE", "NO_PRINTER"]);
      const job = await db.printJob.findFirstOrThrow({ where: { tenantId: A, kotTicket: { orderId: order.id } } });
      expect(job.status).toBe("PENDING");
    } finally {
      await setAgentSeen(new Date());
    }
  });
});

describe("TC-KOT-AUTO-003 double click / retry", () => {
  it("the same idempotency key returns the same order with no second KOT or print job", async () => {
    await asSeedUser("A", "CASHIER");
    const key = randomUUID();
    const [first, second] = [dataOf(await placeOrder(key)), dataOf(await placeOrder(key))];
    expect(second.order.id).toBe(first.order.id);
    expect(await db.order.count({ where: { tenantId: A, idempotencyKey: key } })).toBe(1);
    expect(await db.kotTicket.count({ where: { tenantId: A, orderId: first.order.id } })).toBe(2);
    expect(await db.printJob.count({ where: { tenantId: A, kotTicket: { orderId: first.order.id } } })).toBe(1);
  });
});

describe("TC-KOT-AUTO-004 waiters place orders with automatic KOT too", () => {
  it("a WAITER's order is accepted and queued without a cashier step", async () => {
    await asSeedUser("A", "WAITER");
    const { order, kitchen } = dataOf(await placeOrder());
    expect(order.status).toBe("ACCEPTED");
    expect(kitchen!.tickets).toHaveLength(2);
  });
});

describe("TC-KOT-AUTO-005 automatic printing turned off", () => {
  it("creates the tickets for the kitchen screen but no print jobs, and says so", async () => {
    await db.restaurant.update({ where: { tenantId: A }, data: { autoPrintKot: false } });
    try {
      await asSeedUser("A", "CASHIER");
      const { order, kitchen } = dataOf(await placeOrder());
      expect(kitchen!.tickets.map((t) => t.state)).toEqual(["AUTO_PRINT_OFF", "AUTO_PRINT_OFF"]);
      expect(await db.printJob.count({ where: { tenantId: A, kotTicket: { orderId: order.id } } })).toBe(0);
    } finally {
      await db.restaurant.update({ where: { tenantId: A }, data: { autoPrintKot: true } });
    }
  });
});

describe("TC-KOT-AUTO-006 server stays authoritative and tenant-bound", () => {
  it("totals come from the menu, and another tenant's item id is NOT_FOUND with nothing created", async () => {
    await asSeedUser("A", "CASHIER");
    const { order } = dataOf(await placeOrder());
    const lines = await db.orderItem.findMany({ where: { tenantId: A, orderId: order.id } });
    const expected = lines.reduce((sum, line) => sum.plus(line.lineTotal), new (await import("@prisma/client")).Prisma.Decimal(0));
    expect(order.totalAmount).toBe(expected.toFixed(2));

    const key = randomUUID();
    const result = await invokeAction(createStaffOrderAction, {
      idempotencyKey: key,
      orderType: "TAKEAWAY",
      sendToKitchen: true,
      items: [{ menuItemId: seeded("B", "item:masala-chai"), quantity: 1 }],
    } as never);
    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await db.order.count({ where: { idempotencyKey: key } })).toBe(0);
  });
});
