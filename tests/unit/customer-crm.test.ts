import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTenantCustomers } from "@/lib/services/orders";
import { getCustomersAction } from "@/app/restaurant/customers/actions";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/auth/clerk", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
    },
  },
}));

describe("Customer CRM Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantId = "tenant_taj_1";

  it("getTenantCustomers should query customers filtered by tenantId and optional search query", async () => {
    const mockCustomers = [
      {
        id: "cust_1",
        tenantId,
        name: "Rahul Sharma",
        phone: "+919876543210",
        email: "rahul@example.com",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { orders: 3 },
        orders: [{ createdAt: new Date(), totalAmount: "1250.00" }],
      },
    ];

    vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers as never);

    const result = await getTenantCustomers(tenantId, "Rahul");

    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        OR: [
          { name: { contains: "Rahul", mode: "insensitive" } },
          { phone: { contains: "Rahul", mode: "insensitive" } },
          { email: { contains: "Rahul", mode: "insensitive" } },
        ],
      },
      include: {
        _count: { select: { orders: true } },
        orders: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Rahul Sharma");
  });

  it("getCustomersAction should resolve tenant context from session", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      userId: "usr_cashier_1",
      clerkId: "clerk_cashier_1",
      email: "cashier@taj.com",
      isUserActive: true,
      userTenants: [
        {
          tenantId: "tenant_taj_1",
          role: "CASHIER" as const,
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    vi.mocked(prisma.customer.findMany).mockResolvedValue([] as never);

    const res = await getCustomersAction(undefined, tenantId);
    expect(res.success).toBe(true);
    expect(res.customers).toEqual([]);
  });
});
