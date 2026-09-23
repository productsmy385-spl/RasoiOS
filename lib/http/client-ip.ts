/**
 * Who a request came from (S1-P23-T003, SC-LOG-01, SC-RL-01).
 *
 * `X-Forwarded-For` is a header the caller can write, so it is believed only as far as the deployment proves it:
 * `TRUSTED_PROXY_HOPS` says how many proxies of our own sit in front of the app (Railway's router is one). The client
 * address is the entry that many hops from the right — anything further left was appended by someone upstream of our
 * proxies and is ignored. With the variable unset we can prove nothing and return `null`, which is the safe default
 * for local development.
 *
 * This is the single implementation: audit rows (`lib/http/request-meta.ts`) and the print-agent pairing rate limit
 * (`lib/auth/agent.ts`) both use it, because a rate limit keyed on a forgeable address is not a rate limit at all.
 * Pure functions, no imports, so the Edge runtime can use it too.
 */

/** `lib/env.ts` caps the configured value at 5. */
const MAX_HOPS = 5;

export function trustedProxyHops(raw: string | undefined = process.env.TRUSTED_PROXY_HOPS): number {
  if (!raw) return 0;
  const hops = Number.parseInt(raw, 10);
  return Number.isInteger(hops) && hops > 0 && hops <= MAX_HOPS ? hops : 0;
}

/** Plain IPv4 or IPv6, with an optional port or brackets stripped — anything else is not an address. */
export function isIpAddress(value: string): boolean {
  const bare = value.startsWith("[") ? value.slice(1, value.indexOf("]")) : value.includes(".") ? value.split(":")[0] : value;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(bare);
  if (ipv4) return ipv4.slice(1).every((octet) => Number(octet) <= 255);
  return /^[0-9a-fA-F:]+$/.test(bare) && bare.includes(":");
}

/** The address our own proxies observed, or `null` when we cannot prove one. */
export function clientIpFrom(forwardedFor: string | null, hops = trustedProxyHops()): string | null {
  if (hops === 0 || !forwardedFor) return null;
  const chain = forwardedFor
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  // The right-most entry was added by the proxy nearest to us; step back one entry per proxy we operate.
  const candidate = chain[chain.length - hops];
  return candidate && isIpAddress(candidate) ? candidate : null;
}
