"use server";

import { z } from "zod";
import { PaymentMethod, TransactionStatus } from "@prisma/client";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import {
  processOrderPayment,
  processRefund,
  getTenantTransactions,
  ProcessPaymentPayload,
} from "@/lib/services/payments";
import { ValidationError } from "@/lib/errors";

const ProcessPaymentSchema = z.object({
  amount: z.string().or(z.number()),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export async function processPaymentAction(
  orderId: string,
  input: z.input<typeof ProcessPaymentSchema>,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "payment:process");

  const parsed = ProcessPaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid payment payload",
      parsed.error.flatten().fieldErrors
    );
  }

  const transaction = await processOrderPayment(
    context.tenantId,
    orderId,
    parsed.data as ProcessPaymentPayload,
    context.userId
  );

  return { success: true, transaction };
}

export async function processRefundAction(
  transactionId: string,
  reason?: string,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "refund:process");

  const updatedTransaction = await processRefund(
    context.tenantId,
    transactionId,
    reason,
    context.userId
  );

  return { success: true, transaction: updatedTransaction };
}

export async function getTransactionsAction(
  filters?: { status?: TransactionStatus; paymentMethod?: PaymentMethod; search?: string },
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "payment:process");

  const transactions = await getTenantTransactions(context.tenantId, filters);
  return { success: true, transactions };
}
