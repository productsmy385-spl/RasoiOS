import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { recordPaymentAction } from "@/app/restaurant/transactions/actions";
import { businessDateFor, toIsoDate } from "@/lib/time";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { comparable, errorOf, key, ledgerCount, money, newOrder, okData, orderRow } from "./helpers";

// SA-TXN-01 recordPaymentAction (S1-P04-T007): payment:record, tenant from the membership, ledger rules of
// ADR-010 §8 / INV-04, idempotency (§7) and the transactional audit row (SC-AUD-02).
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");

beforeAll(seedOnce, 120_000);

describe("TC-TXN-002 / TC-TXN-005 recording payments", () => {
  it("CASHIER records a CARD payment ≤ outstanding: ledger row, order totals, payment status and audit commit together", async () => {
    const { userId } = await asSeedUser("A", "CASHIER");
    const order = await newOrder("A"); // 210.00
    const before = await orderRow(order.id);

    const data = okData(
      await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CARD", amount: "100.00", reference: "SLIP-0001" }),
    );
    expect(data).toMatchObject({ orderId: order.id, method: "CARD", amount: "100.00", amountTendered: null, changeDue: null, paymentStatus: "PARTIALLY_PAID", paidAmount: "100.00", balance: "110.00", replayed: false });

    const row = await db.transaction.findUniqueOrThrow({ where: { id: data.transactionId } });
    expect(row).toMatchObject({ tenantId: A, orderId: order.id, type: "PAYMENT", status: "SUCCESS", paymentMethod: "CARD", reference: "SLIP-0001", recordedByUserId: userId });
    expect(money(row.amount)).toBe("100.00");
    expect(toIsoDate(row.businessDate)).toBe(toIsoDate(businessDateFor(new Date(), "Asia/Kolkata")));

    const after = await orderRow(order.id);
    expect(money(after.paidAmount)).toBe("100.00");
    expect(after.paymentStatus).toBe("PARTIALLY_PAID");
    expect(after.status).toBe("READY");
    expect(after.version).toBe(before.version + 1);

    const audits = await db.auditLog.findMany({ where: { tenantId: A, action: "payment.recorded", resourceId: data.transactionId } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actorUserId: userId, actorRole: "CASHIER", resourceType: "transaction" });
    expect(audits[0].afterState).toMatchObject({ orderId: order.id, amount: "100.00", paymentStatus: "PARTIALLY_PAID", paidAmount: "100.00" });
  });

  it("ADV-011 overpayment by CARD is rejected with AMOUNT_EXCEEDS_BALANCE and changes nothing", async () => {
    await asSeedUser("A", "CASHIER");
    const order = await newOrder("A"); // 210.00
    const auditsBefore = await db.auditLog.count({ where: { tenantId: A } });

    const error = errorOf(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CARD", amount: "210.01" }));
    expect(error).toMatchObject({ code: "AMOUNT_EXCEEDS_BALANCE", fieldErrors: { amount: ["At most 210.00"] } });

    expect(await ledgerCount({ orderId: order.id })).toBe(0);
    const after = await orderRow(order.id);
    expect(money(after.paidAmount)).toBe("0.00");
    expect(after.paymentStatus).toBe("UNPAID");
    expect(await db.auditLog.count({ where: { tenantId: A } })).toBe(auditsBefore);
  });

  it("TC-TXN-002 cash tendered 1000 for 840 records change 160 and settles the order", async () => {
    await asSeedUser("A", "CASHIER");
    const order = await newOrder("A", { quantity: 2, basePrice: "400.00" }); // 800 + 40 = 840.00
    expect(money(order.totalAmount)).toBe("840.00");

    const data = okData(
      await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CASH", amount: "840.00", amountTendered: "1000.00" }),
    );
    expect(data).toMatchObject({ amount: "840.00", amountTendered: "1000.00", changeDue: "160.00", paymentStatus: "PAID", balance: "0.00" });

    const row = await db.transaction.findUniqueOrThrow({ where: { id: data.transactionId } });
    expect([money(row.amount), money(row.amountTendered), money(row.changeDue)]).toEqual(["840.00", "1000.00", "160.00"]);
    const after = await orderRow(order.id);
    // Settling the bill does not complete the order: staff move READY → COMPLETED (BR-ORD-06, Q-007 A; BA-20).
    expect(after).toMatchObject({ paymentStatus: "PAID", status: "READY" });
    expect(money(after.paidAmount)).toBe("840.00");
    expect(await db.auditLog.count({ where: { tenantId: A, action: "order.status_changed", resourceId: order.id } })).toBe(0);
  });

  it("CASH above the balance applies only the balance; the surplus is change (ADR-010 §8)", async () => {
    await asSeedUser("A", "CASHIER");
    const order = await newOrder("A"); // 210.00
    okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "UPI", amount: "10.00", reference: "UPI-123456789012" }));

    const data = okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CASH", amount: "500.00" }));
    expect(data).toMatchObject({ amount: "200.00", amountTendered: "500.00", changeDue: "300.00", paymentStatus: "PAID", paidAmount: "210.00", balance: "0.00" });
  });

  it("TC-TXN-005 UNPAID → PARTIALLY_PAID → PAID, then nothing more can be paid", async () => {
    await asSeedUser("A", "CASHIER");
    const order = await newOrder("A"); // 210.00
    expect((await orderRow(order.id)).paymentStatus).toBe("UNPAID");
    okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CARD", amount: "10.00" }));
    expect((await orderRow(order.id)).paymentStatus).toBe("PARTIALLY_PAID");
    okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CARD", amount: "200.00" }));
    expect((await orderRow(order.id)).paymentStatus).toBe("PAID");

    const again = errorOf(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CASH", amount: "1.00" }));
    expect(again.code).toBe("AMOUNT_EXCEEDS_BALANCE");
  });

  it("TC-TXN-005 a repeated idempotency key returns the original transaction and records nothing new", async () => {
    await asSeedUser("A", "CASHIER");
    const order = await newOrder("A");
    const input = { orderId: order.id, idempotencyKey: key(), method: "CARD" as const, amount: "50.00" };

    const first = okData(await invokeAction(recordPaymentAction, input));
    const second = okData(await invokeAction(recordPaymentAction, input));
    expect(second.transactionId).toBe(first.transactionId);
    expect(second).toMatchObject({ replayed: true, amount: "50.00", paidAmount: "50.00" });

    expect(await ledgerCount({ orderId: order.id })).toBe(1);
    expect(money((await orderRow(order.id)).paidAmount)).toBe("50.00");
    expect(await db.auditLog.count({ where: { tenantId: A, action: "payment.recorded", resourceId: first.transactionId } })).toBe(1);
  });

  it("TC-TXN-005 concurrent submits with one key record one payment", async () => {
    await asSeedUser("A", "CASHIER");
    const order = await newOrder("A");
    const input = { orderId: order.id, idempotencyKey: key(), method: "CARD" as const, amount: "60.00" };

    const results = await Promise.all([invokeAction(recordPaymentAction, input), invokeAction(recordPaymentAction, input), invokeAction(recordPaymentAction, input)]);
    const ids = new Set(results.map((r) => okData(r).transactionId));
    expect(ids.size).toBe(1);
    expect(await ledgerCount({ orderId: order.id })).toBe(1);
    expect(money((await orderRow(order.id)).paidAmount)).toBe("60.00");
  });

  it("TC-TXN-005 concurrent payments cannot exceed the total", async () => {
    await asSeedUser("A", "CASHIER");
    const order = await newOrder("A"); // 210.00
    const pay = () => invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CARD", amount: "210.00" });

    const results = await Promise.all([pay(), pay(), pay()]);
    const succeeded = results.filter((r) => (r as { ok?: boolean }).ok === true);
    expect(succeeded).toHaveLength(1);
    for (const r of results.filter((x) => (x as { ok?: boolean }).ok !== true)) {
      expect(errorOf(r).code).toMatch(/^(AMOUNT_EXCEEDS_BALANCE|ORDER_CHANGED)$/);
    }
    const after = await orderRow(order.id);
    expect(money(after.paidAmount)).toBe("210.00");
    expect(await ledgerCount({ orderId: order.id })).toBe(1);
  });

  it("rejects payments on cancelled and refunded orders (ORDER_NOT_PAYABLE)", async () => {
    await asSeedUser("A", "CASHIER");
    for (const label of ["order:o6", "order:o7"]) {
      const orderId = seeded("A", label);
      const before = await ledgerCount({ orderId });
      const error = errorOf(await invokeAction(recordPaymentAction, { orderId, idempotencyKey: key(), method: "CARD", amount: "1.00" }));
      expect(error.code).toBe("ORDER_NOT_PAYABLE");
      expect(await ledgerCount({ orderId })).toBe(before);
    }
  });
});

