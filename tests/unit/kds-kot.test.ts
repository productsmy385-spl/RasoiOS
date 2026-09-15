import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKOTTicketsForOrder, updateKOTStatus, generateKOTNumber } from "@/lib/services/kot";
import { getKOTTicketsAction, updateKOTStatusAction } from "@/app/restaurant/kds/actions";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { KOTStatus, OrderType, Role } from "@prisma/client";
import { TenantAccessDeniedError } from "@/lib/errors";

vi.mock("@/lib/auth/clerk", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    kOTTicket: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
  },
}));

describe("Kitchen Display System & KOT Engine Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantId = "tenant_taj_1";

  it("generateKOTNumber should generate sequential KOT numbers (e.g., KOT-101)", async () => {
    vi.mocked(prisma.kOTTicket.count).mockResolvedValue(0);

    const kotNo = await generateKOTNumber(tenantId);
    expect(kotNo).toBe("KOT-101");
  });

  it("generateKOTTicketsForOrder should create KOT ticket for valid order in QUEUED status", async () => {
    vi.mocked(prisma.order.findFirst).mockResolvedValue({
      id: "order_100",
      tenantId,
      orderNumber: "ORD-20260915-0001",
      orderType: OrderType.DINE_IN,
      notes: "Less spicy",
      items: [
        { id: "item_1", itemNameSnapshot: "Tandoori Chicken", quantity: 2 },
      ],
    } as never);

    vi.mocked(prisma.kOTTicket.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.kOTTicket.count).mockResolvedValue(2);

    vi.mocked(prisma.kOTTicket.create).mockResolvedValue({
      id: "kot_123",
      tenantId,
      orderId: "order_100",
      kotNumber: "KOT-103",
      kitchenSection: "MAIN_KITCHEN",
      status: KOTStatus.QUEUED,
      notes: "Less spicy",
      createdAt: new Date(),
      updatedAt: new Date(),
      order: {
        id: "order_100",
        orderNumber: "ORD-20260915-0001",
        orderType: OrderType.DINE_IN,
        tableNumber: "4",
        items: [],
        customer: null,
      },
    } as never);

    const ticket = await generateKOTTicketsForOrder(tenantId, "order_100");

    expect(ticket.kotNumber).toBe("KOT-103");
    expect(ticket.status).toBe(KOTStatus.QUEUED);
  });

  it("updateKOTStatus should allow valid transitions and reject invalid transitions", async () => {
    vi.mocked(prisma.kOTTicket.findFirst).mockResolvedValue({
      id: "kot_123",
      tenantId,
      kotNumber: "KOT-103",
      status: KOTStatus.QUEUED,
    } as never);

    vi.mocked(prisma.kOTTicket.update).mockResolvedValue({
      id: "kot_123",
      tenantId,
      status: KOTStatus.PREPARING,
    } as never);

    // Valid transition: QUEUED -> PREPARING
    const preparingTicket = await updateKOTStatus(
      tenantId,
      "kot_123",
      KOTStatus.PREPARING
    );
    expect(preparingTicket.status).toBe(KOTStatus.PREPARING);

    // Invalid transition: QUEUED -> SERVED directly
    await expect(
      updateKOTStatus(tenantId, "kot_123", KOTStatus.SERVED)
    ).rejects.toThrow("Invalid KOT status transition from QUEUED to SERVED");
  });

  it("getKOTTicketsAction should allow KITCHEN role staff to access kitchen queue", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      userId: "usr_cook_1",
      clerkId: "clerk_cook_1",
      email: "chef@taj.com",
      isUserActive: true,
      userTenants: [
        {
          tenantId: "tenant_taj_1",
          role: Role.KITCHEN,
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    vi.mocked(prisma.kOTTicket.findMany).mockResolvedValue([] as never);

    const res = await getKOTTicketsAction(undefined, tenantId);
    expect(res.success).toBe(true);
    expect(res.tickets).toEqual([]);
  });
});
