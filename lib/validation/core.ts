/**
 * Validation conventions (S1-P04-T006, api.md §1.2, SC-VAL-01/08, SC-TEN-01).
 *
 * - Every input schema is a `strictObject`: unknown keys — including `tenantId`, prices and totals — are rejected
 *   with 422 instead of being silently dropped. `tests/static/strict-schemas.test.ts` enforces this for every schema
 *   exported from `lib/validation/**`.
 * - Route segment params that fail validation render the not-found page (no oracle, no 500).
 */
import { notFound } from "next/navigation";
import { z, type ZodTypeAny } from "zod";
import { ValidationError } from "@/lib/errors";

export function strictObject<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}

export const uuidParam = z.string().uuid("Invalid id");

/** Tenant slug, as in data-model E01. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;
export const slugParam = z.string().regex(SLUG_PATTERN, "Invalid slug");

export const businessDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid date");

/** Trimmed text with length bounds (lengths come from data-model.md). */
export function boundedText(max: number, options: { min?: number; label?: string } = {}) {
  const min = options.min ?? 1;
  const label = options.label ?? "This field";
  return z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);
}

/** Optional trimmed text: empty string or missing becomes null. */
export function optionalText(max: number, label = "This field") {
  return z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .nullish()
    .transform((value) => (value ? value : null));
}

export const emailField = z.string().trim().toLowerCase().max(254).email("Enter a valid email address");

export const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
export const e164Field = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(E164_PATTERN, "Use international format, e.g. +919876543210"));

/** Parses action input; throws ValidationError (422) with field errors. */
export function parseInput<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length ? issue.path.join(".") : "_";
      (fieldErrors[key] ??= []).push(issue.code === "unrecognized_keys" ? `Unknown field(s): ${issue.keys.join(", ")}` : issue.message);
    }
    throw new ValidationError("Check the highlighted fields.", fieldErrors);
  }
  return result.data;
}

/** Parses a route segment param; anything invalid renders the not-found page. */
export function parseParamOrNotFound<S extends ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) notFound();
  return result.data;
}