describe("ADV-011 / TC-TXN-002 input validation", () => {
  it("rejects negative, exponent, over-precise and numeric amounts", async () => {
    await asSeedUser("A", "CASHIER");
    const orderId = seeded("A", "order:o1");
    for (const amount of ["-10.00", "0", "0.00", "1e3", "10.005", " 10", 10] as unknown[]) {
      const error = errorOf(await invokeAction(recordPaymentAction, { orderId, idempotencyKey: key(), method: "CARD", amount } as never));
      expect(error.code, String(amount)).toBe("VALIDATION_ERROR");
    }
    expect(await ledgerCount({ orderId })).toBe(0);
  });

  it("requires a UPI reference and never accepts a card number as a reference", async () => {
    await asSeedUser("A", "CASHIER");
    const orderId = seeded("A", "order:o1");

    const noRef = errorOf(await invokeAction(recordPaymentAction, { orderId, idempotencyKey: key(), method: "UPI", amount: "1.00" }));
    expect(noRef).toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { reference: ["Enter the UPI reference"] } });

    for (const reference of ["4111111111111111", "4111-1111-1111-1111", "REF5500000000000004"]) {
      const pan = errorOf(await invokeAction(recordPaymentAction, { orderId, idempotencyKey: key(), method: "CARD", amount: "1.00", reference }));
      expect(pan.code, reference).toBe("VALIDATION_ERROR");
      expect(pan.fieldErrors?.reference?.[0]).toMatch(/card number/);
    }

    const tenderedOnCard = errorOf(await invokeAction(recordPaymentAction, { orderId, idempotencyKey: key(), method: "CARD", amount: "1.00", amountTendered: "5.00" }));
    expect(tenderedOnCard).toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { amountTendered: ["Amount tendered applies to cash payments only"] } });

    const shortCash = errorOf(await invokeAction(recordPaymentAction, { orderId, idempotencyKey: key(), method: "CASH", amount: "5.00", amountTendered: "4.00" }));
    expect(shortCash.fieldErrors?.amountTendered).toEqual(["Amount tendered must cover the amount"]);

    expect(await ledgerCount({ orderId })).toBe(0);
  });

  it("TC-TENANT-006 rejects tenantId, totals and other unknown keys with VALIDATION_ERROR", async () => {
    await asSeedUser("A", "CASHIER");
    const orderId = seeded("A", "order:o1");
    const base = { orderId, idempotencyKey: key(), method: "CARD", amount: "1.00" };
    for (const extra of [{ tenantId: A }, { tenantId: B }, { total: "0.01" }, { paidAmount: "999.00" }, { paymentStatus: "PAID" }]) {
      const error = errorOf(await invokeAction(recordPaymentAction, { ...base, idempotencyKey: key(), ...extra } as never));
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.fieldErrors?._?.[0]).toMatch(/^Unknown field\(s\): /);
    }
    const missingKey = errorOf(await invokeAction(recordPaymentAction, { orderId, method: "CARD", amount: "1.00" } as never));
    expect(missingKey.fieldErrors).toHaveProperty("idempotencyKey");
    expect(await ledgerCount({ orderId })).toBe(0);
  });
});

