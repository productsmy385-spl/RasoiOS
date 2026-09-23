import type { ActionResult } from "@/lib/http/action";

/**
 * Turning an `ActionResult` failure into the one line a toast or inline alert shows (api.md §1.2). Server messages are
 * already written for the person reading them ("Archive or move the 3 items in this category first."), so they are
 * shown as sent; only a plain VALIDATION_ERROR needs its field messages appended, because it has no detail of its own.
 */
export type ActionFailure = Extract<ActionResult<unknown>, { ok: false }>;

export function isFailure<T>(result: ActionResult<T>): result is ActionFailure {
  return !result.ok;
}

export function failureText(result: ActionFailure): string {
  const fieldMessages = Object.values(result.error.fieldErrors ?? {}).flat();
  if (result.error.code === "VALIDATION_ERROR" && fieldMessages.length > 0) return fieldMessages.join(" ");
  return result.error.message;
}

/** A 409 CONFLICT means someone else saved first: the screen must be reloaded before the change can be retried. */
export function isStaleConflict(result: ActionFailure): boolean {
  return result.error.code === "CONFLICT";
}

/** The network never answered (the action itself never returns this) — kept separate from a server refusal. */
export const UNREACHABLE = "We couldn't reach the server. Check your connection and try again.";
