"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { getTenantSalesAnalytics } from "@/lib/services/analytics";
import { parseInput } from "@/lib/validation/core";
import { analyticsQuerySchema, type AnalyticsQueryInput } from "@/lib/validation/reports";

/** Sales analytics for a timeframe of restaurant business days — `report:read` (security.md §3.3 row 48). */
export const getAnalyticsAction = action(async (input: AnalyticsQueryInput) => {
  const ctx = await requireTenant("report:read");
  const { timeframe } = parseInput(analyticsQuerySchema, input);
  return getTenantSalesAnalytics(ctx, timeframe);
});
