/**
 * Printer connection addresses (SC-PRINT-06) — dependency-free so the local print agent applies exactly the rules the
 * console enforces (lib/validation/printing.ts re-exports these; print-agent/src/transports uses them directly).
 *
 * LAN addresses are literal private IPv4 addresses only. The cloud never opens a connection to a printer — the local
 * agent does — but a public address or a hostname stored here would turn the console into a request-forgery primitive
 * the moment anything followed it, and would let a compromised server point an agent at the wider internet.
 */

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** The ESC/POS raw-TCP port, used only when a LAN address carries no explicit port. */
export const DEFAULT_RAW_PRINT_PORT = 9100;

/** RFC 1918 private ranges only. Loopback, link-local, multicast, `0.0.0.0` and every public address are refused. */
export function isPrivateIpv4(value: string): boolean {
  const match = IPV4.exec(value);
  if (!match) return false;
  const parts = match.slice(1).map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (match.slice(1).some((part) => part.length > 1 && part.startsWith("0"))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function isValidPort(value: string): boolean {
  if (!/^\d{1,5}$/.test(value)) return false;
  const port = Number(value);
  return port >= 1 && port <= 65535;
}

/** `192.168.1.50:9100`, `10.0.0.7` — a private IPv4 with an optional port. Hostnames and `localhost` are refused. */
export function isPrivateLanAddress(value: string): boolean {
  const [host, port, ...rest] = value.split(":");
  if (rest.length > 0) return false;
  if (!isPrivateIpv4(host ?? "")) return false;
  return port === undefined || isValidPort(port);
}

/** Splits a validated LAN address; the port defaults to 9100 only when the address has none. Null when invalid. */
export function parseLanAddress(value: string): { host: string; port: number } | null {
  if (!isPrivateLanAddress(value)) return null;
  const [host, port] = value.split(":");
  return { host: host!, port: port === undefined ? DEFAULT_RAW_PRINT_PORT : Number(port) };
}

/**
 * A USB device or OS print-queue name, e.g. `USB001` or `Star TSP100 (copy 1)`. Printable ASCII only, with no shell
 * metacharacters and no control characters — the agent turns this string into a device path.
 */
export const USB_ADDRESS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._:#/\\()+-]{0,63}$/;
