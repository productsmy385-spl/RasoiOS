import "server-only";
import { db } from "@/lib/db/prisma";

/**
 * Readiness probe (RH-OPS-02, S1-P26-T003): `SELECT 1` must answer within `timeoutMs`. Returns a boolean only —
 * no error text, host or version ever leaves this function.
 */
export async function databaseReady(timeoutMs = 2000, client: { $queryRaw: typeof db.$queryRaw } = db): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const probe = client.$queryRaw`SELECT 1`.then(() => true);
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    return await Promise.race([probe, timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
