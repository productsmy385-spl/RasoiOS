/**
 * The seed writes fixed test users and tenants. It must never touch production data (S1-P02-T007, SC-TEN-10).
 * This module has no imports so the guard runs before any database client is created.
 */
export class SeedRefusedError extends Error {}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres"]);

export function assertSeedAllowed(env: Record<string, string | undefined>): { host: string } {
  if (env.NODE_ENV === "production") {
    throw new SeedRefusedError("Refusing to seed: NODE_ENV=production. The seed is for development and test databases only.");
  }
  const url = env.DATABASE_URL;
  if (!url) throw new SeedRefusedError("Refusing to seed: DATABASE_URL is not set.");

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new SeedRefusedError("Refusing to seed: DATABASE_URL is not a valid URL.");
  }
  // A non-local server (e.g. Railway staging) must be opted in explicitly; production is never seeded.
  if (!LOCAL_HOSTS.has(host) && env.SEED_ALLOW_REMOTE !== "1") {
    throw new SeedRefusedError(
      `Refusing to seed database host "${host}". Set SEED_ALLOW_REMOTE=1 only for a disposable or staging database.`,
    );
  }
  return { host };
}
