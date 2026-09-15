import { describe, it, expect, vi } from "vitest";
import { getPublicRestaurantBySlug } from "@/lib/services/public-restaurant";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Public Restaurant Website Data Projection Security Tests", () => {
  it("should return sanitized public restaurant data and strip private staff/financial data", async () => {
    const mockTenantData = {
      id: "tenant_palace_1",
      name: "Palace Dining",
      slug: "palace-dining",
      timezone: "Asia/Kolkata",
      status: "ACTIVE",
      restaurants: [
        {
          id: "rest_1",
          tenantId: "tenant_palace_1",
          name: "Palace Dining Restaurant",
          logo: "https://example.com/logo.png",
          description: "Fine dining",
          address: "123 Main St",
          contactEmail: "contact@palace.com",
          contactPhone: "+91 9876543210",
          openingHours: "10 AM - 10 PM",
        },
      ],
      menuCategories: [
        {
          id: "cat_1",
          tenantId: "tenant_palace_1",
          name: "Starters",
          description: "Appetizers",
          sortOrder: 1,
          isActive: true,
          menuItems: [
            {
              id: "item_1",
              tenantId: "tenant_palace_1",
              categoryId: "cat_1",
              name: "Paneer Tikka",
              description: "Grilled cottage cheese",
              imageUrl: null,
              price: { toString: () => "250.00" },
              taxRate: { toString: () => "5.00" },
              isAvailable: true,
              displayOrder: 1,
              variants: null,
              addOns: null,
            },
          ],
        },
      ],
    };

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenantData as unknown as never);

    const publicData = await getPublicRestaurantBySlug("palace-dining");

    expect(publicData.tenantName).toBe("Palace Dining");
    expect(publicData.restaurant.name).toBe("Palace Dining Restaurant");
    expect(publicData.categories[0].items[0].name).toBe("Paneer Tikka");
    expect(publicData.categories[0].items[0].price).toBe("250.00");

    // Security Verification: Ensure no staff records, transaction histories, or audit logs exist in public output
    expect(publicData).not.toHaveProperty("userTenants");
    expect(publicData).not.toHaveProperty("auditLogs");
    expect(publicData).not.toHaveProperty("transactions");
  });

  it("should throw NotFoundError if restaurant slug does not exist or is suspended", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null as never);

    await expect(getPublicRestaurantBySlug("non-existent-slug")).rejects.toThrow(NotFoundError);
  });
});
