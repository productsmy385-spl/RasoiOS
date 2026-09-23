import { readdirSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createTenant } from "../../factories";
import { disconnectTestDb, resetDatabase, testDb } from "../setup/db";
import { ROOT, adminClient, createDatabase, dropDatabase, runPrismaCli, urlForDatabase } from "../setup/database";

// S1-P02-T003 — migration 0001_init: reproducible, drift-free, UTC timestamps, append-only audit log.
const db = testDb();

beforeAll(() => resetDatabase(db));
afterAll(disconnectTestDb);

describe("TC-DB-001 migrations apply to an empty database without drift", () => {
  it("records every migration folder as fully applied", async () => {
    const folders = readdirSync(path.join(ROOT, "prisma/migrations"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const applied = await db.$queryRaw<{ migration_name: string; finished: boolean; rolled_back: boolean }[]>`
      SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
      FROM _prisma_migrations ORDER BY migration_name`;
    expect(folders).toContain("0001_init");
    expect(applied.map((m) => m.migration_name)).toEqual(folders);
    expect(applied.every((m) => m.finished && !m.rolled_back)).toBe(true);
  });

  it("the migrated database matches prisma/schema.prisma exactly (prisma migrate diff is empty)", () => {
    const { status, output } = runPrismaCli(
      ["migrate", "diff", "--from-url", process.env.DATABASE_URL!, "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"],
      process.env.DATABASE_URL!,
    );
    expect(output).toContain("No difference detected");
    expect(status).toBe(0);
  }, 60_000);
});

describe("TC-DB-010 migration round trip into an empty shadow database", () => {
  it("replaying prisma/migrations produces exactly prisma/schema.prisma", async () => {
    const baseUrl = inject("integrationBaseUrl");
    const shadow = `${process.env.INTEGRATION_WORKER_DATABASE}_shadow`;
    const admin = adminClient(baseUrl);
    try {
      await dropDatabase(admin, shadow);
      await createDatabase(admin, shadow);
      const { status, output } = runPrismaCli(
        [
          "migrate",
          "diff",
          "--from-migrations",
          "prisma/migrations",
          "--to-schema-datamodel",
          "prisma/schema.prisma",
          "--shadow-database-url",
          urlForDatabase(baseUrl, shadow),
          "--exit-code",
        ],
        process.env.DATABASE_URL!,
      );
      expect(output).toContain("No difference detected");
      expect(status).toBe(0);
    } finally {
      await dropDatabase(admin, shadow);
      await admin.$disconnect();
    }
  }, 120_000);
});

describe("TC-DB-007 timestamps are timestamptz and round-trip in UTC", () => {
  it("declares every timestamp column as timestamp with time zone", async () => {
    const columns = await db.$queryRaw<{ table_name: string; column_name: string; data_type: string }[]>`
      SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type LIKE 'timestamp%' AND table_name <> '_prisma_migrations'`;
    expect(columns.length).toBeGreaterThan(50);
    expect(columns.filter((c) => c.data_type !== "timestamp with time zone")).toEqual([]);
  });

  it("stores the instant in UTC regardless of the session time zone", async () => {
    const instant = new Date("2026-09-15T18:30:00.000Z");
    const { tenant } = await createTenant(db);
    await db.tenant.update({ where: { id: tenant.id }, data: { status: "SUSPENDED", suspendedAt: instant, suspensionReason: "UTC round-trip test" } });

    const [asKolkata] = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'Asia/Kolkata'`;
      return tx.$queryRaw<{ suspended_at: Date; utc_text: string; local_text: string }[]>`
        SELECT suspended_at,
               to_char(suspended_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') AS utc_text,
               to_char(suspended_at, 'YYYY-MM-DD HH24:MI') AS local_text
        FROM tenants WHERE id = ${tenant.id}::uuid`;
    });
    expect(asKolkata.suspended_at.toISOString()).toBe(instant.toISOString());
    expect(asKolkata.utc_text).toBe("2026-09-15T18:30:00");
    expect(asKolkata.local_text).toBe("2026-09-16 00:00");

    const reread = await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
    expect(reread.suspendedAt?.toISOString()).toBe(instant.toISOString());
  });
});

describe("TC-AUDIT-003 audit_logs is append-only", () => {
  it("allows INSERT but raises on UPDATE and DELETE", async () => {
    const row = await db.auditLog.create({
      data: { actorType: "SYSTEM", action: "test.append_only", resourceType: "test" },
    });

    await expect(db.$executeRaw`UPDATE audit_logs SET action = 'tampered' WHERE id = ${row.id}::uuid`).rejects.toThrow(
      /append-only: UPDATE is not allowed/,
    );
    await expect(db.$executeRaw`DELETE FROM audit_logs WHERE id = ${row.id}::uuid`).rejects.toThrow(
      /append-only: DELETE is not allowed/,
    );
    await expect(db.auditLog.update({ where: { id: row.id }, data: { action: "tampered" } })).rejects.toThrow();
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow();

    const unchanged = await db.auditLog.findUniqueOrThrow({ where: { id: row.id } });
    expect(unchanged.action).toBe("test.append_only");
  });

  it("raises on TRUNCATE (statement-level guard)", async () => {
    await expect(db.$executeRaw`TRUNCATE TABLE audit_logs`).rejects.toThrow(/append-only: TRUNCATE is not allowed/);
    expect(await db.auditLog.count()).toBeGreaterThan(0);
  });
});
