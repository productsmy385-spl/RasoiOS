import { prisma } from "@/lib/db/prisma";
import { PaymentMethod, TransactionStatus, OrderStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export interface ProcessPaymentPayload {
  amount: string | number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  search?: string;
  limit?: number;
}

/**
 * Processes a payment for an order using Prisma Decimal for exact monetary precision.
 */
export async function processOrderPayment(
  tenantId: string,
  orderId: string,
  payload: ProcessPaymentPayload,
  actorUserId?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { transactions: true },
  });

  if (!order) {
    throw new Error("Order not found or cross-tenant access violation");
  }

  if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
    throw new Error(`Cannot process payment for order in ${order.status} status`);
  }

  const paymentAmount = new Prisma.Decimal(payload.amount);
  if (paymentAmount.lte(0)) {
    throw new Error("Payment amount must be greater than zero");
  }

  // Create Transaction record
  const transaction = await prisma.transaction.create({
    data: {
      tenantId,
      orderId,
      amount: paymentAmount,
      paymentMethod: payload.paymentMethod,
      status: TransactionStatus.SUCCESS,
      referenceId: payload.transactionReference?.trim() || null,
    },
  });

  // Calculate sum of successful transactions
  const successfulTransactions = await prisma.transaction.findMany({
    where: {
      tenantId,
      orderId,
      status: TransactionStatus.SUCCESS,
    },
  });

  const totalPaid = successfulTransactions.reduce(
    (sum, tx) => sum.add(tx.amount),
    new Prisma.Decimal(0)
  );

  // If order total is settled, update order status to COMPLETED if it's currently READY or ACCEPTED/PREPARING
  if (totalPaid.gte(order.totalAmount) && order.status !== OrderStatus.COMPLETED) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED },
    });
  }

  logger.info("PAYMENT_PROCESSED", {
    tenantId,
    orderId,
    transactionId: transaction.id,
    amount: paymentAmount.toString(),
    paymentMethod: payload.paymentMethod,
    actorUserId,
  });

  return transaction;
}

/**
 * Processes a transaction refund.
 */
export async function processRefund(
  tenantId: string,
  transactionId: string,
  reason?: string,
  actorUserId?: string
) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, tenantId },
    include: { order: true },
  });

  if (!transaction) {
    throw new Error("Transaction not found or cross-tenant access violation");
  }

  if (transaction.status === TransactionStatus.REFUNDED) {
    throw new Error("Transaction is already refunded");
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: TransactionStatus.REFUNDED,
    },
  });

  // Mark order status as REFUNDED
  await prisma.order.update({
    where: { id: transaction.orderId },
    data: {
      status: OrderStatus.REFUNDED,
      ...(reason ? { notes: `Refund reason: ${reason}` } : {}),
    },
  });

  logger.info("TRANSACTION_REFUNDED", {
    tenantId,
    transactionId,
    orderId: transaction.orderId,
    amount: transaction.amount.toString(),
    reason,
    actorUserId,
  });

  return updatedTransaction;
}

/**
 * Retrieves payment transactions for tenant with optional filtering.
 */
export async function getTenantTransactions(
  tenantId: string,
  filters?: TransactionFilters
) {
  const whereClause: Prisma.TransactionWhereInput = {
    tenantId,
  };

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  if (filters?.paymentMethod) {
    whereClause.paymentMethod = filters.paymentMethod;
  }

  if (filters?.search) {
    whereClause.OR = [
      { referenceId: { contains: filters.search, mode: "insensitive" } },
      { order: { orderNumber: { contains: filters.search, mode: "insensitive" } } },
      { order: { customer: { name: { contains: filters.search, mode: "insensitive" } } } },
    ];
  }

  return prisma.transaction.findMany({
    where: whereClause,
    include: {
      order: {
        include: {
          customer: true,
          items: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 100,
  });
}
