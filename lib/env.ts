import { z } from "zod";
import { normalizeRootDomain } from "./tenancy/hostnames";
import { parseImageHostList } from "./validation/url";

/**
 * Server environment validation (S1-P01-T004, SC-SEC-01, SC-AUTH-02).
 *
 * - Fails fast at server boot (see instrumentation.ts) instead of silently weakening security.
 * - Error messages name the variable and the rule, never the value.
 * - Import only from server code. Client code reads NEXT_PUBLIC_* values via process.env directly.
 */

const PLACEHOLDER = /placeholder|example|changeme|your[_-]?(key|secret)/i;

const secretish = /SECRET|PASSWORD|TOKEN|DATABASE|PRIVATE/i;

const nonPlaceholder = z
  .string({ required_error: "is required" })
  .trim()
  .min(1, "is required")
  .refine((v) => !PLACEHOLDER.test(v), "contains a placeholder value");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: nonPlaceholder.refine((v) => /^postgres(ql)?:\/\//.test(v), "must be a postgresql:// URL"),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: nonPlaceholder.refine(
      (v) => /^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(v),
      "must be a Clerk publishable key (pk_test_… or pk_live_…)",
    ),
    CLERK_SECRET_KEY: nonPlaceholder.refine(
      (v) => /^sk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(v),
      "must be a Clerk secret key (sk_test_… or sk_live_…)",
    ),
    // Becomes required when the webhook endpoint ships (S1-P03-T008).
    CLERK_WEBHOOK_SIGNING_SECRET: nonPlaceholder
      .refine((v) => v.startsWith("whsec_"), "must be a Svix signing secret (whsec_…)")
      .optional(),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.literal("/sign-in").default("/sign-in"),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.literal("/sign-up").default("/sign-up"),
    NEXT_PUBLIC_APP_URL: z.string({ required_error: "is required" }).url("must be an absolute URL"),
    // Wildcard domain that serves each restaurant's public website at `<slug>.<domain>` (S1-P09-T011, ADR-012 §3).
    // OPTIONAL: when it is unset (or blank) the app still runs — `<slug>.localhost` and `/r/{slug}` keep working and
    // no canonical link is emitted. A bare domain only: no scheme, port or path, and never an IP address.
    PUBLIC_ROOT_DOMAIN: z
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value))
      .refine((value) => value === undefined || normalizeRootDomain(value) !== null, "must be a bare domain name such as rasoios.com (no scheme, port or path)")
      .transform((value) => (value === undefined ? undefined : (normalizeRootDomain(value) ?? undefined)))
      .optional(),
    // Image hosts for logo/cover/menu image URLs (S1-P07-T002, SC-VAL-04): hostnames only — no scheme, port, path,
    // wildcard or IP address. Parsed by the same function the validators and next.config.ts use.
    ALLOWED_IMAGE_HOSTS: z
      .string()
      .default("")
      .refine((v) => parseImageHostList(v) !== null, "must be a comma-separated list of hostnames"),
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    SUPER_ADMIN_BOOTSTRAP_EMAIL: z.string().email("must be an email address").optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    if (!env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["NEXT_PUBLIC_APP_URL"], message: "must use https in production" });
    }
    // SC-DB-01: TLS to PostgreSQL. Railway private-network hosts (*.railway.internal) are accepted pending
    // verification of transport encryption in S1-P27-T002 [assumption].
    const url = env.DATABASE_URL;
    const host = url.match(/@([^:/?]+)/)?.[1] ?? "";
    if (!/[?&]sslmode=(require|verify-ca|verify-full)\b/.test(url) && !host.endsWith(".railway.internal")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["DATABASE_URL"], message: "must set sslmode=require in production" });
    }
  });

export type ServerEnv = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid server environment:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "EnvValidationError";
  }
}

/** Pure parser — safe to unit test. Never includes values in errors. */
export function parseEnv(source: Record<string, string | undefined>): ServerEnv {
  const problems: string[] = [];

  // Server secrets must never be exposed through NEXT_PUBLIC_* (SC-SEC-01).
  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    if (secretish.test(key.slice("NEXT_PUBLIC_".length)) || /^(sk_|whsec_)/.test(value ?? "")) {
      problems.push(`${key}: server secret must not use the NEXT_PUBLIC_ prefix`);
    }
  }

  const result = envSchema.safeParse(source);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const name = issue.path.join(".") || "(environment)";
      const rule = issue.code === z.ZodIssueCode.custom || issue.code === "too_small" ? issue.message : describeIssue(issue);
      problems.push(`${name}: ${rule}`);
    }
  }

  if (problems.length > 0) throw new EnvValidationError(problems);
  return result.success ? result.data : (undefined as never);
}

function describeIssue(issue: z.ZodIssue): string {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return issue.received === "undefined" ? "is required" : "has an invalid type";
    case z.ZodIssueCode.invalid_enum_value:
      return `must be one of ${issue.options.join(", ")}`;
    case z.ZodIssueCode.invalid_literal:
      return `must equal ${String(issue.expected)}`;
    default:
      // Refinement messages are authored above and contain no values.
      return issue.message;
  }
}

let cached: ServerEnv | undefined;

/** Validated environment for server code. Throws EnvValidationError on first use if invalid. */
export function getEnv(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Called once at server boot from instrumentation.ts. */
export function assertEnv(): void {
  getEnv();
}
