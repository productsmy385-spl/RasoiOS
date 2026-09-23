/**
 * Display formatting shared by server and client components (S1-P02-T010/T011). No Prisma or Node imports.
 *
 * Money arrives as a two-decimal string and is passed to Intl.NumberFormat as a string, which formats the exact decimal
 * value (no float conversion). Instants arrive as ISO strings and are shown in the restaurant's IANA time zone, never
 * the viewer's or the server's.
 */

const LOCALE_BY_COUNTRY: Record<string, string> = { IN: "en-IN", US: "en-US", GB: "en-GB", AE: "en-AE", SG: "en-SG", AU: "en-AU" };

/** Display locale for a restaurant country (ISO 3166-1 alpha-2). */
export function localeForCountry(countryCode: string | null | undefined): string {
  return (countryCode && LOCALE_BY_COUNTRY[countryCode.toUpperCase()]) || "en";
}

const MONEY_STRING = /^-?\d{1,13}(\.\d{1,2})?$/;

/** `formatMoney("1234.50", "INR", "en-IN")` → `₹1,234.50`. Throws on anything that is not a decimal string. */
export function formatMoney(amount: string, currencyCode: string, locale = "en"): string {
  if (typeof amount !== "string" || !MONEY_STRING.test(amount)) throw new RangeError(`formatMoney expects a decimal string, got ${JSON.stringify(amount)}`);
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // The string overload keeps the exact decimal (ECMA-402 Intl.NumberFormat v3).
  return formatter.format(amount as unknown as number);
}

/** The currency's display symbol in a locale, e.g. `currencySymbol("INR", "en-IN")` → `₹` (used as a field prefix). */
export function currencySymbol(currencyCode: string, locale = "en"): string {
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? currencyCode;
}

export type ZonedStyle = "time" | "date" | "datetime" | "weekday-time";

const STYLE_OPTIONS: Record<ZonedStyle, Intl.DateTimeFormatOptions> = {
  time: { hour: "2-digit", minute: "2-digit" },
  date: { day: "numeric", month: "short", year: "numeric" },
  datetime: { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
  "weekday-time": { weekday: "short", hour: "2-digit", minute: "2-digit" },
};

/** Formats an instant in an IANA time zone, e.g. `formatInZone("2026-09-15T18:30:00Z", "Asia/Kolkata", "time")` → `12:00 am`. */
export function formatInZone(iso: string | Date, timeZone: string, style: ZonedStyle, locale = "en"): string {
  const instant = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(instant.getTime())) throw new RangeError(`formatInZone expects an ISO instant, got ${JSON.stringify(iso)}`);
  return new Intl.DateTimeFormat(locale, { ...STYLE_OPTIONS[style], timeZone }).format(instant);
}

/** Short zone name for an instant in an IANA zone, e.g. "IST" for Asia/Kolkata in en-IN (the live clock suffix). */
export function zoneAbbreviation(instant: Date, timeZone: string, locale = "en"): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" }).formatToParts(instant);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

/** A business date (`YYYY-MM-DD`) for display, without any time-zone conversion. */
export function formatBusinessDate(date: string, locale = "en"): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError(`formatBusinessDate expects YYYY-MM-DD, got ${JSON.stringify(date)}`);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
