import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { PrintReceiptClient } from "./print-receipt-client";

interface ReceiptPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function PrintableReceiptPage({ params }: ReceiptPageProps) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: {
        include: {
          restaurants: {
            take: 1,
          },
        },
      },
      customer: true,
      items: true,
      transactions: {
        where: { status: "SUCCESS" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const restaurant = order.tenant.restaurants[0] || {
    name: order.tenant.name,
    address: null,
    contactPhone: null,
    contactEmail: null,
  };

  const receiptData = {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    notes: order.notes,
    totalAmount: order.totalAmount.toString(),
    restaurant: {
      name: restaurant.name,
      address: restaurant.address,
      contactPhone: restaurant.contactPhone,
      contactEmail: restaurant.contactEmail,
    },
    customer: order.customer
      ? {
          name: order.customer.name,
          phone: order.customer.phone,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.itemNameSnapshot,
      price: item.priceSnapshot.toString(),
      taxRate: item.taxRateSnapshot.toString(),
      quantity: item.quantity,
    })),
    transactions: order.transactions.map((tx) => ({
      id: tx.id,
      paymentMethod: tx.paymentMethod,
      amount: tx.amount.toString(),
      reference: tx.referenceId,
      createdAt: tx.createdAt.toISOString(),
    })),
  };

  return <PrintReceiptClient data={receiptData} />;
}
