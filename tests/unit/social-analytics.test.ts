import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSocialPost, updateSocialPostStatus } from "@/lib/services/social";
import { getTenantSalesAnalytics } from "@/lib/services/analytics";
import { getAnalyticsAction } from "@/app/restaurant/analytics/actions";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { SocialPostStatus, OrderStatus, OrderType, Prisma, Role } from "@prisma/client";
import { TenantAccessDeniedError } from "@/lib/errors";

vi.mock("@/lib/auth/clerk", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    socialPost: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
  },
}));

describe("Social Marketing & Executive Analytics Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantId = "tenant_taj_1";

  it("createSocialPost should create post with initial status DRAFT or SCHEDULED", async () => {
    vi.mocked(prisma.socialPost.create).mockResolvedValue({
      id: "post_1",
      tenantId,
      platform: "ALL",
      content: "Weekend special discount!",
      mediaUrl: null,
      status: SocialPostStatus.DRAFT,
      scheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const post = await createSocialPost(tenantId, {
      content: "Weekend special discount!",
    });

    expect(post.content).toBe("Weekend special discount!");
    expect(post.status).toBe(SocialPostStatus.DRAFT);
  });

  it("getTenantSalesAnalytics should aggregate gross revenue and top selling items with Decimal precision", async () => {
    const mockOrders = [
      {
        id: "ord_1",
        tenantId,
        orderType: OrderType.DINE_IN,
        status: OrderStatus.COMPLETED,
        totalAmount: new Prisma.Decimal("1000.00"),
        createdAt: new Date(),
        items: [
          {
            itemNameSnapshot: "Butter Chicken",
            priceSnapshot: new Prisma.Decimal("500.00"),
            quantity: 2,
          },
        ],
      },
      {
        id: "ord_2",
        tenantId,
        orderType: OrderType.TAKEAWAY,
        status: OrderStatus.COMPLETED,
        totalAmount: new Prisma.Decimal("500.00"),
        createdAt: new Date(),
        items: [
          {
            itemNameSnapshot: "Butter Naan",
            priceSnapshot: new Prisma.Decimal("100.00"),
            quantity: 5,
          },
        ],
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as never);

    const analytics = await getTenantSalesAnalytics(tenantId, "30d");

    expect(analytics.grossRevenue).toBe("1500.00");
    expect(analytics.totalOrders).toBe(2);
    expect(analytics.averageOrderValue).toBe("750.00");
    expect(analytics.orderTypeBreakdown.DINE_IN.count).toBe(1);
    expect(analytics.orderTypeBreakdown.TAKEAWAY.count).toBe(1);
    expect(analytics.topMenuItems.length).toBe(2);
    expect(analytics.topMenuItems[0].name).toBe("Butter Naan");
    expect(analytics.topMenuItems[0].quantity).toBe(5);
  });

  it("getAnalyticsAction should enforce reports:view permission", async () => {
    // WAITER role lacks reports:view permission
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      userId: "usr_waiter_1",
      clerkId: "clerk_waiter_1",
      email: "waiter@taj.com",
      isUserActive: true,
      userTenants: [
        {
          tenantId,
          role: Role.WAITER,
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    await expect(
      getAnalyticsAction("30d", tenantId)
    ).rejects.toThrow(TenantAccessDeniedError);
  });
});
