import "server-only";
import { OrderStatus, OrderType, type Prisma } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { db } from "@/lib/db/prisma";
import { MONEY_ZERO, toMoneyString } from "@/lib/money";
import { addDays, businessDateFor, now, parseIsoDate, toIsoDate } from "@/lib/time";
import { DEFAULT_REPORT_RANGE_DAYS, MAX_REPORT_RANGE_DAYS, reportRangeSchema } from "@/lib/validation/reports";
import { businessDateValue, moneyDto, type MoneyString } from "./dto";
import { mapErrors } from "./errors";

/**
 * Sales aggregates for the reports page, the analytics page and the dashboard (S1-P04-T007 interim; the full report
 * loaders LD-RPT-01…05 arrive in S1-P19). Every query filters by `ctx.tenantId` (SC-TEN-08) and every date filter uses
 * the `business_date` column, i.e. the calendar date in the restaurant's timezone (ADR-010 §5) — never server-local
 * dates. Money is summed as NUMERIC in SQL and returned as two-decimal strings (ADR-010 §1).
 *
 * Revenue definition (BR-RPT-01, [proposed] in prd.md): sales = orders with status COMPLETED or REFUNDED, counted at
 * `total_amount`; refunds = SUCCESS refund transactions recorded in the range; open and cancelled orders are excluded.
 */

/** Inclusive range of business dates, `YYYY-MM-DD`. `null` means "all dates". */
export type BusinessDateRange = { from: string; to: string };

export const SALES_ORDER_STATUSES: OrderStatus[] = [OrderStatus.COMPLETED, OrderStatus.REFUNDED];

export type SalesSummary = {
  range: BusinessDateRange | null;
  grossSales: MoneyString;
  refunds: MoneyString;
  netSales: MoneyString;
  /** Orders counted as sales (COMPLETED + REFUNDED). */
  salesOrderCount: number;
  /** grossSales / salesOrderCount, ROUND_HALF_UP to 2 decimals. */
  averageOrderValue: MoneyString;
  /** Every order in the range, any status. */
  orderCount: number;
  completedCount: number;
  cancelledCount: number;
  /** Sales orders by type. */
  byOrderType: Record<OrderType, { count: number; total: MoneyString }>;
};

export type TopSellingItem = { name: string; quantity: number; revenue: MoneyString };

function businessDateFilter(range: BusinessDateRange | null) {
  return range ? { businessDate: { gte: businessDateValue(range.from), lte: businessDateValue(range.to) } } : {};
}

/** The `days` business dates ending today in the restaurant's timezone. */
export function businessDaysEndingToday(ctx: TenantContext, days: number, at: Date = now()): BusinessDateRange {
  const today = businessDateFor(at, ctx.restaurant.timezone);
  return { from: toIsoDate(addDays(today, -(Math.max(1, days) - 1))), to: toIsoDate(today) };
}

/** `?from=&to=` from a report URL, or the default last 7 business days when missing, invalid or longer than 366 days. */
export function reportRangeOrDefault(ctx: TenantContext, params: { from?: string; to?: string }): BusinessDateRange {
  const parsed = reportRangeSchema.safeParse({ from: params.from, to: params.to });
  if (parsed.success) {
    const days = (parseIsoDate(parsed.data.to).getTime() - parseIsoDate(parsed.data.from).getTime()) / 86_400_000 + 1;
    if (days >= 1 && days <= MAX_REPORT_RANGE_DAYS) return parsed.data;
  }
  return businessDaysEndingToday(ctx, DEFAULT_REPORT_RANGE_DAYS);
}

export async function salesSummary(ctx: TenantContext, range: BusinessDateRange | null): Promise<SalesSummary> {
  const dates = businessDateFilter(range);
  const [salesByType, ordersByStatus, refundTotal] = await mapErrors("Report", () =>
    Promise.all([
      db.order.groupBy({
        by: ["orderType"],
        where: { tenantId: ctx.tenantId, status: { in: SALES_ORDER_STATUSES }, ...dates },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      db.order.groupBy({
        by: ["status"],
        where: { tenantId: ctx.tenantId, ...dates },
        _count: { _all: true },
      }),
      db.transaction.aggregate({
        where: { tenantId: ctx.tenantId, type: "REFUND", status: "SUCCESS", ...dates },
        _sum: { amount: true },
      }),
    ]),
  );

  const byOrderType = Object.fromEntries(
    Object.values(OrderType).map((type) => [type, { count: 0, total: MONEY_ZERO }]),
  ) as Record<OrderType, { count: number; total: Prisma.Decimal }>;
  let grossSales = MONEY_ZERO;
  let salesOrderCount = 0;
  for (const row of salesByType) {
    const total = row._sum.totalAmount ?? MONEY_ZERO;
    byOrderType[row.orderType] = { count: row._count._all, total };
    grossSales = grossSales.add(total);
    salesOrderCount += row._count._all;
  }

  const countOf = (status: OrderStatus) => ordersByStatus.find((row) => row.status === status)?._count._all ?? 0;
  const refunds = refundTotal._sum.amount ?? MONEY_ZERO;

  return {
    range,
    grossSales: moneyDto(grossSales),
    refunds: moneyDto(refunds),
    netSales: moneyDto(grossSales.sub(refunds)),
    salesOrderCount,
    averageOrderValue: salesOrderCount > 0 ? toMoneyString(grossSales.div(salesOrderCount)) : moneyDto(MONEY_ZERO),
    orderCount: ordersByStatus.reduce((sum, row) => sum + row._count._all, 0),
    completedCount: countOf(OrderStatus.COMPLETED),
    cancelledCount: countOf(OrderStatus.CANCELLED),
    byOrderType: Object.fromEntries(
      Object.entries(byOrderType).map(([type, value]) => [type, { count: value.count, total: moneyDto(value.total) }]),
    ) as SalesSummary["byOrderType"],
  };
}

/** Best sellers among sales orders by quantity (line subtotals as revenue; names are the order-time snapshots). */
export async function topSellingItems(ctx: TenantContext, range: BusinessDateRange | null, limit = 5): Promise<TopSellingItem[]> {
  const rows = await mapErrors("Report", () =>
    db.orderItem.groupBy({
      by: ["itemNameSnapshot"],
      where: {
        tenantId: ctx.tenantId,
        order: { tenantId: ctx.tenantId, status: { in: SALES_ORDER_STATUSES }, ...businessDateFilter(range) },
      },
      _sum: { quantity: true, lineSubtotal: true },
      orderBy: [{ _sum: { quantity: "desc" } }, { itemNameSnapshot: "asc" }],
      take: Math.min(Math.max(1, limit), 50),
    }),
  );
  return rows.map((row) => ({
    name: row.itemNameSnapshot,
    quantity: row._sum.quantity ?? 0,
    revenue: moneyDto(row._sum.lineSubtotal ?? MONEY_ZERO),
  }));
}
