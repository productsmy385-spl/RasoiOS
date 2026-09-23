/**
 * Comparing prices in the browser without ever turning them into floats (ADR-010 §1, CLAUDE.md rule 4).
 *
 * Money reaches the client as a canonical two-decimal string ("480.50"). Comparing two of those is string work:
 * the longer whole part is the larger amount, and equal-length strings compare lexicographically. `lib/money` is
 * server-side (it carries `Prisma.Decimal`), so the "from" price shown in the editor preview is computed here.
 */
const CANONICAL = /^\d+\.\d{2}$/;

export function compareMoney(a: string, b: string): number {
  if (!CANONICAL.test(a) || !CANONICAL.test(b)) throw new RangeError(`compareMoney expects two-decimal strings, got ${JSON.stringify([a, b])}`);
  const [aWhole, aFraction] = a.split(".");
  const [bWhole, bFraction] = b.split(".");
  const aTrimmed = aWhole.replace(/^0+(?=\d)/, "");
  const bTrimmed = bWhole.replace(/^0+(?=\d)/, "");
  if (aTrimmed.length !== bTrimmed.length) return aTrimmed.length - bTrimmed.length;
  if (aTrimmed !== bTrimmed) return aTrimmed < bTrimmed ? -1 : 1;
  return aFraction === bFraction ? 0 : aFraction < bFraction ? -1 : 1;
}

/** The "from" price a guest sees: the cheapest available variant, or the base price when there is none. */
export function lowestPrice(basePrice: string, variantPrices: ReadonlyArray<string | null>): string {
  const usable = variantPrices.filter((price): price is string => price !== null && CANONICAL.test(price));
  if (usable.length === 0) return CANONICAL.test(basePrice) ? basePrice : "0.00";
  return usable.reduce((lowest, price) => (compareMoney(price, lowest) < 0 ? price : lowest));
}
