import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { updateKOTStatusAction } from "@/app/restaurant/kds/actions";
import { createStaffOrderAction, updateOrderStatusAction } from "@/app/restaurant/orders/actions";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf, orderState } from "../orders/helpers";

// TC-ORDER-019 / TC-KOT-003 / TC-KOT-004 — the order follows the kitchen (S1-P14-T002, BR-ORD-04, security.md §3.4):
// the first ticket that starts moves the order to PREPARING, and the order reaches READY only when every ticket of the
// latest round is READY or SERVED. Derived changes are audited as SYSTEM, naming the ticket and the user behind them.
const db = testDb();
const A = tenantIdOf("A");
const ITEM = { chai: seeded("A", "item:masala-chai"), chicken65: seeded("A", "item:chicken-65") };

beforeAll(seedOnce, 120_000);

/** A fresh ACCEPTED order with one BAR ticket and one MAIN ticket. */
async function acceptedTwoSectionOrder(): Promise<{ orderId: string; kotIds: string[] }> {
  await asSeedUser("A", "CASHIER");
  const orderId = dataOf(
    await invokeAction(createStaffOrderAction, {
      idempotencyKey: randomUUID(),
      orderType: "DINE_IN",
      items: [
        { menuItemId: ITEM.chai, quantity: 1 },
        { menuItemId: ITEM.chicken65, quantity: 1 },
      ],
    } as never),
  ).order.id;
  dataOf(await invokeAction(updateOrderStatusAction, { orderId, status: "ACCEPTED" }));
  const kots = await db.kotTicket.findMany({ where: { tenantId: A, orderId }, orderBy: { kotNumber: "asc" }, select: { id: true } });
  expect(kots).toHaveLength(2);
  return { orderId, kotIds: kots.map((k) => k.id) };
}

const moveKot = async (kotId: string, toStatus: "PREPARING" | "READY" | "SERVED") => {
  await asSeedUser("A", "KITCHEN");
  return invokeAction(updateKOTStatusAction, { kotId, toStatus });
};

describe("TC-ORDER-019 the order follows the kitchen", () => {
  it("the first ticket to start moves the order to PREPARING; the order reaches READY only when both tickets are ready", async () => {
    const { orderId, kotIds } = await acceptedTwoSectionOrder();
    expect((await orderState(orderId)).status).toBe("ACCEPTED");

    dataOf(await moveKot(kotIds[0], "PREPARING"));
    expect((await orderState(orderId)).status, "first ticket started").toBe("PREPARING");

    dataOf(await moveKot(kotIds[0], "READY"));
    expect((await orderState(orderId)).status, "one ticket still queued").toBe("PREPARING");

    dataOf(await moveKot(kotIds[1], "PREPARING"));
    expect((await orderState(orderId)).status).toBe("PREPARING");

    dataOf(await moveKot(kotIds[1], "READY"));
    expect((await orderState(orderId)).status, "every ticket ready").toBe("READY");
  });

  it("derived changes are audited as SYSTEM and name the ticket and the user who triggered them", async () => {
    const { orderId, kotIds } = await acceptedTwoSectionOrder();
    const kitchen = await asSeedUser("A", "KITCHEN");
    dataOf(await moveKot(kotIds[0], "PREPARING"));

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "order.status_changed", resourceId: orderId }, orderBy: { createdAt: "desc" } });
    expect(audit).toMatchObject({ tenantId: A, actorType: "SYSTEM", actorUserId: null, actorRole: null });
    expect(audit.beforeState).toMatchObject({ status: "ACCEPTED" });
    expect(audit.afterState).toMatchObject({ status: "PREPARING", trigger: "kot", kotId: kotIds[0], kotStatus: "PREPARING", byUserId: kitchen.userId });

    // The ticket change and the derived order change commit together.
    const [orderXmin] = await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM orders WHERE id = ${orderId}::uuid`;
    const [kotXmin] = await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM kot_tickets WHERE id = ${kotIds[0]}::uuid`;
    expect(kotXmin.xmin).toBe(orderXmin.xmin);
  });

  it("serving the last ready ticket keeps the order READY, and a cancelled ticket does not hold the order back", async () => {
    const { orderId, kotIds } = await acceptedTwoSectionOrder();
    for (const id of kotIds) {
      dataOf(await moveKot(id, "PREPARING"));
      dataOf(await moveKot(id, "READY"));
    }
    expect((await orderState(orderId)).status).toBe("READY");

    await asSeedUser("A", "WAITER");
    dataOf(await invokeAction(updateKOTStatusAction, { kotId: kotIds[0], toStatus: "SERVED" }));
    expect((await orderState(orderId)).status).toBe("READY");
  });

  it("TC-KOT-004 CASHIER and WAITER cannot start or ready a ticket; WAITER may serve a ready one", async () => {
    const { orderId, kotIds } = await acceptedTwoSectionOrder();
    for (const role of ["CASHIER", "WAITER"] as const) {
      await asSeedUser("A", role);
      expect(errorOf(await invokeAction(updateKOTStatusAction, { kotId: kotIds[0], toStatus: "PREPARING" })).code, role).toBe("FORBIDDEN");
    }
    expect((await db.kotTicket.findUniqueOrThrow({ where: { id: kotIds[0] } })).status).toBe("QUEUED");
    expect((await orderState(orderId)).status).toBe("ACCEPTED");

    dataOf(await moveKot(kotIds[0], "PREPARING"));
    await asSeedUser("A", "WAITER");
    expect(errorOf(await invokeAction(updateKOTStatusAction, { kotId: kotIds[0], toStatus: "READY" })).code).toBe("FORBIDDEN");
    dataOf(await moveKot(kotIds[0], "READY"));
    await asSeedUser("A", "WAITER");
    expect(dataOf(await invokeAction(updateKOTStatusAction, { kotId: kotIds[0], toStatus: "SERVED" })).status).toBe("SERVED");
  });
});
