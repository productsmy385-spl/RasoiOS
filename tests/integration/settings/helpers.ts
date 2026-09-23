import type { Prisma } from "@prisma/client";
import { testDb } from "../setup/db";

export { dataOf, errorOf, expectSameNotFound, RANDOM_UUID } from "../orders/helpers";

type XminTable = "restaurants" | "restaurant_hours" | "kitchen_sections" | "user_tenants" | "users" | "audit_logs";

/**
 * PostgreSQL transaction id that wrote the current version of a row. Equal xmin on a changed row and its audit row
 * proves both were written by one transaction (SC-AUD-02).
 */
export async function xminOf(table: XminTable, id: string): Promise<string> {
  const db = testDb();
  const rows = await (async () => {
    switch (table) {
      case "restaurants":
        return db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM restaurants WHERE id = ${id}::uuid`;
      case "restaurant_hours":
        return db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM restaurant_hours WHERE id = ${id}::uuid`;
      case "kitchen_sections":
        return db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM kitchen_sections WHERE id = ${id}::uuid`;
      case "user_tenants":
        return db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM user_tenants WHERE id = ${id}::uuid`;
      case "users":
        return db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM users WHERE id = ${id}::uuid`;
      case "audit_logs":
        return db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM audit_logs WHERE id = ${id}::uuid`;
    }
  })();
  if (rows.length !== 1) throw new Error(`${table} row ${id} not found`);
  return rows[0].xmin;
}

/** The complete restaurant row and its hours, to restore after a test changed them. */
export async function snapshotRestaurant(restaurantId: string) {
  const db = testDb();
  const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
  const hours = await db.restaurantHours.findMany({ where: { restaurantId } });
  return { restaurant, hours };
}

export async function restoreRestaurant(snapshot: Awaited<ReturnType<typeof snapshotRestaurant>>): Promise<void> {
  const db = testDb();
  const { id, tenantId, createdAt, updatedAt, ...columns } = snapshot.restaurant;
  void tenantId;
  void createdAt;
  void updatedAt;
  await db.$transaction([
    db.restaurant.update({ where: { id }, data: columns as Prisma.RestaurantUpdateInput }),
    db.restaurantHours.deleteMany({ where: { restaurantId: id } }),
    db.restaurantHours.createMany({ data: snapshot.hours }),
  ]);
}

/** Restaurant columns that tests compare to prove "nothing changed". */
export function restaurantState(r: { updatedAt: Date } & Record<string, unknown>) {
  const { updatedAt, ...rest } = r;
  return { ...rest, updatedAt: updatedAt.toISOString() };
}
