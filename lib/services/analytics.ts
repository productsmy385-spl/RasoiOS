import "server-only";
import type { OrderType } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { businessDaysEndingToday, salesSummary, topSellingItems, type BusinessDateRange } from "@/lib/data/reports";
import { TIMEFRAME_DAYS, type Timeframe } from "@/lib/validation/reports";

/**
 * Sales analytics for the analytics page (S1-P04-T007 interim; rebuilt in S1-P19-T006). Aggregation, tenant scoping
 * and the revenue definition live in lib/data/reports.ts; this maps a timeframe to restaurant business dates.
 */

export type { Timeframe };

export interface AnalyticsSummary {
  /** Business dates covered (restaurant timezone); null for "all". */
  range: BusinessDateRange | null;
  currencyCode: string;
  grossRevenue: string;
  netRevenue: string;
  totalOrders: number;
  averageOrderValue: string;
  orderTypeBreakdown: Record<OrderType, { count: number; total: string }>;
  topMenuItems: Array<{ name: string; quantity: number; revenue: string }>;
}

/** "today" / "7d" / "30d" are whole business days ending today in the restaurant's timezone; "all" is unbounded. */
export function rangeForTimeframe(ctx: TenantContext, timeframe: Timeframe): BusinessDateRange | null {
  return timeframe === "all" ? null : businessDaysEndingToday(ctx, TIMEFRAME_DAYS[timeframe]);
}

export async function getTenantSalesAnalytics(ctx: TenantContext, timeframe: Timeframe): Promise<AnalyticsSummary> {
  const range = rangeForTimeframe(ctx, timeframe);
  const [summary, topMenuItems] = await Promise.all([salesSummary(ctx, range), topSellingItems(ctx, range, 5)]);
  return {
    range,
    currencyCode: ctx.restaurant.currencyCode,
    grossRevenue: summary.grossSales,
    netRevenue: summary.netSales,
    totalOrders: summary.salesOrderCount,
    averageOrderValue: summary.averageOrderValue,
    orderTypeBreakdown: summary.byOrderType,
    topMenuItems,
  };
}
