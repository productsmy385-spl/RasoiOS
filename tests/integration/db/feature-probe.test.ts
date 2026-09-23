import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// TC-DB-008 — the database provides every feature the schema relies on (S1-P02-T001).
// Runs against DATABASE_URL (CI: postgres:16 service; local: `npm run db:local`).
const db = new PrismaClient();

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

/** Prisma raw-query errors carry the PostgreSQL SQLSTATE in `meta.code`; fall back to the message. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return `${error.message} ${JSON.stringify({ ...error })}`;
}

describe("TC-DB-008 PostgreSQL feature probe", () => {
  it("is PostgreSQL 16", async () => {
    const [row] = await db.$queryRaw<{ n: string }[]>`SELECT current_setting('server_version_num') AS n`;
    expect(Number(row.n)).toBeGreaterThanOrEqual(160000);
    expect(Number(row.n)).toBeLessThan(170000);
  });

  it("enforces UNIQUE NULLS NOT DISTINCT", async () => {
    // One transaction pins a single connection so the TEMP table is visible to every statement.
    const outcome = await db
      .$transaction(async (tx) => {
        await tx.$executeRaw`CREATE TEMP TABLE probe_nnd (a int, b int, UNIQUE NULLS NOT DISTINCT (a, b)) ON COMMIT DROP`;
        await tx.$executeRaw`INSERT INTO probe_nnd VALUES (1, NULL)`;
        await tx.$executeRaw`INSERT INTO probe_nnd VALUES (1, NULL)`;
        return "second NULL row accepted";
      })
      .catch((error: unknown) => error);
    expect(outcome).not.toBe("second NULL row accepted");
    expect(describeError(outcome)).toMatch(/23505|duplicate key|unique/i);
  });

  it("provides gen_random_uuid()", async () => {
    const [row] = await db.$queryRaw<{ u: string }[]>`SELECT gen_random_uuid()::text AS u`;
    expect(row.u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("uses UTF8 server encoding", async () => {
    const [row] = await db.$queryRaw<{ enc: string }[]>`SELECT current_setting('server_encoding') AS enc`;
    expect(row.enc).toBe("UTF8");
  });
});
