type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Structured JSON logger with redaction (S1-P03-T009, SC-AUTH-10, SC-LOG-02; list documented in
 * knowledge/operations/monitoring.md §Redaction).
 *
 * 1. Keys: any key containing one of SENSITIVE_KEYS (case-insensitive, ignoring `-` and `_`) is replaced.
 * 2. Values: secret-shaped substrings in any string (bearer tokens, Clerk keys, webhook secrets and signatures,
 *    session cookies, print-agent tokens) are replaced; emails, E.164 phone numbers and card-like numbers are masked.
 * 3. `Headers` objects, Maps and arrays are sanitised like plain objects. Request/response bodies are never logged.
 */
const SENSITIVE_KEYS = [
  "password",
  "otp",
  "secret",
  "token",
  "authorization",
  "cookie",
  "setcookie",
  "session",
  "clerk",
  "pairingcode",
  "apikey",
  "svixsignature",
  "signature",
  "ticket",
  "creditcard",
  "cardnumber",
  "cvv",
];

const REDACTED = "[REDACTED]";

const SECRET_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+/g,
  /\bwhsec_[A-Za-z0-9+/=]+/g,
  /\bv1,[A-Za-z0-9+/=]{20,}/g, // Svix / Standard Webhooks signature
  /__(?:session|client_uat)[A-Za-z0-9_]*=[^;\s]+/g,
  /\brsa_[A-Za-z0-9_-]{16,}/g, // print-agent tokens
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, // JWTs
];

const EMAIL = /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
const PHONE_E164 = /\+[1-9]\d{6,14}\b/g;
const CARD_LIKE = /\b\d{4}([ -]?)\d{4}\1\d{4}\1\d{1,7}\b/g;

export function scrubString(value: string): string {
  let out = value;
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, REDACTED);
  out = out.replace(EMAIL, (_m, first: string, domain: string) => `${first}***@${domain}`);
  out = out.replace(PHONE_E164, (m) => `${m.slice(0, 3)}${"*".repeat(Math.max(0, m.length - 5))}${m.slice(-2)}`);
  out = out.replace(CARD_LIKE, "[CARD]");
  return out;
}

function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[-_\s]/g, "");
  return SENSITIVE_KEYS.some((sensitive) => normalised.includes(sensitive));
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value !== "object") return value;
  if (depth > 8) return "[TRUNCATED]";
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { name: value.name, message: scrubString(value.message) };
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));

  const entries: Array<[string, unknown]> =
    typeof Headers !== "undefined" && value instanceof Headers
      ? [...value.entries()]
      : value instanceof Map
        ? [...value.entries()].map(([k, v]) => [String(k), v])
        : Object.entries(value as Record<string, unknown>);

  const cleaned: Record<string, unknown> = {};
  for (const [key, entry] of entries) {
    cleaned[key] = isSensitiveKey(key) ? REDACTED : sanitize(entry, depth + 1);
  }
  return cleaned;
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? sanitize(meta) : undefined;
  return JSON.stringify({
    timestamp,
    level,
    message: scrubString(message),
    ...(sanitizedMeta && typeof sanitizedMeta === "object" ? { meta: sanitizedMeta } : {}),
  });
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production" || process.env.LOG_LEVEL === "debug") {
      console.log(formatLog("debug", message, meta));
    }
  },
  info(message: string, meta?: Record<string, unknown>) {
    console.log(formatLog("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(formatLog("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(formatLog("error", message, meta));
  },
};
