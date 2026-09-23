/**
 * Opening hours (S1-P02-T011, data-model E03). A shift runs from `opensAt` to `closesAt` local wall-clock time on ISO
 * weekday `dayOfWeek` (1 = Monday). `closesAt < opensAt` means the shift closes after midnight (overnight), so it also
 * covers the early hours of the next day. Closed days have no shifts.
 */
import { addDays } from "./business-date";
import { localParts, zonedTimeToUtc } from "./zone";

export type Shift = { dayOfWeek: number; isClosed: boolean; opensAt: string | null; closesAt: string | null };

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function minutes(hhmm: string): number {
  const match = HHMM.exec(hhmm);
  if (!match) throw new RangeError(`Invalid time ${hhmm}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

type OpenShift = { dayOfWeek: number; opens: number; closes: number; overnight: boolean };

function openShifts(hours: readonly Shift[]): OpenShift[] {
  return hours
    .filter((s): s is Shift & { opensAt: string; closesAt: string } => !s.isClosed && s.opensAt !== null && s.closesAt !== null)
    .map((s) => {
      const opens = minutes(s.opensAt);
      const closes = minutes(s.closesAt);
      return { dayOfWeek: s.dayOfWeek, opens, closes, overnight: closes < opens };
    });
}

const previousWeekday = (day: number) => (day === 1 ? 7 : day - 1);

/** Whether the restaurant is open at `instant`. */
export function isOpenAt(hours: readonly Shift[], instant: Date, timeZone: string): boolean {
  const local = localParts(instant, timeZone);
  const now = local.hour * 60 + local.minute;
  return openShifts(hours).some((s) => {
    if (s.dayOfWeek === local.weekday) {
      return s.overnight ? now >= s.opens : now >= s.opens && now < s.closes;
    }
    // Yesterday's overnight shift still running after midnight.
    return s.overnight && s.dayOfWeek === previousWeekday(local.weekday) && now < s.closes;
  });
}

/** The next instant at which the open/closed state changes (within 8 days), or null if it never changes. */
export function nextChange(hours: readonly Shift[], instant: Date, timeZone: string): { at: Date; opens: boolean } | null {
  const shifts = openShifts(hours);
  if (shifts.length === 0) return null;
  const current = isOpenAt(hours, instant, timeZone);
  const local = localParts(instant, timeZone);
  const today = new Date(Date.UTC(local.year, local.month - 1, local.day));

  const boundaries: number[] = [];
  for (let offset = -1; offset <= 8; offset++) {
    const date = addDays(today, offset);
    const weekday = ((local.weekday - 1 + offset + 70) % 7) + 1;
    for (const s of shifts.filter((x) => x.dayOfWeek === weekday)) {
      const at = (d: Date, mins: number) =>
        zonedTimeToUtc({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: Math.floor(mins / 60), minute: mins % 60 }, timeZone).getTime();
      boundaries.push(at(date, s.opens), at(s.overnight ? addDays(date, 1) : date, s.closes));
    }
  }
  const upcoming = [...new Set(boundaries)].filter((t) => t > instant.getTime()).sort((a, b) => a - b);
  for (const t of upcoming) {
    const state = isOpenAt(hours, new Date(t), timeZone);
    if (state !== current) return { at: new Date(t), opens: state };
  }
  return null;
}
