import "server-only";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

/**
 * The single PrismaClient for the running application (S1-P02-T005, ADR-008).
 * Application code reaches tenant data only through `lib/data`, which imports this module (lint rule SC-TEN-03).
 *
 * - Every runtime session gets `statement_timeout` so a runaway query cannot hold a connection (SC-DB-04).
 *   Migrations (`prisma migrate deploy`) run through the CLI and are not affected.
 * - Queries slower than SLOW_QUERY_MS are logged with duration and statement text; parameter values are never logged.
 */
export const RUNTIME_STATEMENT_TIMEOUT_MS = 10_000;
export const SLOW_QUERY_MS = 500;

/** Adds `-c statement_timeout=<ms>` to the connection's startup `options`, keeping any options already present. */
export function withStatementTimeout(url: string, timeoutMs: number): string {
  const parsed = new URL(url);
  const option = `-c statement_timeout=${Math.trunc(timeoutMs)}`;
  const existing = parsed.searchParams.get("options");
  parsed.searchParams.set("options", existing ? `${existing} ${option}` : option);
  return parsed.toString();
}

export function createPrismaClient(options: { statementTimeoutMs?: number; databaseUrl?: string } = {}) {
  const url = options.databaseUrl ?? process.env.DATABASE_URL;
  const client = new PrismaClient({
    ...(url ? { datasourceUrl: withStatementTimeout(url, options.statementTimeoutMs ?? RUNTIME_STATEMENT_TIMEOUT_MS) } : {}),
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "warn" },
      { emit: "stdout", level: "error" },
    ],
  });
  client.$on("query", (event) => {
    if (event.duration >= SLOW_QUERY_MS) {
      logger.warn("db.slow_query", { durationMs: event.duration, statement: event.query.slice(0, 300) });
    }
  });
  return client;
}

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma: AppPrismaClient | undefined };

export const prisma: AppPrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Preferred name inside lib/data. */
export const db = prisma;
