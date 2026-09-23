import { Prisma } from "@prisma/client";
import { expect } from "vitest";
import type { ActionError, ActionResult } from "@/lib/http/action";
import type { ControlFlow } from "../helpers/actors";
import { testDb } from "../setup/db";

export const RANDOM_UUID = "7f3e2b1a-9c4d-4e8f-a1b2-c3d4e5f60718";

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

/** PostgreSQL transaction id that wrote the current version of a row: equal xmin ⇒ written by the same transaction. */
export async function xminOf(table: "orders" | "audit_logs" | "customers", id: string): Promise<string> {
  const db = testDb();
  const rows =
    table === "orders"
      ? await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM orders WHERE id = ${id}::uuid`
      : table === "customers"
        ? await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM customers WHERE id = ${id}::uuid`
        : await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM audit_logs WHERE id = ${id}::uuid`;
  if (rows.length !== 1) throw new Error(`${table} row ${id} not found`);
  return rows[0].xmin;
}

/** A snapshot of an order row used to prove "no state change" after a denied request. */
export async function orderState(id: string) {
  const row = await testDb().order.findUniqueOrThrow({ where: { id } });
  return { status: row.status, version: row.version, updatedAt: row.updatedAt.toISOString(), cancelReason: row.cancelReason };
}

export const D = (value: string) => new Prisma.Decimal(value);
