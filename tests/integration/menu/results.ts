import { expect } from "vitest";
import type { ActionError, ActionResult } from "@/lib/http/action";
import type { ControlFlow } from "../helpers/actors";

/** The data of a successful action result; fails the test with the full result otherwise. */
export function dataOf<T>(result: ActionResult<T> | ControlFlow): T {
  if (!("ok" in result) || !result.ok) throw new Error(`Expected ok result, got ${JSON.stringify(result)}`);
  return result.data;
}

/** The error of a failed action result; fails the test otherwise. */
export function errorOf<T>(result: ActionResult<T> | ControlFlow): ActionError {
  if (!("ok" in result) || result.ok) throw new Error(`Expected failed result, got ${JSON.stringify(result)}`);
  return result.error;
}

/** A NOT_FOUND for another tenant's id must look exactly like the one for a random UUID (no existence oracle). */
export function expectSameNotFound(foreign: ActionResult<unknown> | ControlFlow, random: ActionResult<unknown> | ControlFlow): void {
  const a = errorOf(foreign);
  const b = errorOf(random);
  expect(a.code).toBe("NOT_FOUND");
  expect({ code: a.code, message: a.message, fieldErrors: a.fieldErrors }).toEqual({ code: b.code, message: b.message, fieldErrors: b.fieldErrors });
}
