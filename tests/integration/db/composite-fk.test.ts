import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFullTenant } from "../../factories";
import { disconnectTestDb, resetDatabase, sqlState, testDb } from "../setup/db";

// TC-DB-004 — the database itself rejects cross-tenant references (ADR-008, INV-01, S1-P02-T004).
// Foreign keys are read from the PostgreSQL catalogue, so a new composite FK is covered without editing this file.
const db = testDb();

type ForeignKey = {
  name: string;
  child_table: string;
  child_columns: string[];
  parent_table: string;
  parent_columns: string[];
  on_delete: string;
};

let foreignKeys: ForeignKey[] = [];
let tenantOwnedTables = new Set<string>();
let tenantA: Awaited<ReturnType<typeof createFullTenant>>;
let tenantB: Awaited<ReturnType<typeof createFullTenant>>;

beforeAll(async () => {
  await resetDatabase(db);
  tenantA = await createFullTenant(db, "A");
  tenantB = await createFullTenant(db, "B");
  // Move Tenant B's rows off the slots Tenant A's rows would collide with, so each attempted cross-tenant
  // reference is judged by its foreign key rather than first tripping a unique index (checked earlier).
  await db.restaurantHours.update({ where: { id: tenantB.hours.id }, data: { dayOfWeek: 7 } });
  await db.menuItemVariant.update({ where: { id: tenantB.variant.id }, data: { isDefault: false } });

  foreignKeys = await db.$queryRaw<ForeignKey[]>`
    SELECT c.conname AS name,
           child.relname AS child_table,
           ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
                 JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum ORDER BY k.ord) AS child_columns,
           parent.relname AS parent_table,
           ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(attnum, ord)
                 JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum ORDER BY k.ord) AS parent_columns,
           CASE c.confdeltype WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION' ELSE 'SET DEFAULT' END AS on_delete
    FROM pg_constraint c
    JOIN pg_class child ON child.oid = c.conrelid
    JOIN pg_class parent ON parent.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'
    ORDER BY c.conname`;

  const owned = await db.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'tenant_id' AND table_name <> 'audit_logs'`;
  tenantOwnedTables = new Set(owned.map((r) => r.table_name));
});
afterAll(disconnectTestDb);

const composite = () => foreignKeys.filter((fk) => fk.child_columns.length === 2 && fk.child_columns[0] === "tenant_id");

describe("TC-DB-004 composite foreign keys", () => {
  it("finds the composite foreign keys in the catalogue", () => {
    // 29 at migration 0001_init (data-model E03–E25); new composite FKs only raise this.
    expect(composite().length).toBeGreaterThanOrEqual(29);
  });

  it("every reference from a tenant-owned table to another tenant-owned table is composite (tenant_id, parent_id)", () => {
    const singleColumn = foreignKeys.filter(
      (fk) => tenantOwnedTables.has(fk.child_table) && tenantOwnedTables.has(fk.parent_table) && fk.child_columns[0] !== "tenant_id",
    );
    expect(singleColumn.map((fk) => `${fk.name}: ${fk.child_table}(${fk.child_columns}) -> ${fk.parent_table}`)).toEqual([]);
    for (const fk of composite()) {
      expect(fk.parent_columns, fk.name).toEqual(["tenant_id", "id"]);
    }
  });

  it("uses ON DELETE RESTRICT except the documented cascades", () => {
    const cascades = foreignKeys.filter((fk) => fk.on_delete !== "RESTRICT").map((fk) => `${fk.child_table}->${fk.parent_table}:${fk.on_delete}`);
    // restaurant_hours are replaced as a set with their restaurant; DRAFT daily menus are hard-deletable with their
    // items; website sections are the restaurant's own page content and go with it (ADR-013 §6).
    expect(cascades.sort()).toEqual([
      "daily_menu_items->daily_menus:CASCADE",
      "restaurant_hours->restaurants:CASCADE",
      "website_sections->restaurants:CASCADE",
    ]);
  });

  it("rejects a Tenant A row pointing at a Tenant B parent, for every composite foreign key", async () => {
    const results: string[] = [];
    for (const fk of composite()) {
      const parentColumn = fk.child_columns[1];
      const child = Prisma.raw(`"${fk.child_table}"`);
      const column = Prisma.raw(`"${parentColumn}"`);
      const parent = Prisma.raw(`"${fk.parent_table}"`);

      const [childRow] = await db.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM ${child} WHERE tenant_id = ${tenantA.tenant.id}::uuid AND ${column} IS NOT NULL LIMIT 1`;
      const [foreignParent] = await db.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM ${parent} WHERE tenant_id = ${tenantB.tenant.id}::uuid LIMIT 1`;
      if (!childRow || !foreignParent) {
        results.push(`${fk.name}: fixture has no ${!childRow ? `Tenant A ${fk.child_table} row with ${parentColumn} set` : `Tenant B ${fk.parent_table} row`}`);
        continue;
      }

      let error: unknown;
      try {
        await db.$executeRaw`UPDATE ${child} SET ${column} = ${foreignParent.id}::uuid WHERE id = ${childRow.id}::uuid`;
      } catch (e) {
        error = e;
      }
      if (!error) results.push(`${fk.name}: cross-tenant reference was ACCEPTED`);
      else if (sqlState(error) !== "23503") results.push(`${fk.name}: failed with ${sqlState(error)} instead of a foreign-key violation`);
      else if (!String((error as Error).message).includes(fk.name)) results.push(`${fk.name}: violation named another constraint`);
    }
    expect(results).toEqual([]);
  });

  it("rejects inserting a child whose tenant differs from its parent's tenant", async () => {
    await expect(
      db.menuItem.create({
        data: { tenantId: tenantA.tenant.id, categoryId: tenantB.category.id, name: "Leak", basePrice: new Prisma.Decimal("1.00") },
      }),
    ).rejects.toThrow();
    await expect(
      db.orderItem.create({
        data: {
          tenantId: tenantA.tenant.id,
          orderId: tenantA.order.id,
          menuItemId: tenantB.menuItem.id,
          itemNameSnapshot: "Leak",
          unitPriceSnapshot: new Prisma.Decimal("1.00"),
          taxRateSnapshot: new Prisma.Decimal("0.00"),
          quantity: 1,
          lineSubtotal: new Prisma.Decimal("1.00"),
          lineTax: new Prisma.Decimal("0.00"),
          lineTotal: new Prisma.Decimal("1.00"),
        },
      }),
    ).rejects.toThrow();
  });
});
