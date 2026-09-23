import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { currentRequestId } from "@/lib/auth/context";
import { mapDatabaseError } from "@/lib/data/errors";
import { AppError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Server Action result envelope (S1-P04-T005, api.md §1.2): actions never throw raw errors to the client.
 *   { ok: true, data } | { ok: false, error: { code, message, fieldErrors?, requestId } }
 * Next.js control flow (redirect(), notFound()) is re-thrown untouched.
 */
export type ActionError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  /** Contract-named extras for this code (api.md §1.2), e.g. `{ existingCustomerId }` on SA-CUS-01 PHONE_EXISTS. */
  details?: Record<string, unknown>;
  requestId: string;
};
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (fields[key] ??= []).push(issue.code === "unrecognized_keys" ? `Unknown field(s): ${issue.keys.join(", ")}` : issue.message);
  }
  return fields;
}

/** Converts any thrown value into a safe ActionError (logging unexpected ones with the request id). */
export function toActionError(error: unknown, requestId: string): ActionError {
  const mapped = mapDatabaseError(error);
  if (mapped instanceof ZodError) {
    return { code: "VALIDATION_ERROR", message: "Check the highlighted fields.", fieldErrors: zodFieldErrors(mapped), requestId };
  }
  if (mapped instanceof ValidationError) {
    return {
      code: mapped.code,
      message: mapped.message,
      ...(mapped.fieldErrors ? { fieldErrors: mapped.fieldErrors } : {}),
      ...(mapped.details ? { details: { ...mapped.details } } : {}),
      requestId,
    };
  }
  if (mapped instanceof AppError) return { code: mapped.code, message: mapped.message, ...(mapped.details ? { details: { ...mapped.details } } : {}), requestId };
  logger.error("action.unexpected_error", { requestId, error: mapped instanceof Error ? { name: mapped.name, message: mapped.message } : String(mapped) });
  return { code: "INTERNAL", message: `Something went wrong. Reference ${requestId}.`, requestId };
}

export function action<A extends unknown[], T>(handler: (...args: A) => Promise<T>): (...args: A) => Promise<ActionResult<T>> {
  return async (...args: A) => {
    try {
      return { ok: true, data: await handler(...args) };
    } catch (error) {
      unstable_rethrow(error);
      return { ok: false, error: toActionError(error, await currentRequestId()) };
    }
  };
}
