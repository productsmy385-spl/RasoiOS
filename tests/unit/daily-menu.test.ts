import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrUpdateDailyMenuAction, publishDailyMenuAction } from "@/app/restaurant/menu/daily-actions";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/auth/clerk", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    menuItem: {
      findMany: vi.fn(),
    },
    dailyMenu: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dailyMenuItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Daily Menu Server Actions Security & Validation Tests", () => {
  const mockSession = {
    userId: "usr_mgr_1",
    clerkId: "clerk_mgr_1",
    email: "manager@taj.com",
    isUserActive: true,
    userTenants: [
      {
        tenantId: "tenant_taj_1",
        role: "MANAGER" as const,
        isTenantActive: true,
        isUserTenantActive: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createOrUpdateDailyMenuAction should upsert daily menu for authorized MANAGER", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockSession);
    const itemUuid = "123e4567-e89b-12d3-a456-426614174000";

    vi.mocked(prisma.menuItem.findMany).mockResolvedValue([{ id: itemUuid }] as never);
    vi.mocked(prisma.dailyMenu.upsert).mockResolvedValue({
      id: "daily_1",
      tenantId: "tenant_taj_1",
      date: new Date("2026-09-15"),
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.dailyMenuItem.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.dailyMenuItem.createMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await createOrUpdateDailyMenuAction(
      {
        date: "2026-09-15",
        itemIds: [itemUuid],
        status: "DRAFT",
      },
      "tenant_taj_1"
    );

    expect(result.success).toBe(true);
    expect(result.dailyMenu.id).toBe("daily_1");
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
  });

  it("publishDailyMenuAction should publish daily menu and write audit log", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.dailyMenu.findUnique).mockResolvedValue({
      id: "daily_1",
      tenantId: "tenant_taj_1",
    } as never);
    vi.mocked(prisma.dailyMenu.update).mockResolvedValue({
      id: "daily_1",
      tenantId: "tenant_taj_1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await publishDailyMenuAction("daily_1", "tenant_taj_1");

    expect(result.success).toBe(true);
    expect(result.dailyMenu.status).toBe("PUBLISHED");
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
  });
});
