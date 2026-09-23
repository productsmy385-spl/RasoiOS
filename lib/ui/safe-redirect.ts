/**
 * Post-sign-in redirect validation (S1-P03-T005, SC-AUTH-11, TC-AUTH-012). Only same-origin relative paths are
 * accepted; everything else — absolute URLs, protocol-relative `//host`, backslash tricks such as `/\host`, control
 * characters, `javascript:` — falls back to a fixed in-app path. Pure function: used by the sign-in and sign-up
 * pages on the server and safe to call anywhere.
 */
const PLACEHOLDER_ORIGIN = "https://rasoios.invalid";

/** Sections a redirect may not target: the authentication pages themselves (loops) and non-page API routes. */
const BLOCKED_SECTIONS = ["/sign-in", "/sign-up", "/api"];

function hasControlOrSpace(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function safeRedirect(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  // Relative to this origin, and not protocol-relative ("//evil.test") or a backslash variant browsers treat as one.
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (hasControlOrSpace(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }
  if (parsed.origin !== PLACEHOLDER_ORIGIN) return fallback;
  if (BLOCKED_SECTIONS.some((section) => parsed.pathname === section || parsed.pathname.startsWith(`${section}/`))) return fallback;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
