import { randomUUID } from "node:crypto";
import type { ReactElement } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { listBillableOrdersAction, listTransactionsAction, recordPaymentAction } from "@/app/restaurant/transactions/actions";
import ReceiptPage from "@/app/restaurant/billing/receipt/[orderId]/page";
import TransactionsPage from "@/app/restaurant/transactions/page";
import type { ReceiptDto } from "@/lib/data/receipts";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, invokeLoader, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { errorOf, key, money, newOrder, okData } from "./helpers";

// LD-TXN-01 transactions list, LD-RCPT-01 receipt (S1-P04-T007, S1-P04-T008 / BA-02).
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");

beforeAll(seedOnce, 120_000);

const receiptOf = (orderId: string) => invokeLoader(ReceiptPage, { params: Promise.resolve({ orderId }) });

function receiptData(result: unknown): ReceiptDto {
  expect(result, JSON.stringify(result)).toHaveProperty("props.data");
  return (result as ReactElement<{ data: ReceiptDto }>).props.data;
}

async function ledgerSums(tenantId: string, where: Prisma.TransactionWhereInput = {}) {
  const groups = await db.transaction.groupBy({ by: ["type"], where: { tenantId, status: "SUCCESS", ...where }, _sum: { amount: true } });
  const sum = (type: "PAYMENT" | "REFUND") => groups.find((g) => g.type === type)?._sum.amount ?? new Prisma.Decimal(0);
  return { payments: sum("PAYMENT"), refunds: sum("REFUND") };
}

