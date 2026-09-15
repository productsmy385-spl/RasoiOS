import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrderFromCart, updateOrderStatus, generateOrderNumber } from "@/lib/services/orders";
import { updateOrderStatusAction } from "@/app/restaurant/orders/actions";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { OrderStatus, OrderType, Prisma } from "@prisma/client";
import { TenantAccessDeniedError } from "@/lib/errors";

vi.mock("@/lib/auth/clerk", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    menuItem: {
      findMany: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    order: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Orders Engine & State Machine Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantId = "tenant_taj_1";

  it("generateOrderNumber should format tenant sequence as ORD-YYYYMMDD-XXXX", async () => {
    vi.mocked(prisma.order.count).mockResolvedValue(4);

    const orderNo = await generateOrderNumber(tenantId);
    expect(orderNo).toMatch(/^ORD-\d{8}-0005$/);
  });

  it("createOrderFromCart should calculate Decimal monetary total, tax, and item snapshots", async () => {
    const mockMenuItems = [
      {
        id: "item_1",
        tenantId,
        name: "Butter Chicken",
        price: new Prisma.Decimal("500.00"),
        taxRate: new Prisma.Decimal("5.00"), // 5% tax
        isAvailable: true,
      },
      {
        id: "item_2",
        tenantId,
        name: "Garlic Naan",
        price: new Prisma.Decimal("100.00"),
        taxRate: new Prisma.Decimal("5.00"),
        isAvailable: true,
      },
    ];

    vi.mocked(prisma.menuItem.findMany).mockResolvedValue(mockMenuItems as never);
    vi.mocked(prisma.order.count).mockResolvedValue(0);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customer.create).mockResolvedValue({
      id: "cust_1",
      tenantId,
      name: "Gopala Krishna",
      phone: "+919876543210",
      email: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.mocked(prisma.order.create).mockImplementation(((args: any) => {
      return Promise.resolve({
        id: "order_123",
        tenantId,
        orderNumber: args.data.orderNumber,
        orderType: args.data.orderType,
        status: args.data.status,
        tableNumber: args.data.tableNumber,
        totalAmount: args.data.totalAmount, // Decimal
        customerId: args.data.customerId,
        notes: args.data.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: args.data.items.create,
      });
    }) as any);

    const payload = {
      orderType: OrderType.DINE_IN,
      tableNumber: "Table 4",
      customer: {
        name: "Gopala Krishna",
        phone: "+919876543210",
      },
      items: [
        { menuItemId: "item_1", quantity: 2 }, // (500 * 2) = 1000 subtotal, 50 tax = 1050
        { menuItemId: "item_2", quantity: 3 }, // (100 * 3) = 300 subtotal, 15 tax = 315
      ], // Grand Total = 1050 + 315 = 1365.00
    };

    const order = await createOrderFromCart(tenantId, payload);

    expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["item_1", "item_2"] },
        tenantId,
        isAvailable: true,
      },
    });

    // Verify calculated total amount is 1365.00
    expect(order.totalAmount.toString()).toBe("1365");
    expect(order.items.length).toBe(2);
    expect(order.items[0].itemNameSnapshot).toBe("Butter Chicken");
    expect(order.items[0].priceSnapshot.toString()).toBe("500");
  });

  it("updateOrderStatus should allow valid state transitions and reject invalid transitions", async () => {
    // Mock existing order in NEW status
    vi.mocked(prisma.order.findFirst).mockResolvedValue({
      id: "order_123",
      tenantId,
      orderNumber: "ORD-20260915-0001",
      status: OrderStatus.NEW,
    } as never);

    vi.mocked(prisma.order.update).mockResolvedValue({
      id: "order_123",
      tenantId,
      status: OrderStatus.ACCEPTED,
    } as never);

    // Valid transition: NEW -> ACCEPTED
    const acceptedOrder = await updateOrderStatus(
      tenantId,
      "order_123",
      OrderStatus.ACCEPTED
    );
    expect(acceptedOrder.status).toBe(OrderStatus.ACCEPTED);

    // Invalid transition: NEW -> COMPLETED directly (skipping ACCEPTED/PREPARING/READY)
    await expect(
      updateOrderStatus(tenantId, "order_123", OrderStatus.COMPLETED)
    ).rejects.toThrow("Invalid order status transition from NEW to COMPLETED");
  });

  it("updateOrderStatusAction should reject status updates from unauthorized roles", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      userId: "usr_super_1",
      clerkId: "clerk_super_1",
      email: "super@platform.com",
      isUserActive: true,
      userTenants: [
        {
          tenantId: "tenant_taj_1",
          role: "SUPER_ADMIN" as const, // SUPER_ADMIN lacks direct order:update_status operational permission
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    await expect(
      updateOrderStatusAction("order_123", OrderStatus.ACCEPTED, tenantId)
    ).rejects.toThrow(TenantAccessDeniedError);
  });
});
