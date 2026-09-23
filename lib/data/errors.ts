import { Prisma } from "@prisma/client";
import { AppError, ConflictError, NotFoundError, ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const PG_QUERY_CANCELED = "57014"; // statement_timeout

function postgresCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta as { code?: unknown } | undefined;
    if (typeof meta?.code === "string") return meta.code;
  }
  const message = error instanceof Error ? error.message : "";
  return /\b57014\b/.test(message) || /statement timeout/i.test(message) ? PG_QUERY_CANCELED : undefined;
}

/**
 * Converts database errors into application errors whose messages are safe to show (no SQL, no constraint names).
 * Unknown errors are re-thrown unchanged so they surface as 500 INTERNAL with a generic message upstream.
 */
export function mapDatabaseError(error: unknown, resource = "Resource"): unknown {
  if (error instanceof AppError) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025": // record required by the operation was not found
        return new NotFoundError(`${resource} not found`);
      case "P2002": // unique constraint
        return new ConflictError(`${resource} already exists`);
      case "P2034": // serialization failure / deadlock — the caller may retry
        return new ConflictError("The request conflicted with another change, please retry");
      case "P2028": // could not start/finish a transaction in time — the database is saturated, not the caller's fault
        logger.error("db.transaction_unavailable", { resource });
        return new ServiceUnavailableError("The restaurant is busy right now, please retry");
    }
  }

  // Database unreachable or connection lost: an outage, not "not found" or "signed out" (SC-AUTH-09).
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError && ["P1001", "P1002", "P1008", "P1017"].includes(error.code))
  ) {
    logger.error("db.unavailable", { resource });
    return new ServiceUnavailableError();
  }

  if (postgresCode(error) === PG_QUERY_CANCELED) {
    logger.warn("db.statement_timeout", { resource });
    return new ServiceUnavailableError();
  }

  return error;
}

/** Runs a data-access operation and maps database errors (see mapDatabaseError). */
export async function mapErrors<T>(resource: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapDatabaseError(error, resource);
  }
}