describe("TI-028 transactions list", () => {
  it("TI-028 Tenant A's list and totals contain Tenant A rows only (count and sums match the database)", async () => {
    await asSeedUser("A", "CASHIER");
    const list = okData(await invokeAction(listTransactionsAction, { limit: 200 }));

    const aRows = await db.transaction.findMany({ where: { tenantId: A }, select: { id: true } });
    const bIds = new Set((await db.transaction.findMany({ where: { tenantId: B }, select: { id: true } })).map((t) => t.id));
    expect(aRows.length).toBeGreaterThan(0);
    expect(bIds.size).toBeGreaterThan(0);
    expect(list.items).toHaveLength(aRows.length);
    expect(new Set(list.items.map((t) => t.id))).toEqual(new Set(aRows.map((t) => t.id)));
    expect(list.items.filter((t) => bIds.has(t.id))).toEqual([]);

    const aOrderIds = new Set((await db.order.findMany({ where: { tenantId: A }, select: { id: true } })).map((o) => o.id));
    expect(list.items.every((t) => aOrderIds.has(t.orderId))).toBe(true);

    const sums = await ledgerSums(A);
    expect(list.totals).toMatchObject({ payments: money(sums.payments), refunds: money(sums.refunds), net: money(sums.payments.minus(sums.refunds)) });
    expect(list.totals.count).toBe(await db.transaction.count({ where: { tenantId: A, status: "SUCCESS" } }));
    for (const amount of [list.totals.payments, list.totals.refunds, list.totals.net, ...list.items.map((t) => t.amount)]) {
      expect(amount).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it("filters stay inside the tenant; a tenantId filter is rejected", async () => {
    await asSeedUser("A", "MANAGER");
    const refunds = okData(await invokeAction(listTransactionsAction, { type: "REFUND" }));
    expect(refunds.items.length).toBeGreaterThan(0);
    expect(refunds.items.every((t) => t.type === "REFUND")).toBe(true);
    expect(refunds.items).toHaveLength(await db.transaction.count({ where: { tenantId: A, type: "REFUND" } }));

    // Seeded references are REF-<ORDER>-<TENANT>; searching for Tenant B's from Tenant A finds nothing.
    const own = okData(await invokeAction(listTransactionsAction, { q: "REF-O4-A" }));
    expect(own.items.map((t) => t.id)).toEqual([seeded("A", "order:o4:tx:p1")]);
    const search = okData(await invokeAction(listTransactionsAction, { q: "REF-O4-B" }));
    expect(search.items).toEqual([]);
    expect(search.totals).toMatchObject({ payments: "0.00", refunds: "0.00", count: 0 });

    const withTenant = errorOf(await invokeAction(listTransactionsAction, { tenantId: B } as never));
    expect(withTenant.code).toBe("VALIDATION_ERROR");
  });

  it("KITCHEN and WAITER are forbidden from the transactions list and page", async () => {
    for (const role of ["KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      expect(errorOf(await invokeAction(listTransactionsAction)).code).toBe("FORBIDDEN");
      expect(await invokeLoader(TransactionsPage, { searchParams: Promise.resolve({}) })).toEqual({ redirect: "/account/forbidden" });
    }
  });

  it("the transactions page renders for a CASHIER", async () => {
    await asSeedUser("A", "CASHIER");
    const page = await invokeLoader(TransactionsPage, { searchParams: Promise.resolve({}) });
    expect(page).toHaveProperty("props");
  });

  it("the billing work queue lists Tenant A orders awaiting settlement only", async () => {
    await asSeedUser("A", "CASHIER");
    const orders = okData(await invokeAction(listBillableOrdersAction));
    const expected = await db.order.findMany({
      where: { tenantId: A, status: { notIn: ["CANCELLED", "REFUNDED"] }, paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      select: { id: true },
    });
    expect(new Set(orders.map((o) => o.id))).toEqual(new Set(expected.map((o) => o.id)));
    const o4 = orders.find((o) => o.id === seeded("A", "order:o4"))!;
    const o4Row = await db.order.findUniqueOrThrow({ where: { id: o4.id } });
    expect(o4).toMatchObject({ paymentStatus: "PARTIALLY_PAID", total: money(o4Row.totalAmount), balance: money(o4Row.totalAmount.minus(o4Row.paidAmount)) });

    await asSeedUser("A", "KITCHEN");
    expect(errorOf(await invokeAction(listBillableOrdersAction)).code).toBe("FORBIDDEN");
  });
});

describe("TC-SEC-018 receipt / TI-035 (BA-02)", () => {
  it("TC-SEC-018 receipt: a Tenant A user requesting a Tenant B receipt gets not-found, exactly like a random or malformed id", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    for (const label of ["order:o1", "order:o5", "order:o7"]) {
      expect(await receiptOf(seeded("B", label))).toEqual({ notFound: true });
    }
    expect(await receiptOf(randomUUID())).toEqual({ notFound: true });
    expect(await receiptOf("not-a-uuid")).toEqual({ notFound: true });
    expect(await receiptOf("' OR 1=1 --")).toEqual({ notFound: true });

    // The same order is visible to its own tenant.
    await asSeedUser("B", "CASHIER");
    expect(receiptData(await receiptOf(seeded("B", "order:o5"))).orderId).toBe(seeded("B", "order:o5"));
  });

  it("TC-TXN-008 KITCHEN and WAITER are forbidden from receipts (permission checked before the lookup)", async () => {
    for (const role of ["KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      expect(await receiptOf(seeded("A", "order:o5"))).toEqual({ redirect: "/account/forbidden" });
      expect(await receiptOf(seeded("B", "order:o5"))).toEqual({ redirect: "/account/forbidden" });
    }
  });

  it("TC-TXN-008 receipt totals reconcile to the order and the ledger (o4 part-paid, o5 paid, o3 voided payment, y3 part-refunded, o7 refunded)", async () => {
    await asSeedUser("A", "CASHIER");
    for (const label of ["order:o4", "order:o5", "order:o3", "order:y3", "order:o7"]) {
      const orderId = seeded("A", label);
      const receipt = receiptData(await receiptOf(orderId));
      const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
      const ledger = await ledgerSums(A, { orderId });

      expect(receipt.totals.subtotal, label).toBe(money(order.subtotalAmount));
      expect(receipt.totals.tax, label).toBe(money(order.taxAmount));
      expect(receipt.totals.total, label).toBe(money(order.totalAmount));
      expect(receipt.totals.subtotal).toBe(money(order.items.reduce((s, i) => s.plus(i.lineSubtotal), new Prisma.Decimal(0))));
      expect(receipt.totals.tax).toBe(money(order.items.reduce((s, i) => s.plus(i.lineTax), new Prisma.Decimal(0))));
      expect(new Prisma.Decimal(receipt.totals.subtotal).plus(receipt.totals.tax).toFixed(2)).toBe(receipt.totals.total);

      expect(receipt.totals.paid, label).toBe(money(ledger.payments));
      expect(receipt.totals.refunded, label).toBe(money(ledger.refunds));
      expect(receipt.totals.paid, label).toBe(money(order.paidAmount));
      expect(receipt.totals.refunded, label).toBe(money(order.refundedAmount));
      expect(receipt.totals.balance).toBe(money(order.totalAmount.minus(order.paidAmount).plus(order.refundedAmount)));
      expect(receipt.paymentStatus).toBe(order.paymentStatus);
      expect(receipt.items).toHaveLength(order.items.length);
      expect(receipt.currencyCode).toBe("INR");
    }

    // The voided payment on o3 is not printed.
    const o3 = receiptData(await receiptOf(seeded("A", "order:o3")));
    expect(o3.ledger).toEqual([]);
    expect(o3.totals.paid).toBe("0.00");
  });

  it("a receipt reflects a payment just recorded and exposes no customer contact details", async () => {
    await asSeedUser("A", "CASHIER");
    const order = await newOrder("A");
    okData(await invokeAction(recordPaymentAction, { orderId: order.id, idempotencyKey: key(), method: "CASH", amount: "210.00", amountTendered: "300.00" }));
    const receipt = receiptData(await receiptOf(order.id));
    expect(receipt.totals).toMatchObject({ total: "210.00", paid: "210.00", refunded: "0.00", balance: "0.00" });
    expect(receipt.ledger).toMatchObject([{ type: "PAYMENT", method: "CASH", amount: "210.00", amountTendered: "300.00", changeDue: "90.00" }]);

    const o5 = await db.order.findUniqueOrThrow({ where: { id: seeded("A", "order:o5") }, include: { customer: true } });
    const printed = JSON.stringify(receiptData(await receiptOf(o5.id)));
    expect(printed).toContain(o5.customer!.fullName);
    for (const contact of [o5.customer!.phoneE164, o5.customer!.email].filter((v): v is string => Boolean(v))) {
      expect(printed).not.toContain(contact);
    }
  });
});