describe("TI-029 tenant isolation and RBAC", () => {
  it("TI-029 Tenant A paying a Tenant B order gets NOT_FOUND, identical to a random id, and nothing is written", async () => {
    await asSeedUser("A", "CASHIER");
    const bOrderId = seeded("B", "order:o1");
    const bBefore = await orderRow(bOrderId);
    const bLedger = await ledgerCount({ tenantId: B });

    const foreign = errorOf(await invokeAction(recordPaymentAction, { orderId: bOrderId, idempotencyKey: key(), method: "CARD", amount: "1.00" }));
    const random = errorOf(await invokeAction(recordPaymentAction, { orderId: randomUUID(), idempotencyKey: key(), method: "CARD", amount: "1.00" }));
    expect(foreign.code).toBe("NOT_FOUND");
    expect(comparable(foreign)).toEqual(comparable(random));

    expect(await ledgerCount({ tenantId: B })).toBe(bLedger);
    const bAfter = await orderRow(bOrderId);
    expect({ paid: money(bAfter.paidAmount), status: bAfter.paymentStatus, version: bAfter.version }).toEqual({
      paid: money(bBefore.paidAmount),
      status: bBefore.paymentStatus,
      version: bBefore.version,
    });
  });

  it("Tenant A reusing a Tenant B idempotency key records its own payment (keys are per tenant)", async () => {
    await asSeedUser("A", "CASHIER");
    const bRow = await db.transaction.findUniqueOrThrow({ where: { id: seeded("B", "order:o5:tx:p1") } });
    const order = await newOrder("A");
    const data = okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: bRow.idempotencyKey, method: "CARD", amount: "5.00" }));
    expect(data.replayed).toBe(false);
    expect(data.transactionId).not.toBe(bRow.id);
    expect((await db.transaction.findUniqueOrThrow({ where: { id: data.transactionId } })).tenantId).toBe(A);
  });

  it("KITCHEN and WAITER cannot record payments (FORBIDDEN before any lookup)", async () => {
    for (const role of ["KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      for (const orderId of [seeded("A", "order:o1"), seeded("B", "order:o1"), randomUUID()]) {
        const error = errorOf(await invokeAction(recordPaymentAction, { orderId, idempotencyKey: key(), method: "CARD", amount: "1.00" }));
        expect(error.code, role).toBe("FORBIDDEN");
      }
    }
    expect(await ledgerCount({ orderId: seeded("A", "order:o1") })).toBe(0);
  });

  it("TENANT_ADMIN and MANAGER may record payments", async () => {
    for (const role of ["TENANT_ADMIN", "MANAGER"] as const) {
      await asSeedUser("A", role);
      const order = await newOrder("A");
      okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CARD", amount: "1.00" }));
    }
  });
});
