import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createRefundAction, recordPaymentAction } from "@/app/restaurant/transactions/actions";
import { updateOrderStatusAction } from "@/app/restaurant/orders/actions";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { comparable, errorOf, key, ledgerCount, money, newOrder, okData, orderRow } from "./helpers";

// SA-TXN-02 createRefundAction (S1-P04-T007): refund:create (TENANT_ADMIN, MANAGER), reason required, refunds never
// exceed what was paid (ADR-010 §8), order totals and status recomputed in the same transaction, audited with reason.
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");

beforeAll(seedOnce, 120_000);

/**
 * A Tenant A order (210.00) with one CARD payment of `amount`, recorded by the cashier; when that settles the order the
 * cashier completes it (READY → COMPLETED requires PAID — payments never complete orders by themselves).
 */
async function paidOrder(amount = "210.00") {
  await asSeedUser("A", "CASHIER");
  const order = await newOrder("A");
  const payment = okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CARD", amount }));
  if (payment.paymentStatus === "PAID") okData(await invokeAction(updateOrderStatusAction, { orderId: order.id, status: "COMPLETED" }));
  return { order, paymentId: payment.transactionId };
}

describe("TC-TXN-003 refunds", () => {
  it("CASHIER cannot refund (FORBIDDEN before any lookup)", async () => {
    const { paymentId } = await paidOrder();
    await asSeedUser("A", "CASHIER");
    for (const id of [paymentId, seeded("B", "order:o5:tx:p1"), randomUUID()]) {
      const error = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: id, idempotencyKey: key(), amount: "1.00", reason: "Customer complaint" }));
      expect(error.code).toBe("FORBIDDEN");
    }
    expect(await ledgerCount({ refundOfTransactionId: paymentId })).toBe(0);
  });

  it("MANAGER partial refund with a reason → PARTIALLY_REFUNDED, refunded_amount updated and audited with the reason", async () => {
    const { order, paymentId } = await paidOrder();
    const { userId } = await asSeedUser("A", "MANAGER");
    const before = await orderRow(order.id);
    expect(before).toMatchObject({ paymentStatus: "PAID", status: "COMPLETED" });

    const data = okData(await invokeAction(createRefundAction, { paymentTransactionId: paymentId, idempotencyKey: key(), amount: "10.50", reason: "Drink was wrong" }));
    expect(data).toMatchObject({ orderId: order.id, paymentTransactionId: paymentId, method: "CARD", amount: "10.50", paymentStatus: "PARTIALLY_REFUNDED", refundedAmount: "10.50", replayed: false });

    const row = await db.transaction.findUniqueOrThrow({ where: { id: data.transactionId } });
    expect(row).toMatchObject({ tenantId: A, type: "REFUND", status: "SUCCESS", refundOfTransactionId: paymentId, reason: "Drink was wrong", paymentMethod: "CARD", recordedByUserId: userId });

    const after = await orderRow(order.id);
    expect(money(after.refundedAmount)).toBe("10.50");
    expect(money(after.paidAmount)).toBe("210.00");
    expect(after).toMatchObject({ paymentStatus: "PARTIALLY_REFUNDED", status: "COMPLETED", version: before.version + 1 });

    const audit = await db.auditLog.findFirstOrThrow({ where: { tenantId: A, action: "refund.created", resourceId: data.transactionId } });
    expect(audit).toMatchObject({ reason: "Drink was wrong", actorUserId: userId, actorRole: "MANAGER" });
    expect(audit.afterState).toMatchObject({ amount: "10.50", refundOfTransactionId: paymentId, paymentStatus: "PARTIALLY_REFUNDED" });
  });

  it("refunding more than was paid returns REFUND_EXCEEDS_PAID; refunding the remainder of a completed order sets REFUNDED", async () => {
    const { order, paymentId } = await paidOrder();
    await asSeedUser("A", "MANAGER");
    okData(await invokeAction(createRefundAction, { paymentTransactionId: paymentId, idempotencyKey: key(), amount: "10.00", reason: "Partial comp" }));

    const tooMuch = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: paymentId, idempotencyKey: key(), amount: "200.01", reason: "Too much" }));
    expect(tooMuch).toMatchObject({ code: "REFUND_EXCEEDS_PAID", fieldErrors: { amount: ["At most 200.00"] } });
    expect(await ledgerCount({ refundOfTransactionId: paymentId })).toBe(1);

    const rest = okData(await invokeAction(createRefundAction, { paymentTransactionId: paymentId, idempotencyKey: key(), reason: "Order arrived cold" }));
    expect(rest).toMatchObject({ amount: "200.00", paymentStatus: "REFUNDED", refundedAmount: "210.00" });
    const after = await orderRow(order.id);
    expect(after).toMatchObject({ status: "REFUNDED", paymentStatus: "REFUNDED" });
    expect(after.refundedAt).not.toBeNull();

    const nothingLeft = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: paymentId, idempotencyKey: key(), amount: "0.01", reason: "Once more" }));
    expect(nothingLeft.code).toBe("REFUND_EXCEEDS_PAID");
  });

  it("a refund cannot exceed the remaining refundable amount of a seeded partially refunded payment (y3)", async () => {
    await asSeedUser("A", "MANAGER");
    const paymentId = seeded("A", "order:y3:tx:p1");
    const payment = await db.transaction.findUniqueOrThrow({ where: { id: paymentId } });
    const before = await orderRow(payment.orderId);

    const error = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: paymentId, idempotencyKey: key(), amount: money(payment.amount)!, reason: "Full refund attempt" }));
    expect(error.code).toBe("REFUND_EXCEEDS_PAID");
    const after = await orderRow(payment.orderId);
    expect(money(after.refundedAmount)).toBe(money(before.refundedAmount));
  });

  it("only a successful PAYMENT can be refunded", async () => {
    await asSeedUser("A", "MANAGER");
    const refundRow = seeded("A", "order:o7:tx:r1");
    const voidedPayment = seeded("A", "order:o3:tx:p1");
    for (const id of [refundRow, voidedPayment]) {
      const error = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: id, idempotencyKey: key(), amount: "1.00", reason: "Not refundable" }));
      expect(error.code).toBe("NOT_REFUNDABLE");
    }
  });

  it("requires a reason of 5–280 characters and rejects unknown keys", async () => {
    const { paymentId } = await paidOrder();
    await asSeedUser("A", "MANAGER");
    for (const reason of [undefined, "", "   ", "abc", "x".repeat(281)]) {
      const error = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: paymentId, idempotencyKey: key(), amount: "1.00", reason } as never));
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.fieldErrors).toHaveProperty("reason");
    }
    for (const extra of [{ tenantId: A }, { orderId: randomUUID() }, { refundedAmount: "0.00" }]) {
      const error = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: paymentId, idempotencyKey: key(), reason: "Valid reason", ...extra } as never));
      expect(error.code).toBe("VALIDATION_ERROR");
    }
    expect(await ledgerCount({ refundOfTransactionId: paymentId })).toBe(0);
  });

  it("a repeated idempotency key returns the original refund", async () => {
    const { paymentId } = await paidOrder();
    await asSeedUser("A", "MANAGER");
    const input = { paymentTransactionId: paymentId, idempotencyKey: key(), amount: "5.00", reason: "Duplicate click" };
    const first = okData(await invokeAction(createRefundAction, input));
    const second = okData(await invokeAction(createRefundAction, input));
    expect(second).toMatchObject({ transactionId: first.transactionId, replayed: true });
    expect(await ledgerCount({ refundOfTransactionId: paymentId })).toBe(1);
  });
});

