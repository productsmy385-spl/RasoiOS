/**
 * Time zone, currency and country choices for the create-tenant form (S1-P06-T005, Q-005 answered 2026-09-22).
 *
 * The lists come from Intl, so they cannot drift from what `lib/validation/platform.ts` accepts: every value here is a
 * value that schema takes. Intl returns *canonical ICU* zone names, which are often the pre-rename spellings
 * (`Asia/Calcutta`, `Europe/Kiev`), so each renamed zone is shown and stored under its modern IANA name — the one on
 * the restaurant's own documents. Both spellings are valid input; only one should be on screen.
 *
 * Pure Intl, no Node or Prisma imports, so a client component may import it too.
 */

/** Prefill for a new restaurant (Q-005 A — required and visible, never silently applied). */
export const NEW_TENANT_DEFAULTS = { timezone: "Asia/Kolkata", currencyCode: "INR", countryCode: "IN" } as const;

export type Option = { value: string; label: string };
export type OptionGroup = { label: string; options: Option[] };

/**
 * Canonical ICU name → the modern IANA name for it [fact: Node 24.18 `Intl.supportedValuesOf("timeZone")` returns the
 * left-hand names]. Only zones that were actually renamed appear here.
 */
const PREFERRED_ZONE_NAME: Readonly<Record<string, string>> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Coral_Harbour": "America/Atikokan",
  "America/Godthab": "America/Nuuk",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

/** "Asia/Argentina/Buenos_Aires" → "Buenos Aires"; the area prefix becomes the group heading. */
function zoneLocation(zone: string): string {
  const parts = zone.split("/");
  return parts.slice(1).join(" · ").replace(/_/g, " ");
}

/** e.g. "GMT+5:30" for the given zone at `instant`; the offset moves with daylight saving, so it is read per day. */
function zoneOffsetLabel(zone: string, instant: Date): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(instant);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

let zoneCache: { day: string; groups: OptionGroup[] } | null = null;

/**
 * Every IANA zone, grouped by area and labelled with its current UTC offset. A native `<select>` with `<optgroup>`s is
 * type-ahead searchable in every browser and needs no JavaScript, which is why there is no custom combobox here.
 *
 * Offsets are recomputed once a day: a daylight-saving change would otherwise leave a long-lived server showing an
 * offset from the previous season.
 */
export function timeZoneGroups(at: Date = new Date()): OptionGroup[] {
  const day = at.toISOString().slice(0, 10);
  if (zoneCache?.day === day) return zoneCache.groups;

  const byArea = new Map<string, Option[]>();
  for (const canonical of Intl.supportedValuesOf("timeZone")) {
    const zone = PREFERRED_ZONE_NAME[canonical] ?? canonical;
    const area = zone.split("/")[0];
    const offset = zoneOffsetLabel(zone, at);
    const options = byArea.get(area) ?? [];
    options.push({ value: zone, label: offset ? `${zoneLocation(zone)} (${offset})` : zoneLocation(zone) });
    byArea.set(area, options);
  }
  const groups = [...byArea.entries()]
    .map(([area, options]) => ({ label: area, options: options.sort((a, b) => a.label.localeCompare(b.label, "en")) }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
  zoneCache = { day, groups };
  return groups;
}

/** True when the zone can be chosen from `timeZoneGroups` (used to decide whether a stored value needs its own option). */
export function isListedTimeZone(zone: string): boolean {
  return timeZoneGroups().some((group) => group.options.some((option) => option.value === zone));
}

const COMMON_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"] as const;
const COMMON_COUNTRIES = ["IN", "US", "GB", "AE", "SG", "AU", "CA", "NZ"] as const;

const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const regionNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

/** Region codes Intl knows that are not countries a restaurant can be in (groupings, pseudo-locales, "unknown"). */
const NON_COUNTRY_REGIONS = new Set(["ZZ", "EU", "EZ", "UN", "QO", "XA", "XB"]);

function split<T extends string>(all: Option[], common: readonly T[], commonLabel: string, restLabel: string): OptionGroup[] {
  const isCommon = new Set<string>(common);
  const first = common.map((code) => all.find((option) => option.value === code)).filter((option): option is Option => Boolean(option));
  const rest = all.filter((option) => !isCommon.has(option.value));
  return [
    { label: commonLabel, options: first },
    { label: restLabel, options: rest },
  ].filter((group) => group.options.length > 0);
}

/** ISO 4217 codes `Intl.NumberFormat` supports, as `INR — Indian Rupee`, most-used first. */
export function currencyGroups(): OptionGroup[] {
  const all = Intl.supportedValuesOf("currency")
    .map((code) => ({ value: code, label: `${code} — ${currencyNames.of(code) ?? code}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
  return split(all, COMMON_CURRENCIES, "Common", "All currencies");
}

/** ISO 3166-1 alpha-2 codes Intl knows, as `India (IN)`, most-used first. */
export function countryGroups(): OptionGroup[] {
  const all: Option[] = [];
  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second);
      if (NON_COUNTRY_REGIONS.has(code)) continue;
      const name = regionNames.of(code);
      if (name) all.push({ value: code, label: `${name} (${code})` });
    }
  }
  all.sort((a, b) => a.label.localeCompare(b.label, "en"));
  return split(all, COMMON_COUNTRIES, "Common", "All countries");
}
