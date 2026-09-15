import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";

export interface PublicRestaurantData {
  tenantId: string;
  tenantName: string;
  slug: string;
  timezone: string;
  restaurant: {
    name: string;
    logo: string | null;
    description: string | null;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    openingHours: unknown;
  };
  categories: Array<{
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      price: string;
      taxRate: string;
      isAvailable: boolean;
      variants: unknown;
      addOns: unknown;
    }>;
  }>;
}

/**
 * Public service layer to fetch restaurant data by slug.
 * EXPLICITLY projects public fields ONLY. Prevents data leakage of staff, financial, or audit logs.
 */
export async function getPublicRestaurantBySlug(slug: string): Promise<PublicRestaurantData> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug, status: "ACTIVE" },
    include: {
      restaurants: true,
      menuCategories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          menuItems: {
            where: { isAvailable: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });

  if (!tenant || tenant.restaurants.length === 0) {
    throw new NotFoundError(`Restaurant with identifier "${slug}" not found`);
  }

  const restaurant = tenant.restaurants[0];

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    slug: tenant.slug,
    timezone: tenant.timezone,
    restaurant: {
      name: restaurant.name,
      logo: restaurant.logo,
      description: restaurant.description,
      address: restaurant.address,
      contactEmail: restaurant.contactEmail,
      contactPhone: restaurant.contactPhone,
      openingHours: restaurant.openingHours,
    },
    categories: tenant.menuCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      sortOrder: cat.sortOrder,
      items: cat.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        price: item.price.toString(),
        taxRate: item.taxRate.toString(),
        isAvailable: item.isAvailable,
        variants: item.variants,
        addOns: item.addOns,
      })),
    })),
  };
}
