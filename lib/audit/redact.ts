/**
 * Audit state redaction (S1-P04-T010, SC-AUD-04, SC-PII-03). Before/after snapshots keep what changed without
 * storing secrets or unnecessary personal data:
 * - keys that look like credentials are removed entirely;
 * - personal fields (email, phone, name, notes, address) are masked, so an auditor can see *that* they changed;
 * - states larger than 16 KB are replaced by a summary of their keys.
 */
const SECRET_KEY = /(password|otp|secret|token|hash|pairing|signature|apikey|api_key|cookie|session|claim)/i;
const EMAIL_KEY = /email/i;
const PHONE_KEY = /phone/i;
const NAME_KEY = /(^|_|[a-z])(full_?name|first_?name|last_?name|customer_?name)$/i;
const FREE_TEXT_KEY = /^(notes|address(_?line\d)?|special_?instructions)$/i;

export const AUDIT_STATE_MAX_BYTES = 16 * 1024;

export function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  return domain ? `${local.slice(0, 1)}***@${domain}` : "***";
}

export function maskPhone(value: string): string {
  return value.length <= 4 ? "****" : `${value.slice(0, 3)}${"*".repeat(value.length - 5)}${value.slice(-2)}`;
}

function maskName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1)}.`)
    .join(" ");
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (EMAIL_KEY.test(key)) return maskEmail(value);
    if (PHONE_KEY.test(key)) return maskPhone(value);
    if (NAME_KEY.test(key)) return maskName(value);
    if (FREE_TEXT_KEY.test(key)) return value.length ? "[TEXT]" : value;
    return value;
  }
  if (typeof value === "object") return redactObject(value, depth + 1);
  return value;
}

function redactObject(value: object, depth: number): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => redactValue("", v, depth));
  // Prisma.Decimal and similar value objects serialise through toString/toJSON.
  if ("toFixed" in value && typeof (value as { toString: unknown }).toString === "function") return String(value);
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = redactValue(key, entry, depth);
  }
  return out;
}

/** Redacted, size-capped JSON-safe copy of an audit before/after state. */
export function redactAuditState(state: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (state === null || state === undefined) return null;
  const redacted = redactObject(state, 0) as Record<string, unknown>;
  const json = JSON.stringify(redacted);
  if (Buffer.byteLength(json, "utf8") <= AUDIT_STATE_MAX_BYTES) return JSON.parse(json);
  return { truncated: true, keys: Object.keys(redacted).slice(0, 100) };
}
