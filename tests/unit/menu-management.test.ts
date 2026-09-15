import { describe, it, expect, vi } from "vitest";
import { createCategoryAction, updateCategoryAction } from "@/app/restaurant/menu/categories-actions";
import { createMenuItemAction, updateMenuItemAction } from "@/app/restaurant/menu/items-actions";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { TenantAccessDeniedError, ValidationError } from "@/lib/errors";

vi.mock("@/lib/auth/clerk", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    menuCategory: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    menuItem: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Menu Management Server Actions Security & Validation Tests", () => {
  const mockTenantAdminSession = {
    userId: "usr_admin_1",
    clerkId: "clerk_admin_1",
    email: "admin@taj.com",
    isUserActive: true,
    userTenants: [
      {
        tenantId: "tenant_taj_1",
        role: "TENANT_ADMIN" as const,
        isTenantActive: true,
        isUserTenantActive: true,
      },
    ],
  };

  it("createCategoryAction should create category for authorized TENANT_ADMIN", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockTenantAdminSession);
    vi.mocked(prisma.menuCategory.create).mockResolvedValue({
      id: "cat_new_1",
      tenantId: "tenant_taj_1",
      name: "Desserts",
      description: "Sweets",
      sortOrder: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await createCategoryAction(
      { name: "Desserts", description: "Sweets", sortOrder: 1 },
      "tenant_taj_1"
    );

    expect(result.success).toBe(true);
    expect(result.category.name).toBe("Desserts");
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
  });

  it("createMenuItemAction should convert price string to Decimal and validate tenant category ownership", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockTenantAdminSession);
    vi.mocked(prisma.menuCategory.findUnique).mockResolvedValue({
      id: "cat_valid_1",
      tenantId: "tenant_taj_1",
    } as never);

    vi.mocked(prisma.menuItem.create).mockResolvedValue({
      id: "item_new_1",
      tenantId: "tenant_taj_1",
      categoryId: "cat_valid_1",
      name: "Gulab Jamun",
      description: "Warm sweet dumplings",
      imageUrl: null,
      price: { toString: () => "150.00" },
      taxRate: { toString: () => "5.00" },
      isAvailable: true,
      displayOrder: 1,
      variants: null,
      addOns: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await createMenuItemAction(
      {
        categoryId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Gulab Jamun",
        price: "150.00",
        taxRate: "5.00",
      },
      "tenant_taj_1"
    );

    expect(result.success).toBe(true);
    expect(result.item.price).toBe("150.00");
  });

  it("should reject menu actions from unauthorized roles (e.g. KITCHEN)", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      ...mockTenantAdminSession,
      userTenants: [
        {
          tenantId: "tenant_taj_1",
          role: "KITCHEN" as const,
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    await expect(
      createCategoryAction({ name: "Unauthorized Cat" }, "tenant_taj_1")
    ).rejects.toThrow(TenantAccessDeniedError);
  });
});
