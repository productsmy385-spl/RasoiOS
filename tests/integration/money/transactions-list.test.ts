import { beforeAll, describe, expect, it } from "vitest";
import { listTransactionsAction } from "@/app/restaurant/transactions/actions";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, tenantIdOf } from "../helpers/actors";
import { errorOf, money, okData } from "./helpers";

// TC-TXN-001 — LD-TXN-01 (S1-P18-T004): filters, exact decimal totals by method, a cursor, a 92-day cap, and never a
// row from another tenant.
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");

beforeAll(seedOnce, 120_000);

describe("TC-TXN-001 transaction list", () => {
  it("returns this tenant's ledger with totals that match a direct sum", async () => {
    await asSeedUser("A", "MANAGER");
    const { items, totals } = okData(await invokeAction(listTransactionsAction, { limit: 200 }));
    expect(items.length).toBeGreaterThan(0);

    const ids = items.map((t) => t.id);
    expect(await db.transaction.count({ where: { id: { in: ids }, tenantId: { not: A } } })).toBe(0);

    const rows = await db.transaction.findMany({ where: { tenantId: A, status: "SUCCESS" }, select: { type: true, paymentMethod: true, amount: true } });
    const expected = rows.reduce(
      (acc, r) => {
        const amount = Number(r.amount);
        if (r.type === "PAYMENT") acc.payments += amount;
        else acc.refunds += amount;
        return acc;
      },
      { payments: 0, refunds: 0 },
    );
    expect(Number(totals.payments)).toBeCloseTo(expected.payments, 2);
    expect(Number(totals.refunds)).toBeCloseTo(expected.refunds, 2);
    expect(Number(totals.net)).toBeCloseTo(expected.payments - expected.refunds, 2);
    // Money is reported as exact two-decimal strings, never floats.
    for (const value of [totals.payments, totals.refunds, totals.net, ...Object.values(totals.byMethod)]) {
      expect(value).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it("filters by type, method, status and search, and pages with a cursor", async () => {
    await asSeedUser("A", "MANAGER");
    const refunds = okData(await invokeAction(listTransactionsAction, { type: "REFUND" }));
    expect(refunds.items.every((t) => t.type === "REFUND")).toBe(true);

    const cash = okData(await invokeAction(listTransactionsAction, { method: "CASH" }));
    expect(cash.items.every((t) => t.method === "CASH")).toBe(true);

    const voided = okData(await invokeAction(listTransactionsAction, { status: "VOIDED" }));
    expect(voided.items.every((t) => t.status === "VOIDED")).toBe(true);

    const first = okData(await invokeAction(listTransactionsAction, { limit: 1 }));
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBeTruthy();
    const second = okData(await invokeAction(listTransactionsAction, { limit: 1, cursor: first.nextCursor! }));
    expect(second.items[0]?.id).not.toBe(first.items[0].id);

    const byOrderNumber = okData(await invokeAction(listTransactionsAction, { q: first.items[0].orderNumber }));
    expect(byOrderNumber.items.map((t) => t.orderNumber)).toContain(first.items[0].orderNumber);
  });

  it("limits the window to a quarter and rejects a reversed range", async () => {
    await asSeedUser("A", "MANAGER");
    const ranged = okData(await invokeAction(listTransactionsAction, { from: "2026-09-01", to: "2026-09-30" }));
    expect(ranged.items.every((t) => t.businessDate >= "2026-09-01" && t.businessDate <= "2026-09-30")).toBe(true);

    expect(errorOf(await invokeAction(listTransactionsAction, { from: "2026-01-01", to: "2026-12-31" })).code).toBe("VALIDATION_ERROR");
    expect(errorOf(await invokeAction(listTransactionsAction, { from: "2026-09-30", to: "2026-09-01" })).code).toBe("VALIDATION_ERROR");
    expect(errorOf(await invokeAction(listTransactionsAction, { tenantId: B } as never)).code).toBe("VALIDATION_ERROR");
  });

  it("TI-030 needs transaction:read: KITCHEN and WAITER are refused", async () => {
    for (const role of ["KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      expect(errorOf(await invokeAction(listTransactionsAction, {})).code, role).toBe("FORBIDDEN");
    }
  });

  it("reports what was tendered and what is still refundable", async () => {
    await asSeedUser("A", "MANAGER");
    const { items } = okData(await invokeAction(listTransactionsAction, { type: "PAYMENT", method: "CASH", limit: 50 }));
    const withChange = items.find((t) => t.changeDue !== null);
    if (withChange) {
      const row = await db.transaction.findUniqueOrThrow({ where: { id: withChange.id } });
      expect(withChange.amountTendered).toBe(money(row.amountTendered));
      expect(withChange.changeDue).toBe(money(row.changeDue));
    }
    const refundable = items.find((t) => t.refundable !== null);
    if (refundable) expect(refundable.refundable).toMatch(/^\d+\.\d{2}$/);
  });
});
