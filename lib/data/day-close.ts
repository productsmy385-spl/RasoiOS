import "server-only";
import { OrderStatus, PaymentMethod, Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { db } from "@/lib/db/prisma";
import { MONEY_ZERO, sumMoney, type Money } from "@/lib/money";
import { audit } from "@/lib/audit/write";
import { businessDateDto, moneyDto } from "./dto";
import { mapErrors } from "./errors";
import { required, tenantScope } from "./scope";
import type { Tx } from "./tx";

/**
 * Business day close (S1-P18-T003; api.md LD-TXN-02, SA-TXN-04). Closing a day freezes it: no order, payment or void
 * may be recorded against that business date afterwards. Every total is summed from the ledger in NUMERIC — money
 * never becomes a JavaScript number (ADR-010 §1).
 */
export type DayClosePreview = {
  businessDate: string;
  expectedCash: string;
  cardTotal: string;
  upiTotal: string;
  refundTotal: string;
  orderCount: number;
  openOrderCount: number;
  alreadyClosed: boolean;
};

const OPEN_ORDER_STATUSES: OrderStatus[] = [OrderStatus.NEW, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY];

/** Successful payments of one method on the business date, minus nothing — refunds are counted separately. */
async function ledgerTotal(client: Tx, ctx: TenantContext, businessDate: Date, type: TransactionType, method?: PaymentMethod): Promise<Money> {
  const rows = await client.transaction.findMany({
    where: tenantScope(ctx, { businessDate, status: TransactionStatus.SUCCESS, type, ...(method ? { paymentMethod: method } : {}) }),
    select: { amount: true },
  });
  return sumMoney(rows.map((r) => r.amount));
}

/** LD-TXN-02 — what the day looks like before it is closed. */
export async function dayClosePreview(ctx: TenantContext, businessDate: Date, client: Tx = db): Promise<DayClosePreview> {
  return mapErrors("Business day", async () => {
    const [cash, card, upi, refunds, orderCount, openOrderCount, existing] = await Promise.all([
      ledgerTotal(client, ctx, businessDate, TransactionType.PAYMENT, PaymentMethod.CASH),
      ledgerTotal(client, ctx, businessDate, TransactionType.PAYMENT, PaymentMethod.CARD),
      ledgerTotal(client, ctx, businessDate, TransactionType.PAYMENT, PaymentMethod.UPI),
      ledgerTotal(client, ctx, businessDate, TransactionType.REFUND),
      client.order.count({ where: tenantScope(ctx, { businessDate }) }),
      client.order.count({ where: tenantScope(ctx, { businessDate, status: { in: OPEN_ORDER_STATUSES } }) }),
      client.businessDayClose.findFirst({ where: tenantScope(ctx, { businessDate }), select: { id: true } }),
    ]);

    // Cash refunds come out of the drawer, so they reduce the cash the till should hold.
    const cashRefunds = await client.transaction.findMany({
      where: tenantScope(ctx, { businessDate, status: TransactionStatus.SUCCESS, type: TransactionType.REFUND, paymentMethod: PaymentMethod.CASH }),
      select: { amount: true },
    });

    return {
      businessDate: businessDateDto(businessDate),
      expectedCash: moneyDto(cash.minus(sumMoney(cashRefunds.map((r) => r.amount)))),
      cardTotal: moneyDto(card),
      upiTotal: moneyDto(upi),
      refundTotal: moneyDto(refunds),
      orderCount,
      openOrderCount,
      alreadyClosed: existing !== null,
    };
  });
}

export type DayCloseRow = {
  id: string;
  businessDate: string;
  expectedCash: string;
  countedCash: string;
  cashVariance: string;
  cardTotal: string;
  upiTotal: string;
  refundTotal: string;
  orderCount: number;
  openOrderCount: number;
  notes: string | null;
  closedAt: string;
};

/** Writes the close inside the caller's transaction, after the preview has been computed from the same snapshot. */
export async function insertDayClose(
  tx: Tx,
  ctx: TenantContext,
  businessDate: Date,
  preview: DayClosePreview,
  input: { countedCash: Money; notes: string | null },
): Promise<DayCloseRow> {
  const expectedCash = new Prisma.Decimal(preview.expectedCash);
  const row = await tx.businessDayClose.create({
    data: {
      tenantId: ctx.tenantId,
      businessDate,
      expectedCash,
      countedCash: input.countedCash,
      cashVariance: input.countedCash.minus(expectedCash),
      cardTotal: new Prisma.Decimal(preview.cardTotal),
      upiTotal: new Prisma.Decimal(preview.upiTotal),
      refundTotal: new Prisma.Decimal(preview.refundTotal),
      orderCount: preview.orderCount,
      openOrderCount: preview.openOrderCount,
      notes: input.notes,
      closedByUserId: ctx.userId,
    },
  });

  await audit(tx, ctx, {
    action: "day_close.performed",
    resourceType: "business_day_close",
    resourceId: row.id,
    after: {
      businessDate: preview.businessDate,
      expectedCash: preview.expectedCash,
      countedCash: moneyDto(input.countedCash),
      cashVariance: moneyDto(row.cashVariance),
      cardTotal: preview.cardTotal,
      upiTotal: preview.upiTotal,
      refundTotal: preview.refundTotal,
      orderCount: preview.orderCount,
      openOrderCount: preview.openOrderCount,
    },
    reason: input.notes,
  });

  return {
    id: row.id,
    businessDate: businessDateDto(row.businessDate),
    expectedCash: moneyDto(row.expectedCash),
    countedCash: moneyDto(row.countedCash),
    cashVariance: moneyDto(row.cashVariance),
    cardTotal: moneyDto(row.cardTotal),
    upiTotal: moneyDto(row.upiTotal),
    refundTotal: moneyDto(row.refundTotal),
    orderCount: row.orderCount,
    openOrderCount: row.openOrderCount,
    notes: row.notes,
    closedAt: row.createdAt.toISOString(),
  };
}

/** The close of one business date, or null while the day is still open. */
export async function findDayClose(client: Tx, ctx: TenantContext, businessDate: Date): Promise<{ id: string } | null> {
  return client.businessDayClose.findFirst({ where: tenantScope(ctx, { businessDate }), select: { id: true } });
}

/** Marks a ledger row VOIDED in place; ledger amounts themselves are never rewritten (INV-04). */
export async function voidLedgerRow(tx: Tx, ctx: TenantContext, transactionId: string, reason: string): Promise<void> {
  const { count } = await tx.transaction.updateMany({
    where: tenantScope(ctx, { id: transactionId, status: TransactionStatus.SUCCESS }),
    data: { status: TransactionStatus.VOIDED, voidedAt: new Date(), voidedByUserId: ctx.userId, voidReason: reason },
  });
  required(count === 1 ? { id: transactionId } : null, "Transaction");
}

export const DAY_CLOSE_ZERO = MONEY_ZERO;
