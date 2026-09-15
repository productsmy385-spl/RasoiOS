import { prisma } from "@/lib/db/prisma";
import { OrderStatus, OrderType, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { generateKOTTicketsForOrder } from "@/lib/services/kot";

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  options?: Record<string, any>;
}

export interface CreateOrderPayload {
  orderType: OrderType;
  tableNumber?: string;
  notes?: string;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
  };
  items: CreateOrderItemInput[];
}

export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
  limit?: number;
}

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  ACCEPTED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * Generates a human-readable tenant-isolated order number (e.g. ORD-20260915-0001).
 */
export async function generateOrderNumber(tenantId: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.order.count({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `ORD-${dateStr}-${sequence}`;
}

/**
 * Creates an order with server-calculated totals, price snapshotting, and optional customer linking.
 */
export async function createOrderFromCart(
  tenantId: string,
  payload: CreateOrderPayload
) {
  if (!payload.items || payload.items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  // 1. Fetch active menu items for tenant to guarantee prices are not tampered by client
  const itemIds = payload.items.map((i) => i.menuItemId);
  const dbMenuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: itemIds },
      tenantId,
      isAvailable: true,
    },
  });

  const dbItemMap = new Map(dbMenuItems.map((item) => [item.id, item]));

  // Verify all requested items exist and belong to tenant
  for (const item of payload.items) {
    if (!dbItemMap.has(item.menuItemId)) {
      throw new Error(`Menu item ${item.menuItemId} is invalid or unavailable`);
    }
    if (item.quantity <= 0) {
      throw new Error("Item quantity must be greater than zero");
    }
  }

  // 2. Compute monetary total with Prisma Decimal
  let totalAmount = new Prisma.Decimal(0);
  const orderItemsData: Array<{
    menuItemId: string;
    itemNameSnapshot: string;
    priceSnapshot: Prisma.Decimal;
    taxRateSnapshot: Prisma.Decimal;
    quantity: number;
    specialInstructions?: string;
    optionsSnapshot?: any;
  }> = [];

  for (const inputItem of payload.items) {
    const menuItem = dbItemMap.get(inputItem.menuItemId)!;
    const quantity = new Prisma.Decimal(inputItem.quantity);
    const itemPrice = menuItem.price; // Decimal
    const taxRate = menuItem.taxRate; // Decimal percentage, e.g. 5.00

    // subtotal for item = itemPrice * quantity
    const itemSubtotal = itemPrice.mul(quantity);
    
    // tax for item = itemSubtotal * (taxRate / 100)
    const taxMultiplier = taxRate.div(new Prisma.Decimal(100));
    const itemTax = itemSubtotal.mul(taxMultiplier);

    const itemTotal = itemSubtotal.add(itemTax);
    totalAmount = totalAmount.add(itemTotal);

    orderItemsData.push({
      menuItemId: menuItem.id,
      itemNameSnapshot: menuItem.name,
      priceSnapshot: menuItem.price,
      taxRateSnapshot: menuItem.taxRate,
      quantity: inputItem.quantity,
      specialInstructions: inputItem.specialInstructions,
      optionsSnapshot: inputItem.options || null,
    });
  }

  // 3. Upsert Customer record if customer info provided
  let customerId: string | undefined = undefined;
  if (payload.customer && payload.customer.name.trim()) {
    const customerPhone = payload.customer.phone?.trim() || null;
    const customerEmail = payload.customer.email?.trim() || null;

    let existingCustomer = null;
    if (customerPhone) {
      existingCustomer = await prisma.customer.findFirst({
        where: { tenantId, phone: customerPhone },
      });
    } else if (customerEmail) {
      existingCustomer = await prisma.customer.findFirst({
        where: { tenantId, email: customerEmail },
      });
    }

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update name/notes if new values provided
      await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          name: payload.customer.name.trim(),
          email: customerEmail || existingCustomer.email,
          notes: payload.customer.notes || existingCustomer.notes,
        },
      });
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          tenantId,
          name: payload.customer.name.trim(),
          phone: customerPhone,
          email: customerEmail,
          notes: payload.customer.notes || null,
        },
      });
      customerId = newCustomer.id;
    }
  }

  // 4. Generate order number
  const orderNumber = await generateOrderNumber(tenantId);

  // 5. Create Order and OrderItems in single transaction
  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNumber,
      orderType: payload.orderType,
      status: OrderStatus.NEW,
      tableNumber: payload.tableNumber || null,
      notes: payload.notes || null,
      totalAmount,
      customerId: customerId || null,
      items: {
        create: orderItemsData,
      },
    },
    include: {
      items: true,
      customer: true,
    },
  });

  // Auto-generate KOT Ticket for kitchen display
  try {
    await generateKOTTicketsForOrder(tenantId, order.id);
  } catch (kotErr) {
    logger.warn("Failed to auto-generate KOT ticket on order creation", { tenantId, orderId: order.id });
  }

  logger.info("ORDER_CREATED", {
    tenantId,
    orderId: order.id,
    orderNumber,
    totalAmount: totalAmount.toString(),
    orderType: payload.orderType,
  });

  return order;
}

/**
 * Updates order status with state machine guard enforcement.
 */
export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  nextStatus: OrderStatus,
  actorUserId?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });

  if (!order) {
    throw new Error("Order not found or cross-tenant access violation");
  }

  const currentStatus = order.status;
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(nextStatus)) {
    throw new Error(
      `Invalid order status transition from ${currentStatus} to ${nextStatus}`
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
    include: { items: true, customer: true },
  });

  if (nextStatus === OrderStatus.ACCEPTED) {
    try {
      await generateKOTTicketsForOrder(tenantId, orderId);
    } catch (kotErr) {
      logger.warn("Failed to auto-generate KOT ticket on order acceptance", { tenantId, orderId });
    }
  }

  logger.info("ORDER_STATUS_UPDATED", {
    tenantId,
    orderId,
    orderNumber: order.orderNumber,
    previousStatus: currentStatus,
    newStatus: nextStatus,
    actorUserId,
  });

  return updatedOrder;
}

/**
 * Retrieves orders for a tenant with optional filtering.
 */
export async function getTenantOrders(
  tenantId: string,
  filters?: OrderFilters
) {
  const whereClause: Prisma.OrderWhereInput = {
    tenantId,
  };

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  if (filters?.search) {
    whereClause.OR = [
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      { tableNumber: { contains: filters.search, mode: "insensitive" } },
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
      { customer: { phone: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  return prisma.order.findMany({
    where: whereClause,
    include: {
      items: true,
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 100,
  });
}

/**
 * Retrieves customer registry for a tenant.
 */
export async function getTenantCustomers(tenantId: string, query?: string) {
  const whereClause: Prisma.CustomerWhereInput = {
    tenantId,
  };

  if (query && query.trim()) {
    const q = query.trim();
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  return prisma.customer.findMany({
    where: whereClause,
    include: {
      _count: {
        select: { orders: true },
      },
      orders: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, totalAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
