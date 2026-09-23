/**
 * Time-zone primitives built on Intl only (S1-P02-T011, ADR-010 §5). Results never depend on the server's own time
 * zone (`TZ`), which differs between laptops, CI and Railway.
 */

/** IANA `Area/Location` names (plus `UTC`). Rejects abbreviations ("IST") and offsets ("GMT+5:30", "+05:30"). */
const IANA_SHAPE = /^(?:UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+)$/;

/**
 * True for a valid IANA time-zone name. `Intl.supportedValuesOf("timeZone")` is not used because it lists canonical
 * ICU names only (e.g. `Asia/Calcutta`, not `Asia/Kolkata`) and omits `UTC` [fact: Node 24.18, 2026-09-22].
 */
export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || timeZone.length > 64 || !IANA_SHAPE.test(timeZone)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number };

const WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock fields of `instant` in `timeZone` (weekday is ISO: 1 = Monday … 7 = Sunday). */
export function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAY[get("weekday")],
  };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (Asia/Kolkata → +19 800 000). */
export function offsetMs(instant: Date, timeZone: string): number {
  const p = localParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The UTC instant of a local wall-clock time in `timeZone`.
 * In a DST gap (a local time that does not exist) the time moves forward by the length of the gap (02:30 → 03:30,
 * Temporal "compatible" disambiguation); in an overlap (a local time that happens twice) it is the earlier instant.
 */
export function zonedTimeToUtc(
  local: { year: number; month: number; day: number; hour?: number; minute?: number },
  timeZone: string,
): Date {
  const wall = Date.UTC(local.year, local.month - 1, local.day, local.hour ?? 0, local.minute ?? 0);
  // Two passes resolve the offset that applies at the target instant (DST changes between guess and target).
  const first = wall - offsetMs(new Date(wall), timeZone);
  const second = wall - offsetMs(new Date(first), timeZone);
  if (first === second) return new Date(first);
  // Overlap: both candidates map back to the same wall time — take the earlier. Gap: neither does — take the later.
  const mapsBack = (t: number) => {
    const p = localParts(new Date(t), timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) === wall;
  };
  const candidates = [first, second].sort((a, b) => a - b);
  const valid = candidates.filter(mapsBack);
  return new Date(valid.length ? valid[0] : candidates[1]);
}
