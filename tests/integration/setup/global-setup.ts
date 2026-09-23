/**
 * Vitest global setup for the `integration` project (S1-P02-T008).
 * Creates a run-scoped template database, applies migrations with the real `prisma migrate deploy`,
 * shares its name with workers, and drops every database of the run afterwards.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import type { TestProject } from "vitest/node";
import {
  ROOT,
  adminClient,
  assertDisposableServer,
  createDatabase,
  dropDatabase,
  listRunDatabases,
  loadLocalEnv,
  urlForDatabase,
} from "./database";

declare module "vitest" {
  export interface ProvidedContext {
    integrationBaseUrl: string;
    integrationTemplateDatabase: string;
  }
}

export default async function setup(project: TestProject) {
  loadLocalEnv();
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("Integration tests need DATABASE_URL (local: `npm run db:local` and a .env file; CI: service container).");
  }
  assertDisposableServer(baseUrl);

  const runId = `${process.pid}_${Date.now().toString(36)}`;
  const template = `rasoios_it_${runId}`;
  const admin = adminClient(baseUrl);

  try {
    await createDatabase(admin, template);
    execFileSync(process.execPath, [path.join(ROOT, "node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: urlForDatabase(baseUrl, template) },
      stdio: "pipe",
    });
  } catch (error) {
    await dropDatabase(admin, template).catch(() => undefined);
    await admin.$disconnect();
    const output = error instanceof Error && "stderr" in error ? String((error as { stderr: unknown }).stderr) : "";
    throw new Error(`Integration setup failed while migrating the template database.\n${output || String(error)}`);
  }

  project.provide("integrationBaseUrl", baseUrl);
  project.provide("integrationTemplateDatabase", template);

  return async () => {
    for (const name of await listRunDatabases(admin, template)) {
      await dropDatabase(admin, name);
    }
    await admin.$disconnect();
  };
}
