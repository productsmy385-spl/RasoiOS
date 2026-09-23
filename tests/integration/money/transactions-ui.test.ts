import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import TransactionsPage from "@/app/restaurant/transactions/page";
import DayClosePage from "@/app/restaurant/transactions/day-close/page";
import { closeBusinessDayAction, getDayClosePreviewAction, listTransactionsAction, recordPaymentAction, voidTransactionAction } from "@/app/restaurant/transactions/actions";
import { DayCloseForm } from "@/components/transactions/day-close-form";
import { VoidRowAction } from "@/components/transactions/void-transaction";
import { DataTable } from "@/components/ui/data-table";
import type { TransactionListItem } from "@/lib/data/transactions";
import { businessDateFor, toIsoDate } from "@/lib/time/business-date";
import { now } from "@/lib/time/clock";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, invokeLoader, seedOnce, tenantIdOf } from "../helpers/actors";
import { errorOf, key, newOrder, okData } from "./helpers";

/**
 * TC-TXN-009 (transactions screen) and TC-TXN-011 (day close) — S1-P18-T005 and S1-P18-T007.
 *
 * Both pages are Server Components, so they are rendered through `invokeLoader` and asserted on what they resolved:
 * the rows and totals the table receives, and whether a row is offered the void action at all.
 *
 * Order matters here: the void case runs while the day is still open, and the close runs last, because closing today
 * is exactly what stops anything else being recorded against it.
 */
const db = testDb();
const A = tenantIdOf("A");

beforeAll(seedOnce, 120_000);

function propsOf<P>(node: ReactNode, type: unknown): P | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = propsOf<P>(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) return element.props as P;
  return propsOf<P>(element.props.children, type);
}

type TableProps = { rows: TransactionListItem[]; rowActions?: (row: TransactionListItem) => ReactNode };

async function ledger(params: Record<string, string> = {}): Promise<TableProps> {
  const page = await invokeLoader(TransactionsPage, { searchParams: Promise.resolve(params) });
  expect(isValidElement(page)).toBe(true);
  return propsOf<TableProps>(page as ReactNode, DataTable)!;
}

/** Whether this row is offered the void action (the control is only rendered when the caller may use it). */
function canVoid(table: TableProps, row: TransactionListItem): boolean {
  const action = table.rowActions?.(row);
  return propsOf<{ can: boolean }>(action as ReactNode, VoidRowAction)?.can ?? false;
}

const today = () => toIsoDate(businessDateFor(now(), "Asia/Kolkata"));

describe("TC-TXN-009 the transactions screen", () => {
  let upiTransactionId = "";

  it("filters by method and date range, and totals what is being looked at", async () => {
    await asSeedUser("A", "MANAGER");
    const order = await newOrder("A", { basePrice: "300.00", quantity: 1 });
    upiTransactionId = okData(
      await invokeAction(recordPaymentAction, { orderId: order.id, method: "UPI", amount: "315.00", reference: "UPI-REF-9001", idempotencyKey: key() }),
    ).transactionId;

    const filtered = await ledger({ method: "UPI", from: today(), to: today() });
    expect(filtered.rows.length).toBeGreaterThan(0);
    expect(filtered.rows.every((row) => row.method === "UPI")).toBe(true);
    expect(filtered.rows.some((row) => row.id === upiTransactionId)).toBe(true);

    // The totals are the loader's own SUM over the same filters — the page passes them straight through rather than
    // adding up the rows it happens to be showing, so a second page of results cannot make them disagree.
    const upiOnly = okData(await invokeAction(listTransactionsAction, { method: "UPI", from: today(), to: today() }));
    expect(upiOnly.totals.byMethod.CASH).toBe("0.00");
    expect(upiOnly.totals.byMethod.CARD).toBe("0.00");
    expect(upiOnly.totals.count).toBe(upiOnly.items.length);

    const cash = await ledger({ method: "CASH" });
    expect(cash.rows.every((row) => row.method === "CASH")).toBe(true);

    // A value the loader does not know is ignored, not answered with a 422.
    expect((await ledger({ method: "BITCOIN" })).rows.length).toBeGreaterThan(0);
  });

  it("offers the void action to a manager and not to a cashier", async () => {
    await asSeedUser("A", "MANAGER");
    const asManager = await ledger();
    const row = asManager.rows.find((candidate) => candidate.id === upiTransactionId)!;
    expect(canVoid(asManager, row)).toBe(true);

    await asSeedUser("A", "CASHIER");
    const asCashier = await ledger();
    const sameRow = asCashier.rows.find((candidate) => candidate.id === upiTransactionId)!;
    expect(canVoid(asCashier, sameRow)).toBe(false);
    expect(errorOf(await invokeAction(voidTransactionAction, { transactionId: upiTransactionId, reason: "Cashier should not be able to do this" })).code).toBe("FORBIDDEN");
  });

  it("a voided entry stays in the ledger, marked, and stops counting towards the totals", async () => {
    await asSeedUser("A", "MANAGER");
    const netBefore = okData(await invokeAction(listTransactionsAction, {})).totals.net;

    okData(await invokeAction(voidTransactionAction, { transactionId: upiTransactionId, reason: "Charged the wrong table" }));

    const after = await ledger();
    const voided = after.rows.find((row) => row.id === upiTransactionId)!;
    expect(voided.status).toBe("VOIDED");
    // The void reason is its own column: without it the list could show that a correction happened but never why.
    expect(voided.voidReason).toBe("Charged the wrong table");
    // The row is still there — the ledger is append-only (INV-04) — but it no longer counts.
    expect(await db.transaction.count({ where: { id: upiTransactionId } })).toBe(1);
    const netAfter = okData(await invokeAction(listTransactionsAction, {})).totals.net;
    expect(Number(netAfter)).toBeCloseTo(Number(netBefore) - 315, 2);
    // And it is not offered for voiding a second time.
    expect(canVoid(after, voided)).toBe(false);
  });
});

