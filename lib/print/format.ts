import { localParts } from "@/lib/time/zone";

/**
 * Timestamps on a ticket (S1-P16-T002). Always the *restaurant's* time zone (ADR-010 §5) and always plain ASCII, so
 * the agent can encode them in any printer codepage. Built from `localParts` rather than a locale formatter, so the
 * output never depends on the server's `TZ`, its ICU build or the caller's locale.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const pad = (value: number) => String(value).padStart(2, "0");

export function printableDate(instant: Date, timeZone: string): string {
  const p = localParts(instant, timeZone);
  return `${pad(p.day)} ${MONTHS[p.month - 1]} ${p.year}`;
}

export function printableTime(instant: Date, timeZone: string): string {
  const p = localParts(instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function printableTimestamp(instant: Date, timeZone: string): string {
  return `${printableDate(instant, timeZone)} ${printableTime(instant, timeZone)}`;
}

/** `2 x Butter Chicken` — ASCII `x`, never the multiplication sign, which many codepages lack. */
export function quantityLabel(quantity: number, label: string): string {
  return `${quantity} x ${label}`;
}

/** Amounts print as the plain decimal string with the currency code, e.g. `INR 840.00` (no symbol, no grouping). */
export function printableMoney(amount: string, currencyCode: string): string {
  return `${currencyCode} ${amount}`;
}
