/**
 * Decimal text entry for money and percentages (S1-P08-T005, SC-VAL-02, ADR-010). Everything here works on strings:
 * the browser never turns an amount into a JavaScript number, so "480.50" reaches the server exactly as typed.
 *
 * - `isPartial…` decides whether a keystroke may be kept while the user is still typing ("", "480.", "480.5").
 * - `normalize…` turns a finished entry into the canonical two-decimal string the server schemas accept
 *   (lib/money MONEY_PATTERN, tax rate pattern), or `null` when it is not a valid amount (e.g. "1e3", "-5", "1,200").
 */

/** Up to 10 integer digits and 2 decimals — the same bounds as lib/money `MONEY_PATTERN`. */
const PARTIAL_MONEY = /^\d{0,10}(\.\d{0,2})?$/;
/** Up to 3 integer digits and 2 decimals — the tax rate input pattern. */
const PARTIAL_PERCENT = /^\d{0,3}(\.\d{0,2})?$/;

export function isPartialMoney(text: string): boolean {
  return PARTIAL_MONEY.test(text);
}

export function isPartialPercent(text: string): boolean {
  return PARTIAL_PERCENT.test(text);
}

/** Splits a validated entry into canonical integer and two-digit fraction parts. */
function canonical(text: string): { whole: string; fraction: string } | null {
  if (!/\d/.test(text)) return null;
  const [rawWhole, rawFraction = ""] = text.split(".");
  const whole = rawWhole.replace(/^0+(?=\d)/, "") || "0";
  const fraction = rawFraction.padEnd(2, "0");
  return { whole, fraction };
}

/** `"480.5"` → `"480.50"`, `"0480"` → `"480.00"`, `".5"` → `"0.50"`; anything else → `null`. */
export function normalizeMoney(input: string): string | null {
  const text = input.trim();
  if (!PARTIAL_MONEY.test(text)) return null;
  const parts = canonical(text);
  return parts ? `${parts.whole}.${parts.fraction}` : null;
}

/** `"5"` → `"5.00"`, `"18.5"` → `"18.50"`; values above 100 or malformed → `null`. */
export function normalizePercent(input: string): string | null {
  const text = input.trim();
  if (!PARTIAL_PERCENT.test(text)) return null;
  const parts = canonical(text);
  if (!parts) return null;
  const overHundred = parts.whole.length > 3 || (parts.whole.length === 3 && (parts.whole > "100" || (parts.whole === "100" && parts.fraction !== "00")));
  return overHundred ? null : `${parts.whole}.${parts.fraction}`;
}

/** The text to keep after a keystroke: the new text when it can still become a valid entry, otherwise the old one. */
export function acceptKeystroke(previous: string, next: string, kind: "money" | "percent"): string {
  const partial = kind === "money" ? isPartialMoney(next) : isPartialPercent(next);
  return partial ? next : previous;
}

/**
 * `counted − expected` as a two-decimal string (negative means short), or `null` when either side is not an amount.
 *
 * The browser has no Decimal: `lib/money` runs on the server, and a float would turn a 10.15 difference into
 * 10.149999999999999 on the one screen where a cash difference is the whole point (ADR-010 §1). Both sides are
 * therefore compared as whole paisa in BigInt.
 */
export function moneyDifference(counted: string, expected: string): string | null {
  const left = normalizeMoney(counted);
  const right = normalizeMoney(expected);
  if (left === null || right === null) return null;
  const paisa = (value: string) => {
    const [whole, fraction] = value.split(".");
    return BigInt(whole) * 100n + BigInt(fraction);
  };
  const difference = paisa(left) - paisa(right);
  const magnitude = difference < 0n ? -difference : difference;
  return `${difference < 0n ? "-" : ""}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, "0")}`;
}
