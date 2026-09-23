import "server-only";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { db } from "@/lib/db/prisma";
import { businessDateDto, instantDto, moneyDto, rateDto, type MoneyString } from "./dto";
import { mapErrors } from "./errors";

/**
 * Printable receipt (S1-P04-T008 closes BA-02; api.md LD-RCPT-01, TC-TXN-008, TI-035).
 *
 * One tenant-scoped query: a missing order and another tenant's order both return null, and the page renders the same
 * not-found response for both. Totals are the order's stored snapshots (ADR-010 §3–4) and the ledger sums of its
 * successful PAYMENT / REFUND rows (§8), so the printed receipt reconciles to the order and the ledger. No customer
 * contact details are projected (the receipt prints the name only).
 */
export type ReceiptDto = {
  orderId: string;
  orderNumber: string;
  businessDate: string;
  createdAt: string;
  orderType: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  tableLabel: string | null;
  notes: string | null;
  currencyCode: string;
  timezone: string;
  restaurant: { name: string; address: string | null; contactPhone: string | null; contactEmail: string | null };
  customerName: string | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: MoneyString;
    addonsTotal: MoneyString;
    taxRate: string;
    lineSubtotal: MoneyString;
    lineTax: MoneyString;
    lineTotal: MoneyString;
  }>;
  totals: {
    subtotal: MoneyString;
    tax: MoneyString;
    discount: MoneyString;
    total: MoneyString;
    /** Σ successful PAYMENT rows. */
    paid: MoneyString;
    /** Σ successful REFUND rows. */
    refunded: MoneyString;
    /** total − paid + refunded. */
    balance: MoneyString;
  };
  ledger: Array<{ id: string; type: TransactionType; method: PaymentMethod; amount: MoneyString; amountTendered: MoneyString | null; changeDue: MoneyString | null; reference: string | null; createdAt: string }>;
};

export async function getReceipt(ctx: TenantContext, orderId: string): Promise<ReceiptDto | null> {
  const order = await mapErrors("Order", () =>
    db.order.findFirst({
      where: { id: orderId, tenantId: ctx.tenantId },
      select: {
        id: true,
        orderNumber: true,
        businessDate: true,
        createdAt: true,
        orderType: true,
        status: true,
        paymentStatus: true,
        tableLabel: true,
        notes: true,
        currencyCode: true,
        subtotalAmount: true,
        taxAmount: true,
        discountAmount: true,
        totalAmount: true,
        tenant: {
          select: {
            name: true,
            restaurant: { select: { name: true, addressLine1: true, phoneE164: true, email: true } },
          },
        },
        customer: { select: { fullName: true } },
        items: {
          orderBy: [{ kotRound: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            itemNameSnapshot: true,
            variantNameSnapshot: true,
            quantity: true,
            unitPriceSnapshot: true,
            addonsTotalSnapshot: true,
            taxRateSnapshot: true,
            lineSubtotal: true,
            lineTax: true,
            lineTotal: true,
          },
        },
        transactions: {
          where: { status: TransactionStatus.SUCCESS },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, type: true, paymentMethod: true, amount: true, amountTendered: true, changeDue: true, reference: true, createdAt: true },
        },
      },
    }),
  );
  if (!order) return null;

  const zero = new Prisma.Decimal(0);
  const paid = order.transactions.filter((t) => t.type === TransactionType.PAYMENT).reduce((sum, t) => sum.plus(t.amount), zero);
  const refunded = order.transactions.filter((t) => t.type === TransactionType.REFUND).reduce((sum, t) => sum.plus(t.amount), zero);
  const restaurant = order.tenant.restaurant;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    businessDate: businessDateDto(order.businessDate),
    createdAt: instantDto(order.createdAt),
    orderType: order.orderType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    tableLabel: order.tableLabel,
    notes: order.notes,
    currencyCode: order.currencyCode,
    timezone: ctx.restaurant.timezone,
    restaurant: {
      name: restaurant?.name ?? order.tenant.name,
      address: restaurant?.addressLine1 ?? null,
      contactPhone: restaurant?.phoneE164 ?? null,
      contactEmail: restaurant?.email ?? null,
    },
    customerName: order.customer?.fullName ?? null,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.variantNameSnapshot ? `${i.itemNameSnapshot} (${i.variantNameSnapshot})` : i.itemNameSnapshot,
      quantity: i.quantity,
      unitPrice: moneyDto(i.unitPriceSnapshot),
      addonsTotal: moneyDto(i.addonsTotalSnapshot),
      taxRate: rateDto(i.taxRateSnapshot),
      lineSubtotal: moneyDto(i.lineSubtotal),
      lineTax: moneyDto(i.lineTax),
      lineTotal: moneyDto(i.lineTotal),
    })),
    totals: {
      subtotal: moneyDto(order.subtotalAmount),
      tax: moneyDto(order.taxAmount),
      discount: moneyDto(order.discountAmount),
      total: moneyDto(order.totalAmount),
      paid: moneyDto(paid),
      refunded: moneyDto(refunded),
      balance: moneyDto(order.totalAmount.minus(paid).plus(refunded)),
    },
    ledger: order.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      method: t.paymentMethod,
      amount: moneyDto(t.amount),
      amountTendered: t.amountTendered ? moneyDto(t.amountTendered) : null,
      changeDue: t.changeDue ? moneyDto(t.changeDue) : null,
      reference: t.reference,
      createdAt: instantDto(t.createdAt),
    })),
  };
}
