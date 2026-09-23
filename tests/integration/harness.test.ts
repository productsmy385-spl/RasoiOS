import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTenantPair } from "../factories";
import { disconnectTestDb, resetDatabase, testDb, withRollback } from "./setup/db";

// S1-P02-T008 — the harness gives each worker a run-scoped, migrated database and working isolation helpers.
const db = testDb();

afterAll(disconnectTestDb);

describe("integration harness", () => {
  beforeEach(() => resetDatabase(db));

  it("connects to this worker's run-scoped copy of the migrated template", async () => {
    const [row] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    expect(row.name).toBe(process.env.INTEGRATION_WORKER_DATABASE);
    expect(row.name).toMatch(/^rasoios_it_\d+_[a-z0-9]+_w\d+$/);

    const migrations = await db.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`;
    expect(migrations.map((m) => m.migration_name)).toContain("0001_init");
  });

  it("builds Tenant A and Tenant B with identical content names", async () => {
    const { tenantA, tenantB } = await createTenantPair(db);
    expect(tenantA.tenant.id).not.toBe(tenantB.tenant.id);
    expect(tenantA.category.name).toBe(tenantB.category.name);
    expect(await db.menuCategory.count({ where: { name: "Starters" } })).toBe(2);
    expect(tenantA.order.totalAmount.toFixed(2)).toBe("210.00");
  });

  it("resetDatabase empties application tables but keeps migration history", async () => {
    await createTenantPair(db);
    await resetDatabase(db);
    expect(await db.tenant.count()).toBe(0);
    expect(await db.order.count()).toBe(0);
    const [row] = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM _prisma_migrations`;
    expect(Number(row.n)).toBeGreaterThan(0);
  });

  it("withRollback discards everything written inside it", async () => {
    const created = await withRollback(db, async (tx) => {
      const pair = await createTenantPair(tx);
      expect(await tx.tenant.count()).toBe(2);
      return pair.tenantA.tenant.id;
    });
    expect(created).toBeTruthy();
    expect(await db.tenant.count()).toBe(0);
  });
});
