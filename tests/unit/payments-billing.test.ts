import { describe, it, expect, vi, beforeEach } from "vitest";
import { processOrderPayment, processRefund, getTenantTransactions } from "@/lib/services/payments";
import { processPaymentAction, processRefundAction } from "@/app/restaurant/billing/actions";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { PaymentMethod, TransactionStatus, OrderStatus, Prisma, Role } from "@prisma/client";
import { TenantAccessDeniedError } from "@/lib/errors";

vi.mock("@/lib/auth/clerk", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Payments, Billing & Transactions Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantId = "tenant_taj_1";

  it("processOrderPayment should create transaction record and update order status when total amount is settled", async () => {
    const mockOrder = {
      id: "order_555",
      tenantId,
      orderNumber: "ORD-20260915-0005",
      totalAmount: new Prisma.Decimal("1000.00"),
      status: OrderStatus.READY,
      transactions: [],
    };

    vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as never);

    vi.mocked(prisma.transaction.create).mockResolvedValue({
      id: "tx_100",
      tenantId,
      orderId: "order_555",
      amount: new Prisma.Decimal("1000.00"),
      paymentMethod: PaymentMethod.UPI,
      status: TransactionStatus.SUCCESS,
      transactionReference: "UPI/987654321",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx_100",
        amount: new Prisma.Decimal("1000.00"),
        status: TransactionStatus.SUCCESS,
      },
    ] as never);

    vi.mocked(prisma.order.update).mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.COMPLETED,
    } as never);

    const tx = await processOrderPayment(tenantId, "order_555", {
      amount: "1000.00",
      paymentMethod: PaymentMethod.UPI,
      transactionReference: "UPI/987654321",
    });

    expect(tx.paymentMethod).toBe(PaymentMethod.UPI);
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order_555" },
      data: { status: OrderStatus.COMPLETED },
    });
  });

  it("processRefund should update transaction and order status to REFUNDED", async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: "tx_100",
      tenantId,
      orderId: "order_555",
      amount: new Prisma.Decimal("1000.00"),
      status: TransactionStatus.SUCCESS,
      notes: null,
    } as never);

    vi.mocked(prisma.transaction.update).mockResolvedValue({
      id: "tx_100",
      tenantId,
      status: TransactionStatus.REFUNDED,
    } as never);

    vi.mocked(prisma.order.update).mockResolvedValue({
      id: "order_555",
      status: OrderStatus.REFUNDED,
    } as never);

    const refundedTx = await processRefund(tenantId, "tx_100", "Customer request");

    expect(refundedTx.status).toBe(TransactionStatus.REFUNDED);
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order_555" },
      data: { status: OrderStatus.REFUNDED, notes: "Refund reason: Customer request" },
    });
  });

  it("processRefundAction should enforce refund:process permission", async () => {
    // CASHIER role lacks refund:process permission
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      userId: "usr_cashier_1",
      clerkId: "clerk_cashier_1",
      email: "cashier@taj.com",
      isUserActive: true,
      userTenants: [
        {
          tenantId,
          role: Role.CASHIER,
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    await expect(
      processRefundAction("tx_100", "Attempted refund", tenantId)
    ).rejects.toThrow(TenantAccessDeniedError);
  });
});
