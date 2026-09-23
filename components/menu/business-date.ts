/**
 * Business-date arithmetic for the daily-menu screens. A business date is a plain `YYYY-MM-DD` in the restaurant's
 * timezone (ADR-010): what "today" is comes from the server, and nothing here converts a date to the viewer's clock —
 * the maths is done at UTC midnight purely so adding a day never crosses a daylight-saving boundary.
 */
const DAY_MS = 86_400_000;
export const BUSINESS_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isBusinessDate(value: string | undefined): value is string {
  if (!value || !BUSINESS_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);
}

/** Short day label for the status strip, e.g. "Tue 16". Formatted at UTC so the label matches the business date. */
export function stripLabel(date: string, locale = "en"): { weekday: string; day: string } {
  const instant = new Date(`${date}T00:00:00.000Z`);
  return {
    weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(instant),
    day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(instant),
  };
}

/** "Today", "Tomorrow", "Yesterday" or the formatted date — relative to the restaurant's today, never the viewer's. */
export function relativeDayName(date: string, today: string): string | null {
  const delta = daysBetween(today, date);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return null;
}
