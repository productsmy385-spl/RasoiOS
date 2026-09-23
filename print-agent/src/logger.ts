/**
 * Structured JSON-lines logger (SC-LOG-04, TC-AGENT-011). Logs never contain the agent token, a claim token, a pairing
 * code or a print payload: keys that name them are replaced and any `rsa_…` token shape inside a string is masked, so
 * even an error message that echoes a header cannot leak the credential into a log file or the Windows event log.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;
export type Logger = Record<LogLevel, (event: string, fields?: LogFields) => void>;

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SECRET_KEY = /^(authorization|token|claimtoken|pairingcode|payload|secret|password|bytes)$/i;
const TOKEN_SHAPE = /rsa_[A-Za-z0-9_-]{8,}/g;
export const REDACTED = "[REDACTED]";

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.replace(TOKEN_SHAPE, "rsa_" + REDACTED);
  if (value === null || typeof value !== "object") return value;
  if (depth > 5) return "[…]";
  if (value instanceof Error) return { name: value.name, message: redact(value.message, depth + 1) };
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEY.test(key) ? REDACTED : redact(inner, depth + 1);
  }
  return out;
}

export function createLogger(level: LogLevel = "info", sink: (line: string) => void = (line) => process.stdout.write(`${line}\n`)): Logger {
  const emit = (at: LogLevel) => (event: string, fields: LogFields = {}) => {
    if (ORDER[at] < ORDER[level]) return;
    sink(JSON.stringify({ ts: new Date().toISOString(), level: at, event, ...(redact(fields) as LogFields) }));
  };
  return { debug: emit("debug"), info: emit("info"), warn: emit("warn"), error: emit("error") };
}
