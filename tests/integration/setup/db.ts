/**
 * Test-side database helpers (S1-P02-T008).
 *
 * Isolation strategies — pick per test file:
 * - `resetDatabase(db)` in `beforeEach`: empties every application table (TRUNCATE … RESTART IDENTITY CASCADE).
 *   The audit_logs TRUNCATE guard is disabled only inside that one transaction, on a disposable test database.
 * - `withRollback(db, fn)`: runs `fn` in a transaction that is always rolled back (fast; not for code that opens its
 *   own transactions or expects a constraint error mid-way, because a failed statement aborts the transaction).
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { vi } from "vitest";

let client: PrismaClient | undefined;

/** One client per worker database; created lazily after the worker setup has set DATABASE_URL. */
export function testDb(): PrismaClient {
  client ??= new PrismaClient();
  return client;
}

export async function disconnectTestDb(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}

export async function resetDatabase(db: PrismaClient = testDb()): Promise<void> {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename.replace(/"/g, '""')}"`).join(", ");
  await db.$transaction([
    db.$executeRaw`ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_no_truncate`,
    // eslint-disable-next-line no-restricted-syntax -- table names come from pg_tables and are quoted.
    db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`),
    db.$executeRaw`ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_no_truncate`,
  ]);
}

class RollbackSignal extends Error {}

export async function withRollback<T>(
  db: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  try {
    await db.$transaction(
      async (tx) => {
        result = await fn(tx);
        throw new RollbackSignal();
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    if (!(error instanceof RollbackSignal)) throw error;
  }
  return result as T;
}

/** PostgreSQL SQLSTATE of a Prisma error (raw or client query), e.g. 23505 unique, 23503 FK, 23514 check. */
export function sqlState(error: unknown): string | undefined {
  const text = error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : String(error);
  const known: Record<string, string> = {
    P2002: "23505",
    P2003: "23503",
    P2004: "23514",
  };
  const code = (error as { code?: string } | null)?.code;
  if (code && known[code]) return known[code];
  const match = text.match(/\b(23\d{3}|42501|57014|P0001)\b/);
  if (match) return match[1];
  if (/violates check constraint/i.test(text)) return "23514";
  if (/violates foreign key constraint/i.test(text)) return "23503";
  if (/duplicate key value|unique constraint/i.test(text)) return "23505";
  return undefined;
}

/** Freezes `Date` (only) at an instant, for business-date tests; timers keep working so Prisma is unaffected. */
export function freezeTime(iso: string): () => void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
  return () => vi.useRealTimers();
}
