import "server-only";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import { dayClosePreview, findDayClose, insertDayClose, voidLedgerRow, type DayClosePreview, type DayCloseRow } from "@/lib/data/day-close";
import { findLedgerRow, lockOrderForLedger, sumRefundsOfPayment, updateOrderLedgerTotals } from "@/lib/data/payments";
import { required } from "@/lib/data/scope";
import { withTx } from "@/lib/data/tx";
import { ConflictError, ValidationError } from "@/lib/errors";
import { derivePaymentStatus } from "@/lib/services/payments";
import { logger } from "@/lib/logger";
import { moneyDto } from "@/lib/data/dto";
import { businessDateFor, now } from "@/lib/time";
import { parseIsoDate } from "@/lib/time/business-date";
import type { CloseBusinessDayData, VoidTransactionData } from "@/lib/validation/payments";

/**
 * Business day close and same-day corrections (S1-P18-T002/T003; api.md SA-TXN-03, SA-TXN-04, LD-TXN-02).
 *
 * A closed day is final: `isBusinessDayClosed` already stops new orders, and payments and voids check it here, so a
 * reconciled till cannot move afterwards. Voiding never rewrites an amount — it marks the ledger row VOIDED with a
 * reason, which is why refunds and day totals stay reconstructable from the ledger alone (INV-04).
 */

/** LD-TXN-02 — the figures the person counting the till sees before they commit to them. */
export async function previewDayClose(ctx: TenantContext, businessDate: Date): Promise<DayClosePreview> {
  return dayClosePreview(ctx, businessDate);
}

/** SA-TXN-04 — closes the day in one transaction: totals, counted cash, variance and its explanation. */
export async function closeBusinessDay(ctx: TenantContext, input: CloseBusinessDayData): Promise<DayCloseRow> {
  const businessDate = parseIsoDate(input.businessDate);
  const closed = await withTx(ctx, async (tx) => {
    if (await findDayClose(tx, ctx, businessDate)) {
      throw new ConflictError("This business day is already closed.", "ALREADY_CLOSED");
    }

    const preview = await dayClosePreview(ctx, businessDate, tx);
    const variance = input.countedCash.minus(new Prisma.Decimal(preview.expectedCash));
    if (!variance.isZero() && !input.notes) {
      throw new ValidationError("Explain the cash difference before closing the day.", {
        notes: [`The drawer is ${variance.isNegative() ? "short" : "over"} by ${moneyDto(variance.abs())}. Add a note.`],
      });
    }

    return insertDayClose(tx, ctx, businessDate, preview, { countedCash: input.countedCash, notes: input.notes });
  });

  logger.info("day_close.performed", {
    requestId: ctx.requestId,
    tenantId: ctx.tenantId,
    businessDate: closed.businessDate,
    cashVariance: closed.cashVariance,
    openOrderCount: closed.openOrderCount,
  });
  return closed;
}

/**
 * SA-TXN-03 — void a ledger row recorded by mistake. Only a successful row, only on its own business date, only while
 * that day is open, and never a payment that has already been refunded (refund it instead, so the money trail stays
 * honest).
 */
export async function voidTransaction(ctx: TenantContext, input: VoidTransactionData): Promise<{ transactionId: string; status: TransactionStatus }> {
  const result = await withTx(ctx, async (tx) => {
    const row = required(await findLedgerRow(ctx, tx, input.transactionId), "Transaction");

    if (row.status !== TransactionStatus.SUCCESS) {
      throw new ConflictError("This transaction has already been voided.", "ALREADY_VOIDED");
    }
    const today = businessDateFor(now(), ctx.restaurant.timezone);
    if (row.businessDate.getTime() !== today.getTime()) {
      throw new ConflictError("A transaction can only be voided on the business day it was recorded.", "NOT_SAME_DAY");
    }
    if (await findDayClose(tx, ctx, row.businessDate)) {
      throw new ConflictError("The business day is closed. Record a correction on the current day instead.", "DAY_CLOSED");
    }
    if (row.type === TransactionType.PAYMENT && (await sumRefundsOfPayment(ctx, tx, row.id)).greaterThan(0)) {
      throw new ConflictError("This payment has been refunded, so it cannot be voided.", "PAYMENT_REFUNDED");
    }

    // The ledger row keeps its amount; the order's running totals are recomputed without it.
    const order = required(await lockOrderForLedger(ctx, tx, row.orderId), "Order");
    const paidAmount = row.type === TransactionType.PAYMENT ? order.paidAmount.minus(row.amount) : order.paidAmount;
    const refundedAmount = row.type === TransactionType.REFUND ? order.refundedAmount.minus(row.amount) : order.refundedAmount;
    const paymentStatus = derivePaymentStatus(order.totalAmount, paidAmount, refundedAmount);
    if (!(await updateOrderLedgerTotals(ctx, tx, order, { paidAmount, refundedAmount, paymentStatus }))) {
      throw new ConflictError("The order was changed by someone else. Reload and try again.", "ORDER_CHANGED");
    }

    await voidLedgerRow(tx, ctx, row.id, input.reason);
    await audit(tx, ctx, {
      action: "transaction.voided",
      resourceType: "transaction",
      resourceId: row.id,
      reason: input.reason,
      before: { status: row.status, type: row.type, amount: moneyDto(row.amount), paidAmount: moneyDto(order.paidAmount), refundedAmount: moneyDto(order.refundedAmount) },
      after: { status: TransactionStatus.VOIDED, paidAmount: moneyDto(paidAmount), refundedAmount: moneyDto(refundedAmount), paymentStatus },
    });
    return { transactionId: row.id, orderId: row.orderId, type: row.type, amount: row.amount };
  });

  logger.info("transaction.voided", { requestId: ctx.requestId, tenantId: ctx.tenantId, transactionId: result.transactionId, type: result.type });
  return { transactionId: result.transactionId, status: TransactionStatus.VOIDED };
}
