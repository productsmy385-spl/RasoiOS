import "server-only";
import { PaymentMethod, Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { db } from "@/lib/db/prisma";
import type { ListTransactionsFilters } from "@/lib/validation/payments";
import { businessDateDto, instantDto, moneyDto, type MoneyString } from "./dto";
import { parseIsoDate } from "@/lib/time/business-date";
import { mapErrors } from "./errors";

/**
 * Transactions list (S1-P04-T007; api.md LD-TXN-01, TI-028). Rows and totals come from the caller's tenant only;
 * totals are summed by PostgreSQL over NUMERIC (no floating point) and use SUCCESS rows only.
 */

export type TransactionListItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  type: TransactionType;
  method: PaymentMethod;
  status: TransactionStatus;
  currencyCode: string;
  amount: MoneyString;
  amountTendered: MoneyString | null;
  changeDue: MoneyString | null;
  reference: string | null;
  refundOfTransactionId: string | null;
  /** Why a refund was given. */
  reason: string | null;
  /** Why the entry was voided — a different column from `reason`, and the only record of a correction (SA-TXN-03). */
  voidReason: string | null;
  /** PAYMENT rows: amount − Σ successful refunds of it (what may still be refunded). REFUND rows: null. */
  refundable: MoneyString | null;
  recordedBy: string | null;
  businessDate: string;
  createdAt: string;
};

export type TransactionTotals = {
  payments: MoneyString;
  refunds: MoneyString;
  net: MoneyString;
  /** Net (payments − refunds) per method. */
  byMethod: Record<PaymentMethod, MoneyString>;
  count: number;
};

export type TransactionList = { items: TransactionListItem[]; totals: TransactionTotals; nextCursor: string | null };

const ZERO = new Prisma.Decimal(0);

function filterWhere(ctx: TenantContext, filters: ListTransactionsFilters): Prisma.TransactionWhereInput {
  const q = filters.q?.trim();
  const from = filters.from ? parseIsoDate(filters.from) : undefined;
  const to = filters.to ? parseIsoDate(filters.to) : undefined;
  return {
    tenantId: ctx.tenantId,
    ...(from || to ? { businessDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(filters.orderId ? { orderId: filters.orderId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.method ? { paymentMethod: filters.method } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { order: { orderNumber: { contains: q, mode: "insensitive" } } },
            { order: { customer: { fullName: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

export async function listTransactions(ctx: TenantContext, filters: ListTransactionsFilters = {}): Promise<TransactionList> {
  const base = filterWhere(ctx, filters);
  const [rows, sums] = await mapErrors("Transaction", () =>
    Promise.all([
      db.transaction.findMany({
        where: { ...base, tenantId: ctx.tenantId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: (filters.limit ?? 100) + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          orderId: true,
          type: true,
          paymentMethod: true,
          status: true,
          amount: true,
          amountTendered: true,
          changeDue: true,
          reference: true,
          refundOfTransactionId: true,
          reason: true,
          voidReason: true,
          businessDate: true,
          createdAt: true,
          order: { select: { orderNumber: true, currencyCode: true, customer: { select: { fullName: true } } } },
          recordedBy: { select: { fullName: true } },
          refunds: { where: { status: TransactionStatus.SUCCESS }, select: { amount: true } },
        },
      }),
      db.transaction.groupBy({
        by: ["type", "paymentMethod"],
        where: { ...base, tenantId: ctx.tenantId, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]),
  );

  const limit = filters.limit ?? 100;
  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1].id : null;

  let payments = ZERO;
  let refunds = ZERO;
  let count = 0;
  const byMethod: Record<PaymentMethod, Prisma.Decimal> = { CASH: ZERO, CARD: ZERO, UPI: ZERO };
  for (const group of sums) {
    const amount = group._sum.amount ?? ZERO;
    count += group._count._all;
    if (group.type === TransactionType.PAYMENT) {
      payments = payments.plus(amount);
      byMethod[group.paymentMethod] = byMethod[group.paymentMethod].plus(amount);
    } else {
      refunds = refunds.plus(amount);
      byMethod[group.paymentMethod] = byMethod[group.paymentMethod].minus(amount);
    }
  }

  return {
    nextCursor,
    items: page.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      orderNumber: t.order.orderNumber,
      customerName: t.order.customer?.fullName ?? null,
      type: t.type,
      method: t.paymentMethod,
      status: t.status,
      currencyCode: t.order.currencyCode,
      amount: moneyDto(t.amount),
      amountTendered: t.amountTendered ? moneyDto(t.amountTendered) : null,
      changeDue: t.changeDue ? moneyDto(t.changeDue) : null,
      reference: t.reference,
      refundOfTransactionId: t.refundOfTransactionId,
      reason: t.reason,
      voidReason: t.voidReason,
      refundable:
        t.type === TransactionType.PAYMENT
          ? moneyDto(t.status === TransactionStatus.SUCCESS ? t.amount.minus(t.refunds.reduce((sum, r) => sum.plus(r.amount), ZERO)) : ZERO)
          : null,
      recordedBy: t.recordedBy.fullName,
      businessDate: businessDateDto(t.businessDate),
      createdAt: instantDto(t.createdAt),
    })),
    totals: {
      payments: moneyDto(payments),
      refunds: moneyDto(refunds),
      net: moneyDto(payments.minus(refunds)),
      byMethod: { CASH: moneyDto(byMethod.CASH), CARD: moneyDto(byMethod.CARD), UPI: moneyDto(byMethod.UPI) },
      count,
    },
  };
}