describe("TC-TXN-011 closing the day", () => {
  it("the page shows the ledger's own figures for the restaurant's business date", async () => {
    await asSeedUser("A", "MANAGER");
    const page = await invokeLoader(DayClosePage, { searchParams: Promise.resolve({}) });
    expect(isValidElement(page)).toBe(true);

    const preview = okData(await invokeAction(getDayClosePreviewAction, {}));
    expect(preview.businessDate).toBe(today());
    expect(preview.alreadyClosed).toBe(false);
    expect(propsOf<{ preview: { businessDate: string } }>(page as ReactNode, DayCloseForm)!.preview.businessDate).toBe(today());
  });

  it("refuses to close with a difference that is not explained", async () => {
    await asSeedUser("A", "MANAGER");
    const preview = okData(await invokeAction(getDayClosePreviewAction, {}));
    const over = `${Number(preview.expectedCash.split(".")[0]) + 50}.00`;

    const closesBefore = await db.businessDayClose.count({ where: { tenantId: A } });
    const refused = errorOf(await invokeAction(closeBusinessDayAction, { businessDate: today(), countedCash: over, notes: "" }));
    expect(refused.fieldErrors?.notes?.[0]).toMatch(/short|over/i);
    expect(await db.businessDayClose.count({ where: { tenantId: A } })).toBe(closesBefore);
  });

  it("closes with a note, then blocks anything else being recorded against that day", async () => {
    await asSeedUser("A", "MANAGER");
    const order = await newOrder("A", { basePrice: "100.00", quantity: 1 });
    const preview = okData(await invokeAction(getDayClosePreviewAction, {}));
    const short = preview.expectedCash === "0.00" ? "0.00" : `${Number(preview.expectedCash.split(".")[0]) - 10}.00`;

    const closed = okData(await invokeAction(closeBusinessDayAction, { businessDate: today(), countedCash: short, notes: "Ten rupees short: change given from the float." }));
    expect(closed.businessDate).toBe(today());
    expect(closed.notes).toBe("Ten rupees short: change given from the float.");

    // A cash payment for the same day is now refused, and the ledger did not move.
    const before = await db.transaction.count({ where: { tenantId: A } });
    const blocked = errorOf(await invokeAction(recordPaymentAction, { orderId: order.id, method: "CASH", amount: "105.00", idempotencyKey: key() }));
    expect(blocked.code).toBe("DAY_CLOSED");
    expect(blocked.message).toMatch(/closed/i);
    expect(await db.transaction.count({ where: { tenantId: A } })).toBe(before);

    // And the page says so instead of offering the form again.
    const page = await invokeLoader(DayClosePage, { searchParams: Promise.resolve({}) });
    expect(propsOf<unknown>(page as ReactNode, DayCloseForm)).toBeUndefined();
    expect(okData(await invokeAction(getDayClosePreviewAction, {})).alreadyClosed).toBe(true);
  });
});
