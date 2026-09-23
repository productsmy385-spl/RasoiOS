import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  closeBusinessDayAction,
  getDayClosePreviewAction,
  recordPaymentAction,
  voidTransactionAction,
} from "@/app/restaurant/transactions/actions";
import { createStaffOrderAction } from "@/app/restaurant/orders/actions";
import { businessDateFor } from "@/lib/time/business-date";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { errorOf, key, money, okData } from "./helpers";

// TC-TXN-004 / TC-TXN-006 / TC-TXN-007 — same-day voids and the business day close (S1-P18-T002/T003, SA-TXN-03/04,
// LD-TXN-02). Closing a day freezes it: orders, payments and voids for that date are refused afterwards.
const db = testDb();
const A = tenantIdOf("A");
const CHAI_A = seeded("A", "item:masala-chai"); // 40.00 @ 5 % → 42.00
const today = () => businessDateFor(new Date(), "Asia/Kolkata");

beforeAll(seedOnce, 120_000);

afterEach(async () => {
  // Each test closes or fills today's ledger; put the day back so the next one starts open.
  await db.businessDayClose.deleteMany({ where: { tenantId: A, businessDate: today() } });
});

async function paidOrderToday(amount = "42.00", method: "CASH" | "CARD" | "UPI" = "CASH") {
  await asSeedUser("A", "CASHIER");
  const { order } = okData(await invokeAction(createStaffOrderAction, { idempotencyKey: randomUUID(), orderType: "TAKEAWAY", items: [{ menuItemId: CHAI_A, quantity: 1 }] }));
  const payment = okData(
    await invokeAction(recordPaymentAction, {
      orderId: order.id,
      idempotencyKey: key(),
      method,
      amount,
      ...(method === "CASH" ? { amountTendered: amount } : {}),
      ...(method === "UPI" ? { reference: `UPI${randomUUID().slice(0, 8)}` } : {}),
    }),
  );
  return { order, payment };
}

describe("TC-TXN-006 LD-TXN-02 day close preview", () => {
  it("totals the day by method from the ledger and counts open orders", async () => {
    const before = okData(await asSeedUser("A", "MANAGER").then(() => invokeAction(getDayClosePreviewAction, {})));
    await paidOrderToday("42.00", "CASH");
    await paidOrderToday("42.00", "CARD");
    await paidOrderToday("42.00", "UPI");

    await asSeedUser("A", "MANAGER");
    const preview = okData(await invokeAction(getDayClosePreviewAction, {}));
    expect(preview.alreadyClosed).toBe(false);
    expect(Number(preview.expectedCash) - Number(before.expectedCash)).toBeCloseTo(42, 2);
    expect(Number(preview.cardTotal) - Number(before.cardTotal)).toBeCloseTo(42, 2);
    expect(Number(preview.upiTotal) - Number(before.upiTotal)).toBeCloseTo(42, 2);
    expect(preview.orderCount).toBeGreaterThanOrEqual(3);

    // The figures are exact decimal strings, never floats.
    for (const value of [preview.expectedCash, preview.cardTotal, preview.upiTotal, preview.refundTotal]) {
      expect(value).toMatch(/^\d+\.\d{2}$/);
    }

    // They match a direct sum of the ledger for that business date.
    const cashRows = await db.transaction.findMany({ where: { tenantId: A, businessDate: today(), type: "PAYMENT", paymentMethod: "CASH", status: "SUCCESS" }, select: { amount: true } });
    const cashSum = cashRows.reduce((sum, r) => sum + Number(r.amount), 0);
    const cashRefunds = await db.transaction.findMany({ where: { tenantId: A, businessDate: today(), type: "REFUND", paymentMethod: "CASH", status: "SUCCESS" }, select: { amount: true } });
    expect(Number(preview.expectedCash)).toBeCloseTo(cashSum - cashRefunds.reduce((sum, r) => sum + Number(r.amount), 0), 2);
  });

  it("requires day_close:perform", async () => {
    for (const role of ["CASHIER", "KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      expect(errorOf(await invokeAction(getDayClosePreviewAction, {})).code, role).toBe("FORBIDDEN");
      expect(errorOf(await invokeAction(closeBusinessDayAction, { businessDate: "2026-09-15", countedCash: "0.00" })).code, role).toBe("FORBIDDEN");
    }
  });
});

describe("TC-TXN-007 SA-TXN-04 closing the day", () => {
  it("stores the totals and the variance, and refuses a difference without an explanation", async () => {
    await paidOrderToday("42.00", "CASH");
    const { userId } = await asSeedUser("A", "MANAGER");
    const preview = okData(await invokeAction(getDayClosePreviewAction, {}));
    const short = (Number(preview.expectedCash) - 10).toFixed(2);

    const unexplained = errorOf(await invokeAction(closeBusinessDayAction, { businessDate: preview.businessDate, countedCash: short }));
    expect(unexplained.code).toBe("VALIDATION_ERROR");
    expect(unexplained.fieldErrors?.notes?.[0]).toContain("short");
    expect(await db.businessDayClose.count({ where: { tenantId: A, businessDate: today() } })).toBe(0);

    const closed = okData(await invokeAction(closeBusinessDayAction, { businessDate: preview.businessDate, countedCash: short, notes: "Ten rupees short — float error at handover" }));
    expect(closed).toMatchObject({ expectedCash: preview.expectedCash, countedCash: short, cashVariance: "-10.00" });

    const row = await db.businessDayClose.findFirstOrThrow({ where: { tenantId: A, businessDate: today() } });
    expect(row.closedByUserId).toBe(userId);
    expect(money(row.cardTotal)).toBe(preview.cardTotal);
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "day_close.performed", resourceId: row.id } });
    expect(audit).toMatchObject({ tenantId: A, actorUserId: userId, reason: "Ten rupees short — float error at handover" });
  });

  it("closing twice is ALREADY_CLOSED, and afterwards orders, payments and voids for that day are refused", async () => {
    const { order, payment } = await paidOrderToday("42.00", "CASH");
    await asSeedUser("A", "MANAGER");
    const preview = okData(await invokeAction(getDayClosePreviewAction, {}));
    okData(await invokeAction(closeBusinessDayAction, { businessDate: preview.businessDate, countedCash: preview.expectedCash }));

    expect(errorOf(await invokeAction(closeBusinessDayAction, { businessDate: preview.businessDate, countedCash: preview.expectedCash })).code).toBe("ALREADY_CLOSED");
    expect(okData(await invokeAction(getDayClosePreviewAction, {})).alreadyClosed).toBe(true);

    // A new order for the closed day is refused…
    await asSeedUser("A", "CASHIER");
    expect(errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: randomUUID(), orderType: "TAKEAWAY", items: [{ menuItemId: CHAI_A, quantity: 1 }] })).code).toBe("DAY_CLOSED");
    // …as is another payment on an existing order…
    expect(errorOf(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CASH", amount: "1.00", amountTendered: "1.00" })).code).toBe("DAY_CLOSED");
    // …and voiding one of the day's transactions.
    await asSeedUser("A", "MANAGER");
    expect(errorOf(await invokeAction(voidTransactionAction, { transactionId: payment.transactionId, reason: "Recorded twice by mistake" })).code).toBe("DAY_CLOSED");
  });
});

