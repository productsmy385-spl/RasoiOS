/**
 * Business-date primitives (ADR-010 §5). A business date is the calendar date in the restaurant's IANA
 * timezone at a given instant, never the server's local date (fixes BA-14). It is represented as a
 * UTC-midnight `Date` so Prisma `@db.Date` columns receive exactly that calendar date.
 */
import { localParts } from "./zone";

export function businessDateFor(instant: Date, timeZone: string): Date {
  const p = localParts(instant, timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

/** `YYYY-MM-DD` of a business date. */
export function toIsoDate(businessDate: Date): string {
  return businessDate.toISOString().slice(0, 10);
}

/** `YYYYMMDD` of a business date, used in human-readable numbers. */
export function compactIsoDate(businessDate: Date): string {
  return toIsoDate(businessDate).replace(/-/g, "");
}

/** `YYYY-MM-DD` → UTC-midnight Date for a DATE column. Throws on malformed or impossible dates. */
export function parseIsoDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError(`Invalid date: ${date}`);
  const value = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime()) || toIsoDate(value) !== date) throw new RangeError(`Invalid date: ${date}`);
  return value;
}

/** Calendar arithmetic on business dates (no time-zone effects). */
export function addDays(businessDate: Date, days: number): Date {
  return new Date(businessDate.getTime() + days * 86_400_000);
}
