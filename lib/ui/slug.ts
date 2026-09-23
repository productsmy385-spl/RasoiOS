/**
 * Slug suggestion for the create-tenant form (S1-P06-T005). A suggestion only — the field stays editable and the
 * server validates it against `tenantSlugField` (`lib/validation/platform.ts`), which is the rule that decides.
 *
 * The slug becomes the restaurant's public sub-domain (ADR-012), so it has to be a DNS label: lowercase a–z, 0–9 and
 * hyphens, 3–48 characters, starting and ending with a letter or digit.
 */
const MAX = 48;
const MIN = 3;

/** "Akshay Patra – Devarapalli" → "akshay-patra-devarapalli"; returns "" when nothing usable is left. */
export function suggestSlug(name: string): string {
  const ascii = name
    .normalize("NFKD")
    // Strip the combining marks NFKD separated out, so "Café" becomes "cafe" rather than losing the letter.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const hyphenated = ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const clipped = hyphenated.slice(0, MAX).replace(/-+$/, "");
  return clipped.length >= MIN ? clipped : "";
}
