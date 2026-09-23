/**
 * Report and analytics inputs (S1-P04-T007 interim retrofit; full report loaders in S1-P19).
 * Ranges are restaurant business dates (`YYYY-MM-DD` in the restaurant's timezone), never server-local dates.
 */
import { z } from "zod";
import { businessDateParam, strictObject } from "./core";

export const TIMEFRAMES = ["today", "7d", "30d", "all"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/** Business days covered by each timeframe, ending today (restaurant time). `all` has no date bound. */
export const TIMEFRAME_DAYS: Readonly<Record<Exclude<Timeframe, "all">, number>> = { today: 1, "7d": 7, "30d": 30 };

export const analyticsQuerySchema = strictObject({
  timeframe: z.enum(TIMEFRAMES),
});
export type AnalyticsQueryInput = z.input<typeof analyticsQuerySchema>;

/** api.md §15: `?from=&to=` business dates, at most 366 days, default the last 7 days. */
export const reportRangeSchema = strictObject({
  from: businessDateParam,
  to: businessDateParam,
});

export const MAX_REPORT_RANGE_DAYS = 366;
export const DEFAULT_REPORT_RANGE_DAYS = 7;
