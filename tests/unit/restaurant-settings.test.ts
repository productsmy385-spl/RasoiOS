import { describe, it, expect, vi } from "vitest";
import { updateRestaurantProfileAction } from "@/app/restaurant/settings/actions";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { TenantAccessDeniedError, ValidationError } from "@/lib/errors";

vi.mock("@/lib/auth/clerk", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    restaurant: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Restaurant Settings Server Action Security Tests", () => {
  it("should update restaurant profile successfully for authorized TENANT_ADMIN", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      userId: "usr_admin_1",
      clerkId: "clerk_admin_1",
      email: "owner@taj.com",
      isUserActive: true,
      userTenants: [
        {
          tenantId: "tenant_taj_100",
          role: "TENANT_ADMIN",
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    vi.mocked(prisma.restaurant.findFirst).mockResolvedValue({
      id: "rest_taj_100",
      tenantId: "tenant_taj_100",
      name: "Old Taj Name",
    } as never);

    vi.mocked(prisma.restaurant.update).mockResolvedValue({
      id: "rest_taj_100",
      tenantId: "tenant_taj_100",
      name: "New Taj Palace Name",
      logo: null,
      description: "Updated description",
      address: "123 New St",
      contactEmail: "info@newtaj.com",
      contactPhone: "+91 9999999999",
      openingHours: "10 AM - 11 PM",
    } as never);

    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await updateRestaurantProfileAction(
      {
        name: "New Taj Palace Name",
        description: "Updated description",
        address: "123 New St",
        contactEmail: "info@newtaj.com",
        contactPhone: "+91 9999999999",
        openingHours: "10 AM - 11 PM",
      },
      "tenant_taj_100"
    );

    expect(result.success).toBe(true);
    expect(result.restaurant.name).toBe("New Taj Palace Name");
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
  });

  it("should reject update attempt from unauthorized role (e.g. CASHIER)", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      userId: "usr_cashier_1",
      clerkId: "clerk_cashier_1",
      email: "cashier@taj.com",
      isUserActive: true,
      userTenants: [
        {
          tenantId: "tenant_taj_100",
          role: "CASHIER",
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    await expect(
      updateRestaurantProfileAction(
        { name: "Attempted Name Change" },
        "tenant_taj_100"
      )
    ).rejects.toThrow(TenantAccessDeniedError);
  });

  it("should reject input with invalid data (e.g. name < 2 chars)", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      userId: "usr_admin_1",
      clerkId: "clerk_admin_1",
      email: "owner@taj.com",
      isUserActive: true,
      userTenants: [
        {
          tenantId: "tenant_taj_100",
          role: "TENANT_ADMIN",
          isTenantActive: true,
          isUserTenantActive: true,
        },
      ],
    });

    await expect(
      updateRestaurantProfileAction({ name: "A" }, "tenant_taj_100")
    ).rejects.toThrow(ValidationError);
  });
});
