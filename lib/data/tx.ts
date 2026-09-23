import "server-only";
import type { Prisma } from "@prisma/client";
import type { RequestContext } from "@/lib/auth/context-types";
import { db } from "@/lib/db/prisma";
import { mapDatabaseError } from "./errors";

export type Tx = Prisma.TransactionClient;

/**
 * Runs `fn` in one database transaction (S1-P02-T005). Services use it so a business write and its audit row
 * commit or roll back together (SC-AUD-01). The context is carried so audit writers and logs can use its request id.
 */
export async function withTx<T>(
  ctx: RequestContext,
  fn: (tx: Tx, ctx: RequestContext) => Promise<T>,
  options: { isolationLevel?: Prisma.TransactionIsolationLevel; timeoutMs?: number } = {},
): Promise<T> {
  try {
    return await db.$transaction((tx) => fn(tx, ctx), {
      isolationLevel: options.isolationLevel,
      timeout: options.timeoutMs ?? 15_000,
      // Busy service: many tills and kitchen screens can ask for a connection at once, so wait rather than fail fast.
      maxWait: 15_000,
    });
  } catch (error) {
    throw mapDatabaseError(error);
  }
}
