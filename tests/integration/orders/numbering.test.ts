import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createStaffOrderAction } from "@/app/restaurant/orders/actions";
import { COUNTER_LIMITS, formatKotNumber, formatOrderNumber, nextNumber } from "@/lib/data/counters";
import { parseIsoDate } from "@/lib/time/business-date";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { testDb } from "../setup/db";
import { dataOf } from "./helpers";

// TC-ORDER-014 / TC-KOT-002 — race-free daily numbering on TENANT_COUNTER (S1-P12-T003, ADR-010 §6, BA-14).
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");
// Masala Chai has no variants, so a line needs nothing but the item id (ADR-010 §2).
const CHAI_A = seeded("A", "item:masala-chai");
const ctxOf = (tenantId: string) => ({ tenantId }) as never;
const TX = { maxWait: 30_000, timeout: 30_000 };

beforeAll(seedOnce, 120_000);

async function counter(tenantId: string, counterType: "ORDER" | "KOT", date: string): Promise<number | null> {
  const row = await db.tenantCounter.findUnique({ where: { tenantId_counterType_businessDate: { tenantId, counterType, businessDate: parseIsoDate(date) } } });
  return row?.lastValue ?? null;
}

describe("TC-ORDER-014 order numbers under concurrency", () => {
  it("50 concurrent order creations get 50 distinct consecutive numbers; no unique violation", async () => {
    await asSeedUser("A", "CASHIER");
    const results = await Promise.all(
      Array.from({ length: 50 }, () => invokeAction(createStaffOrderAction, { idempotencyKey: randomUUID(), orderType: "TAKEAWAY", items: [{ menuItemId: CHAI_A, quantity: 1 }] })),
    );
    const orders = results.map((r) => dataOf(r).order);
    const numbers = orders.map((o) => o.orderNumber).sort();
    expect(new Set(numbers).size).toBe(50);

    const date = numbers[0].slice(0, 8);
    expect(numbers.every((n) => n.startsWith(`${date}-`))).toBe(true);
    const values = numbers.map((n) => Number(n.slice(9)));
    for (let i = 1; i < values.length; i++) expect(values[i], "consecutive").toBe(values[i - 1] + 1);
    const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    expect(await counter(A, "ORDER", iso)).toBe(values.at(-1));
  }, 120_000);

  it("separate tenants have independent sequences, and a rolled-back transaction gives its number back", async () => {
    const date = parseIsoDate("2031-01-01");
    const [a1, b1] = await Promise.all([
      db.$transaction((tx) => nextNumber(tx as never, ctxOf(A), "ORDER", date), TX),
      db.$transaction((tx) => nextNumber(tx as never, ctxOf(B), "ORDER", date), TX),
    ]);
    expect([a1, b1]).toEqual([1, 1]);

    await expect(
      db.$transaction(async (tx) => {
        expect(await nextNumber(tx as never, ctxOf(A), "ORDER", date)).toBe(2);
        throw new Error("roll back");
      }, TX),
    ).rejects.toThrow("roll back");
    expect(await db.$transaction((tx) => nextNumber(tx as never, ctxOf(A), "ORDER", date), TX)).toBe(2);
  });

  it("stops at 9,999 per business day with DAILY_NUMBER_LIMIT and leaves the counter at the limit", async () => {
    const date = parseIsoDate("2031-02-01");
    await db.tenantCounter.create({ data: { tenantId: A, counterType: "ORDER", businessDate: date, lastValue: COUNTER_LIMITS.ORDER } });
    await expect(db.$transaction((tx) => nextNumber(tx as never, ctxOf(A), "ORDER", date), TX)).rejects.toMatchObject({ code: "DAILY_NUMBER_LIMIT", statusCode: 409 });
    expect(await counter(A, "ORDER", "2031-02-01")).toBe(COUNTER_LIMITS.ORDER);
  });

  it("formats YYYYMMDD-NNNN and K-NNN (BR-ORD-07)", () => {
    expect(formatOrderNumber(parseIsoDate("2026-09-15"), 42)).toBe("20260915-0042");
    expect(formatKotNumber(7)).toBe("K-007");
  });
});

describe("TC-KOT-002 KOT counter", () => {
  it("is race-free per tenant and restarts at 1 on each business date", async () => {
    const day1 = parseIsoDate("2031-03-01");
    const day2 = parseIsoDate("2031-03-02");
    const values = await Promise.all(Array.from({ length: 30 }, () => db.$transaction((tx) => nextNumber(tx as never, ctxOf(A), "KOT", day1), TX)));
    expect([...values].sort((x, y) => x - y)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(await db.$transaction((tx) => nextNumber(tx as never, ctxOf(A), "KOT", day2), TX)).toBe(1);
    expect(await db.$transaction((tx) => nextNumber(tx as never, ctxOf(B), "KOT", day1), TX)).toBe(1);

    await db.tenantCounter.update({
      where: { tenantId_counterType_businessDate: { tenantId: B, counterType: "KOT", businessDate: day1 } },
      data: { lastValue: COUNTER_LIMITS.KOT },
    });
    await expect(db.$transaction((tx) => nextNumber(tx as never, ctxOf(B), "KOT", day1), TX)).rejects.toMatchObject({ code: "DAILY_NUMBER_LIMIT" });
  }, 60_000);
});