describe("TI-030 tenant isolation", () => {
  it("TI-030 Tenant A refunding a Tenant B payment gets NOT_FOUND, identical to a random id, and B is unchanged", async () => {
    await asSeedUser("A", "MANAGER");
    const bPayment = seeded("B", "order:o5:tx:p1");
    const bOrder = seeded("B", "order:o5");
    const bBefore = await orderRow(bOrder);
    const bLedger = await ledgerCount({ tenantId: B });

    const foreign = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: bPayment, idempotencyKey: key(), amount: "1.00", reason: "Cross-tenant attempt" }));
    const random = errorOf(await invokeAction(createRefundAction, { paymentTransactionId: randomUUID(), idempotencyKey: key(), amount: "1.00", reason: "Cross-tenant attempt" }));
    expect(foreign.code).toBe("NOT_FOUND");
    expect(comparable(foreign)).toEqual(comparable(random));

    expect(await ledgerCount({ tenantId: B })).toBe(bLedger);
    const bAfter = await orderRow(bOrder);
    expect([money(bAfter.refundedAmount), bAfter.paymentStatus, bAfter.status, bAfter.version]).toEqual([money(bBefore.refundedAmount), bBefore.paymentStatus, bBefore.status, bBefore.version]);
  });

  it("TENANT_ADMIN of Tenant B refunds its own payment normally (the rule is tenant-relative, not a blanket block)", async () => {
    await asSeedUser("B", "CASHIER");
    const order = await newOrder("B");
    const payment = okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CARD", amount: "20.00" }));
    await asSeedUser("B", "TENANT_ADMIN");
    const refund = okData(await invokeAction(createRefundAction, { paymentTransactionId: payment.transactionId, idempotencyKey: key(), amount: "20.00", reason: "Guest changed mind" }));
    expect((await db.transaction.findUniqueOrThrow({ where: { id: refund.transactionId } })).tenantId).toBe(B);
  });
});
