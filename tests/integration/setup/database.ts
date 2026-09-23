/**
 * Integration database plumbing (S1-P02-T008). Shared by the global setup and the per-worker setup file.
 *
 * Model: one migrated TEMPLATE database per test run, and one database per Vitest worker copied from it.
 * Every name carries a run id, so concurrent test runs on one PostgreSQL server never collide.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

export const ROOT = path.resolve(__dirname, "../../..");

const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

/** Only generated, validated names ever reach DDL (database names cannot be bound as parameters). */
export function assertIdentifier(name: string): string {
  if (!IDENTIFIER.test(name)) throw new Error(`Refusing unsafe database identifier: ${name}`);
  return name;
}

/** Loads `.env` for local runs; CI provides DATABASE_URL directly. */
export function loadLocalEnv(): void {
  const envFile = path.join(ROOT, ".env");
  if (!process.env.DATABASE_URL && existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

/** The configured server, pointed at another database name (search params such as sslmode are kept). */
export function urlForDatabase(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${assertIdentifier(database)}`;
  url.searchParams.delete("schema");
  url.searchParams.set("schema", "public");
  return url.toString();
}

/**
 * Test databases are created only on a server whose URL is explicitly local or a CI service container.
 * This prevents an accidental DATABASE_URL pointing at staging or production from being used.
 */
export function assertDisposableServer(baseUrl: string): void {
  const { hostname } = new URL(baseUrl);
  const allowed = ["localhost", "127.0.0.1", "::1", "[::1]", "postgres"];
  if (!allowed.includes(hostname) && process.env.ALLOW_REMOTE_TEST_DATABASE !== "1") {
    throw new Error(
      `Integration tests refuse to create databases on "${hostname}". Point DATABASE_URL at a local or CI PostgreSQL ` +
        "(or set ALLOW_REMOTE_TEST_DATABASE=1 for a disposable remote server).",
    );
  }
}

export function adminClient(baseUrl: string): PrismaClient {
  return new PrismaClient({ datasourceUrl: urlForDatabase(baseUrl, "postgres") });
}

export async function createDatabase(admin: PrismaClient, name: string, template?: string): Promise<void> {
  const sql = template
    ? `CREATE DATABASE "${assertIdentifier(name)}" TEMPLATE "${assertIdentifier(template)}"`
    : `CREATE DATABASE "${assertIdentifier(name)}"`;
  // eslint-disable-next-line no-restricted-syntax -- DDL identifiers cannot be parameterised; names are validated above.
  await admin.$executeRawUnsafe(sql);
}

export async function databaseExists(admin: PrismaClient, name: string): Promise<boolean> {
  const rows = await admin.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${name}) AS "exists"`;
  return rows[0]?.exists === true;
}

export async function dropDatabase(admin: PrismaClient, name: string): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax -- DDL identifiers cannot be parameterised; names are validated above.
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${assertIdentifier(name)}" WITH (FORCE)`);
}

export async function listRunDatabases(admin: PrismaClient, prefix: string): Promise<string[]> {
  const rows = await admin.$queryRaw<{ datname: string }[]>`
    SELECT datname FROM pg_database WHERE datname LIKE ${`${prefix}%`} ORDER BY datname`;
  return rows.map((r) => r.datname);
}

/**
 * Runs the Prisma CLI of this repository against one database and returns its exit code and output
 * (e.g. `migrate diff --exit-code`: 0 = no difference, 2 = difference).
 */
export function runPrismaCli(args: string[], databaseUrl: string): { status: number; output: string } {
  const result = spawnSync(process.execPath, [path.join(ROOT, "node_modules/prisma/build/index.js"), ...args], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
  return { status: result.status ?? -1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

export function workerDatabaseName(template: string, poolId: string | undefined): string {
  return assertIdentifier(`${template}_w${(poolId ?? "1").replace(/\D/g, "") || "1"}`);
}
