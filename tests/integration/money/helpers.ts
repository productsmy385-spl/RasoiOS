/**
 * Shared helpers for the money-area integration tests (S1-P04-T007/T008). Tests that mutate the ledger create their
 * own orders here instead of touching the shared seed rows.
 */
import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { Prisma } from "@prisma/client";
import type { ActionError, ActionResult } from "@/lib/http/action";
import { createCategory, createMenuItem, createOrder } from "../../factories";
import { testDb } from "../setup/db";
import { tenantIdOf, type ControlFlow, type TenantKey } from "../helpers/actors";

export const key = () => randomUUID();

/** Unwraps a successful ActionResult (fails the test with the error otherwise). */
export function okData<T>(result: ActionResult<T> | ControlFlow): T {
  expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
  return (result as { ok: true; data: T }).data;
}

/** Unwraps a failed ActionResult. */
export function errorOf(result: ActionResult<unknown> | ControlFlow): ActionError {
  expect(result, JSON.stringify(result)).toMatchObject({ ok: false });
  return (result as { ok: false; error: ActionError }).error;
}

/** The error without its per-request id, for "byte-identical" comparisons. */
export function comparable(error: ActionError): Omit<ActionError, "requestId"> {
  const { requestId: _requestId, ...rest } = error;
  void _requestId;
  return rest;
}

/**
 * A fresh order in `tenant`: `quantity` × one item priced `basePrice` at `taxRate`%. Default 2 × 100.00 @ 5% → 210.00.
 */
export async function newOrder(tenant: TenantKey, options: { quantity?: number; basePrice?: string; taxRate?: string } = {}) {
  const db = testDb();
  const tenantId = tenantIdOf(tenant);
  const category = await createCategory(db, tenantId);
  const item = await createMenuItem(db, tenantId, category.id, { basePrice: options.basePrice ?? "100.00", taxRate: options.taxRate ?? "5.00" });
  const { order } = await createOrder(db, tenantId, [{ menuItem: item, quantity: options.quantity ?? 2 }], { status: "READY" });
  return order;
}

export async function orderRow(orderId: string) {
  return testDb().order.findUniqueOrThrow({ where: { id: orderId } });
}

export async function ledgerCount(where: Prisma.TransactionWhereInput): Promise<number> {
  return testDb().transaction.count({ where });
}

export const money = (value: Prisma.Decimal | null | undefined) => (value === null || value === undefined ? null : value.toFixed(2));
