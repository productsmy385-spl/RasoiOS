"use server";

import { z } from "zod";
import { OrderStatus, OrderType } from "@prisma/client";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import {
  getTenantOrders,
  updateOrderStatus,
  createOrderFromCart,
  CreateOrderPayload,
} from "@/lib/services/orders";
import { ValidationError } from "@/lib/errors";

const OrderStatusSchema = z.nativeEnum(OrderStatus);

const CreateOrderSchema = z.object({
  orderType: z.nativeEnum(OrderType),
  tableNumber: z.string().optional(),
  notes: z.string().optional(),
  customer: z
    .object({
      name: z.string().min(1, "Customer name is required"),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      notes: z.string().optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid("Invalid menu item ID"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        specialInstructions: z.string().optional(),
        options: z.record(z.any()).optional(),
      })
    )
    .min(1, "Order must contain at least one item"),
});

export async function getOrdersAction(
  filters?: { status?: OrderStatus; search?: string },
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);

  // Require staff permissions for orders view (or tenant admin/manager/cashier/kitchen/waiter)
  // Check if role is allowed
  const orders = await getTenantOrders(context.tenantId, filters);
  return { success: true, orders };
}

export async function updateOrderStatusAction(
  orderId: string,
  nextStatus: OrderStatus,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "order:update_status");

  const parsedStatus = OrderStatusSchema.safeParse(nextStatus);
  if (!parsedStatus.success) {
    throw new ValidationError("Invalid order status requested");
  }

  const updatedOrder = await updateOrderStatus(
    context.tenantId,
    orderId,
    parsedStatus.data,
    context.userId
  );

  return { success: true, order: updatedOrder };
}

export async function createStaffOrderAction(
  input: z.input<typeof CreateOrderSchema>,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "order:create");

  const parsed = CreateOrderSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid order payload",
      parsed.error.flatten().fieldErrors
    );
  }

  const order = await createOrderFromCart(
    context.tenantId,
    parsed.data as CreateOrderPayload
  );

  return { success: true, order };
}
