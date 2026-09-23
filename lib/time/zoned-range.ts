import { addDays, parseIsoDate } from "./business-date";
import { zonedTimeToUtc } from "./zone";

/**
 * UTC instants bounding whole business dates in `timeZone` (S1-P02-T011), for reports and "today" queries:
 * `[start, end)` where `start` is local midnight at the start of `from` and `end` is local midnight after `to`.
 * Days containing a DST change are 23 or 25 hours long, which is why this is not `24h × days`.
 */
export function utcRangeForBusinessDates(from: string, to: string, timeZone: string): { start: Date; end: Date } {
  const first = parseIsoDate(from);
  const last = parseIsoDate(to);
  if (last < first) throw new RangeError(`Range end ${to} is before start ${from}`);
  const dayAfter = addDays(last, 1);
  const midnight = (d: Date) => zonedTimeToUtc({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }, timeZone);
  return { start: midnight(first), end: midnight(dayAfter) };
}