describe("TC-TXN-004 SA-TXN-03 voiding a transaction", () => {
  it("voids a same-day payment, corrects the order totals, and never rewrites the amount", async () => {
    const { order, payment } = await paidOrderToday("42.00", "CASH");
    const beforeOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(beforeOrder.paymentStatus).toBe("PAID");

    const { userId } = await asSeedUser("A", "MANAGER");
    const voided = okData(await invokeAction(voidTransactionAction, { transactionId: payment.transactionId, reason: "Charged the wrong table" }));
    expect(voided).toMatchObject({ transactionId: payment.transactionId, status: "VOIDED" });

    const row = await db.transaction.findUniqueOrThrow({ where: { id: payment.transactionId } });
    expect(row).toMatchObject({ status: "VOIDED", voidedByUserId: userId, voidReason: "Charged the wrong table" });
    expect(money(row.amount)).toBe("42.00"); // the ledger keeps what happened
    const afterOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect([money(afterOrder.paidAmount), afterOrder.paymentStatus]).toEqual(["0.00", "UNPAID"]);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "transaction.voided", resourceId: payment.transactionId } });
    expect(audit.afterState).toMatchObject({ status: "VOIDED", paidAmount: "0.00", paymentStatus: "UNPAID" });

    // Voiding it again is refused.
    expect(errorOf(await invokeAction(voidTransactionAction, { transactionId: payment.transactionId, reason: "Charged the wrong table" })).code).toBe("ALREADY_VOIDED");
  });

  it("refuses a transaction from another business day, a refunded payment, a foreign id and a missing reason", async () => {
    await asSeedUser("A", "MANAGER");
    // The seed's transactions belong to earlier business dates.
    const older = await db.transaction.findFirstOrThrow({ where: { tenantId: A, status: "SUCCESS", businessDate: { lt: today() } }, select: { id: true } });
    expect(errorOf(await invokeAction(voidTransactionAction, { transactionId: older.id, reason: "Too late for this one" })).code).toBe("NOT_SAME_DAY");

    const foreign = await db.transaction.findFirstOrThrow({ where: { tenantId: tenantIdOf("B") }, select: { id: true } });
    expect(errorOf(await invokeAction(voidTransactionAction, { transactionId: foreign.id, reason: "Another tenant's row" })).code).toBe("NOT_FOUND");
    expect(errorOf(await invokeAction(voidTransactionAction, { transactionId: payment0(), reason: "no" })).code).toBe("VALIDATION_ERROR");

    // CASHIER and WAITER hold no transaction:void.
    for (const role of ["CASHIER", "WAITER", "KITCHEN"] as const) {
      await asSeedUser("A", role);
      expect(errorOf(await invokeAction(voidTransactionAction, { transactionId: older.id, reason: "Not my call" })).code, role).toBe("FORBIDDEN");
    }
  });
});

/** A syntactically valid id that belongs to nobody, for the validation cases. */
function payment0(): string {
  return "7f3e2b1a-9c4d-4e8f-a1b2-c3d4e5f60718";
}
