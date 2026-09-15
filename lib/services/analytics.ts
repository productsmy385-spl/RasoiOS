import { prisma } from "@/lib/db/prisma";
import { OrderStatus, OrderType, Prisma } from "@prisma/client";

export type Timeframe = "today" | "7d" | "30d" | "all";

export interface AnalyticsSummary {
  grossRevenue: string; // Decimal string
  totalOrders: number;
  averageOrderValue: string;
  orderTypeBreakdown: Record<OrderType, { count: number; total: string }>;
  topMenuItems: Array<{
    name: string;
    quantity: number;
    revenue: string;
  }>;
  recentOrdersCount: number;
}

/**
 * Calculates tenant sales and operational analytics using exact Decimal calculations.
 */
export async function getTenantSalesAnalytics(
  tenantId: string,
  timeframe: Timeframe = "30d"
): Promise<AnalyticsSummary> {
  const now = new Date();
  let startDate: Date | undefined = undefined;

  if (timeframe === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const whereClause: Prisma.OrderWhereInput = {
    tenantId,
    status: {
      in: [OrderStatus.COMPLETED, OrderStatus.READY, OrderStatus.PREPARING, OrderStatus.ACCEPTED, OrderStatus.NEW],
    },
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  };

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      items: true,
    },
  });

  let grossRevenue = new Prisma.Decimal(0);
  const orderTypeBreakdown: Record<OrderType, { count: number; total: Prisma.Decimal }> = {
    DINE_IN: { count: 0, total: new Prisma.Decimal(0) },
    TAKEAWAY: { count: 0, total: new Prisma.Decimal(0) },
    DELIVERY: { count: 0, total: new Prisma.Decimal(0) },
  };

  const itemAggregator = new Map<string, { name: string; quantity: number; revenue: Prisma.Decimal }>();

  for (const order of orders) {
    const orderTotal = order.totalAmount;
    grossRevenue = grossRevenue.add(orderTotal);

    const typeBreakdown = orderTypeBreakdown[order.orderType] || {
      count: 0,
      total: new Prisma.Decimal(0),
    };
    typeBreakdown.count += 1;
    typeBreakdown.total = typeBreakdown.total.add(orderTotal);
    orderTypeBreakdown[order.orderType] = typeBreakdown;

    for (const item of order.items) {
      const existing = itemAggregator.get(item.itemNameSnapshot) || {
        name: item.itemNameSnapshot,
        quantity: 0,
        revenue: new Prisma.Decimal(0),
      };

      const itemRevenue = item.priceSnapshot.mul(new Prisma.Decimal(item.quantity));
      existing.quantity += item.quantity;
      existing.revenue = existing.revenue.add(itemRevenue);
      itemAggregator.set(item.itemNameSnapshot, existing);
    }
  }

  const totalOrders = orders.length;
  const aov = totalOrders > 0 ? grossRevenue.div(new Prisma.Decimal(totalOrders)) : new Prisma.Decimal(0);

  const topMenuItems = Array.from(itemAggregator.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map((item) => ({
      name: item.name,
      quantity: item.quantity,
      revenue: item.revenue.toFixed(2),
    }));

  return {
    grossRevenue: grossRevenue.toFixed(2),
    totalOrders,
    averageOrderValue: aov.toFixed(2),
    orderTypeBreakdown: {
      DINE_IN: {
        count: orderTypeBreakdown.DINE_IN.count,
        total: orderTypeBreakdown.DINE_IN.total.toFixed(2),
      },
      TAKEAWAY: {
        count: orderTypeBreakdown.TAKEAWAY.count,
        total: orderTypeBreakdown.TAKEAWAY.total.toFixed(2),
      },
      DELIVERY: {
        count: orderTypeBreakdown.DELIVERY.count,
        total: orderTypeBreakdown.DELIVERY.total.toFixed(2),
      },
    },
    topMenuItems,
    recentOrdersCount: totalOrders,
  };
}
