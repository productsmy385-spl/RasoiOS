import "server-only";
import { getPublicRestaurant, type PublicRestaurantData } from "@/lib/data/public-restaurant";

export type { PublicRestaurantData };

/**
 * Public restaurant website data by slug (LD-PUB-01). Thin wrapper over `lib/data/public-restaurant.ts`, which owns the
 * query and the public projection: ACTIVE tenant + published website only, published non-archived menu only, contact
 * fields only when shown, no tenant identifiers or private settings. Throws NotFoundError otherwise.
 */
export async function getPublicRestaurantBySlug(slug: string): Promise<PublicRestaurantData> {
  return getPublicRestaurant(slug);
}
