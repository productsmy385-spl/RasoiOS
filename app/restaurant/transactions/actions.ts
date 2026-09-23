"use server";

import { requireTenant } from "@/lib/auth/guards";
import { listBillableOrders } from "@/lib/data/payments";
import { listTransactions } from "@/lib/data/transactions";
import { action } from "@/lib/http/action";
import { closeBusinessDay, previewDayClose, voidTransaction } from "@/lib/services/day-close";
import { createRefund, recordPayment } from "@/lib/services/payments";
import { now } from "@/lib/time";
import { businessDateFor, parseIsoDate } from "@/lib/time/business-date";
import { parseInput } from "@/lib/validation/core";
import {
  closeBusinessDaySchema,
  createRefundSchema,
  dayCloseQuerySchema,
  voidTransactionSchema,
  listTransactionsSchema,
  recordPaymentSchema,
  type CloseBusinessDayInput,
  type CreateRefundInput,
  type DayCloseQueryInput,
  type VoidTransactionInput,
  type ListTransactionsInput,
  type RecordPaymentInput,
} from "@/lib/validation/payments";

/**
 * Billing terminal actions (S1-P04-T007; api.md SA-TXN-01, SA-TXN-02, LD-TXN-01). Each action resolves the tenant
 * from the signed-in membership and checks its permission before reading anything; no input carries a tenant id.
 */

/** SA-TXN-01 — record a CASH / CARD / UPI payment. */
export const recordPaymentAction = action(async (input: RecordPaymentInput) => {
  const ctx = await requireTenant("payment:record");
  const data = parseInput(recordPaymentSchema, input);
  return recordPayment(ctx, data);
});

/** SA-TXN-02 — refund (part of) a successful payment; a reason is required. */
export const createRefundAction = action(async (input: CreateRefundInput) => {
  const ctx = await requireTenant("refund:create");
  const data = parseInput(createRefundSchema, input);
  return createRefund(ctx, data);
});

/** LD-TXN-01 — the tenant's ledger rows with totals. */
export const listTransactionsAction = action(async (input?: ListTransactionsInput) => {
  const ctx = await requireTenant("transaction:read");
  const filters = parseInput(listTransactionsSchema, input ?? {});
  return listTransactions(ctx, filters);
});

/** Orders awaiting settlement at the billing terminal (unpaid or partially paid). */
export const listBillableOrdersAction = action(async () => {
  const ctx = await requireTenant("payment:record");
  return listBillableOrders(ctx);
});

/** SA-TXN-03 — `transaction:void`: cancel a ledger row recorded by mistake, same business day only, with a reason. */
export const voidTransactionAction = action(async (input: VoidTransactionInput) => {
  const ctx = await requireTenant("transaction:void");
  const data = parseInput(voidTransactionSchema, input);
  return voidTransaction(ctx, data);
});

/** LD-TXN-02 — `day_close:perform`: the day's takings by method before the drawer is counted. */
export const getDayClosePreviewAction = action(async (input?: DayCloseQueryInput) => {
  const ctx = await requireTenant("day_close:perform");
  const { businessDate } = parseInput(dayCloseQuerySchema, input ?? {});
  return previewDayClose(ctx, businessDate ? parseIsoDate(businessDate) : businessDateFor(now(), ctx.restaurant.timezone));
});

/** SA-TXN-04 — `day_close:perform`: close the day; a cash difference must be explained. */
export const closeBusinessDayAction = action(async (input: CloseBusinessDayInput) => {
  const ctx = await requireTenant("day_close:perform");
  const data = parseInput(closeBusinessDaySchema, input);
  return closeBusinessDay(ctx, data);
});
