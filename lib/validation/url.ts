/**
 * Image URL allowlist (S1-P07-T002, SC-VAL-04, REQ-SEC-006, threat T-014 / ADV-017).
 *
 * Staff can point logos, cover images and menu item images at external images. The server stores the URL and never
 * fetches it; browsers load it on the public site and in the console. An accepted URL therefore:
 * - uses `https:` (no mixed content, no `http:`/`data:`/`javascript:`),
 * - has a host on the operator's allowlist `ALLOWED_IMAGE_HOSTS` (exact hostname match, case-insensitive), so it
 *   cannot point at internal addresses, metadata endpoints or tracking hosts,
 * - carries no credentials (`user:pass@`), no IP literal and no non-default port,
 * - is at most 2048 characters.
 * A media store host joins the allowlist only if Q-009 approves uploads (S1-P07-T008/T009); until then it is URL-only.
 *
 * `next.config.ts` builds `images.remotePatterns` from the same list, and `lib/env.ts` validates its format at boot.
 * This module has no server-only imports so the Next.js config can use it.
 */
import { z } from "zod";

export const IMAGE_URL_MAX_LENGTH = 2048;

/** A DNS hostname with at least one dot and an alphabetic TLD — never an IP address, `localhost` or a wildcard. */
const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Parses the comma-separated `ALLOWED_IMAGE_HOSTS` value into lowercase hostnames. Empty/undefined → no hosts.
 * Returns `null` when any entry is not a plain hostname (the environment check reports that at boot).
 */
export function parseImageHostList(value: string | undefined | null): string[] | null {
  if (value === undefined || value === null || value.trim() === "") return [];
  const hosts = value.split(",").map((host) => host.trim().toLowerCase());
  if (!hosts.every((host) => HOSTNAME.test(host))) return null;
  return [...new Set(hosts)];
}

/**
 * The configured allowlist, read on every call so a deployment's value (and a test's) is always current.
 * A malformed value fails closed (no hosts); `lib/env.ts` stops the server from starting with one.
 */
export function allowedImageHosts(): string[] {
  return parseImageHostList(process.env.ALLOWED_IMAGE_HOSTS) ?? [];
}

export type ImageUrlProblem = "INVALID" | "TOO_LONG" | "NOT_HTTPS" | "CREDENTIALS" | "IP_LITERAL" | "PORT" | "HOST_NOT_ALLOWED";
export type ImageUrlCheck = { ok: true; url: string } | { ok: false; problem: ImageUrlProblem; message: string };

/** WHATWG URL parsing turns "2852039166" or "0xa9.254.169.254" into dotted IPv4, so a numeric host is an IP. */
const IPV4_LIKE = /^[0-9.]+$/;

/** Spaces and ASCII control characters (U+0000–U+0020, U+007F). */
function hasControlOrSpace(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

function problem(kind: ImageUrlProblem, message: string): ImageUrlCheck {
  return { ok: false, problem: kind, message };
}

/** Pure check against an explicit allowlist (unit-tested; TC-SEC-003). Returns the normalised URL when accepted. */
export function checkImageUrl(raw: string, allowedHosts: readonly string[]): ImageUrlCheck {
  if (raw.length > IMAGE_URL_MAX_LENGTH) return problem("TOO_LONG", `Use a link of at most ${IMAGE_URL_MAX_LENGTH} characters`);
  // The URL parser silently drops tabs/newlines and trims spaces; refuse them instead of guessing what was meant.
  if (raw === "" || hasControlOrSpace(raw)) return problem("INVALID", "Enter a valid image link");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return problem("INVALID", "Enter a valid image link");
  }
  if (url.protocol !== "https:") return problem("NOT_HTTPS", "Use an https:// image link");

  // `https://user:pass@host`, and also `https://@host` which the parser normalises away.
  const authority = raw.slice(raw.indexOf("//") + 2).split(/[/?#\\]/)[0];
  if (url.username !== "" || url.password !== "" || authority.includes("@")) {
    return problem("CREDENTIALS", "Image links must not contain a user name or password");
  }

  const host = url.hostname.toLowerCase();
  if (host.startsWith("[") || IPV4_LIKE.test(host)) return problem("IP_LITERAL", "Use the image host's name, not an IP address");
  if (url.port !== "") return problem("PORT", "Remove the port number from the image link");

  if (!allowedHosts.includes(host)) {
    return problem(
      "HOST_NOT_ALLOWED",
      allowedHosts.length === 0
        ? "Image links are not enabled yet. Ask the platform administrator to allow an image host."
        : `Images must come from an allowed host: ${allowedHosts.join(", ")}`,
    );
  }
  return { ok: true, url: url.href };
}

function validated(label: string, hosts: () => readonly string[]) {
  return (value: string, ctx: z.RefinementCtx): string => {
    const result = checkImageUrl(value, hosts());
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: ${result.message}`, params: { problem: result.problem } });
      return z.NEVER;
    }
    return result.url;
  };
}

/** Required image URL field: trimmed, allowlisted, normalised (e.g. host lowercased). */
export function imageUrl(label = "Image link", hosts: () => readonly string[] = allowedImageHosts) {
  return z.string().trim().transform(validated(label, hosts));
}

/** Optional image URL field: blank means "no image" (`null`); anything else must pass `imageUrl`. */
export function imageUrlOrBlank(label = "Image link", hosts: () => readonly string[] = allowedImageHosts) {
  const check = validated(label, hosts);
  return z
    .string()
    .trim()
    .transform((value, ctx): string | null => (value === "" ? null : check(value, ctx)));
}

/** `next.config.ts` `images.remotePatterns` for the allowlist (https, any path, default port). */
export function imageRemotePatterns(hosts: readonly string[]): Array<{ protocol: "https"; hostname: string; port: ""; pathname: "/**" }> {
  return hosts.map((hostname) => ({ protocol: "https", hostname, port: "", pathname: "/**" }));
}
