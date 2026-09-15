"use server";

import { z } from "zod";
import { OrderType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createOrderFromCart, CreateOrderPayload } from "@/lib/services/orders";
import { ValidationError, NotFoundError, TenantSuspendedError } from "@/lib/errors";

const PublicCheckoutSchema = z.object({
  orderType: z.nativeEnum(OrderType),
  tableNumber: z.string().optional(),
  notes: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid("Invalid menu item ID"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        specialInstructions: z.string().optional(),
        options: z.record(z.any()).optional(),
      })
    )
    .min(1, "Cart must contain at least one item"),
});

export async function submitPublicOrderAction(
  slug: string,
  input: z.input<typeof PublicCheckoutSchema>
) {
  if (!slug) {
    throw new ValidationError("Restaurant slug is required");
  }

  // Resolve tenant ID from public slug
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });

  if (!tenant) {
    throw new NotFoundError(`Restaurant with slug '${slug}' not found`);
  }

  if (tenant.status !== "ACTIVE") {
    throw new TenantSuspendedError("This restaurant is currently not accepting orders");
  }

  const parsed = PublicCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid order submission payload",
      parsed.error.flatten().fieldErrors
    );
  }

  const payload: CreateOrderPayload = {
    orderType: parsed.data.orderType,
    tableNumber: parsed.data.tableNumber,
    notes: parsed.data.notes,
    customer: {
      name: parsed.data.customerName,
      phone: parsed.data.customerPhone,
      email: parsed.data.customerEmail,
    },
    items: parsed.data.items,
  };

  const order = await createOrderFromCart(tenant.id, payload);

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount.toString(),
    status: order.status,
  };
}
