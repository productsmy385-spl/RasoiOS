import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient, prisma, RUNTIME_STATEMENT_TIMEOUT_MS, withStatementTimeout } from "@/lib/db/prisma";
import { mapErrors } from "@/lib/data";
import { ServiceUnavailableError } from "@/lib/errors";

// TC-DB-006 — runtime connections carry a statement timeout; a query exceeding it is cancelled and mapped to a
// safe 503 error (S1-P02-T005, SC-DB-04).
const shortTimeout = createPrismaClient({ statementTimeoutMs: 300 });

afterAll(async () => {
  await shortTimeout.$disconnect();
  await prisma.$disconnect();
});

describe("TC-DB-006 statement timeout", () => {
  it("applies the 10 s runtime statement timeout to the application client", async () => {
    const [row] = await prisma.$queryRaw<{ statement_timeout: string }[]>`SHOW statement_timeout`;
    expect(RUNTIME_STATEMENT_TIMEOUT_MS).toBe(10_000);
    expect(row.statement_timeout).toBe("10s");
  });

  it("cancels a query that runs past the timeout and maps it to SERVICE_UNAVAILABLE without SQL details", async () => {
    await shortTimeout.$queryRaw`SELECT 1`; // connect first so only the statement is timed
    const started = Date.now();
    const error = await mapErrors("Report", () => shortTimeout.$queryRaw`SELECT pg_sleep(5)`).catch((e: unknown) => e);
    expect(Date.now() - started).toBeLessThan(4000); // cancelled well before the 5 s sleep would finish
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as ServiceUnavailableError).statusCode).toBe(503);
    expect((error as ServiceUnavailableError).code).toBe("SERVICE_UNAVAILABLE");
    expect((error as Error).message).not.toMatch(/pg_sleep|statement|SQL/i);
  });

  it("keeps existing connection options when adding the timeout", () => {
    const url = withStatementTimeout("postgresql://u:p@db.railway.internal:5432/app?sslmode=require&options=-c%20search_path%3Dpublic", 5000);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("options")).toBe("-c search_path=public -c statement_timeout=5000");
    expect(parsed.searchParams.get("sslmode")).toBe("require");
  });
});
