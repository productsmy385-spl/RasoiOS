/**
 * Per-worker setup file (S1-P02-T008). Runs before each integration test file, before the file's imports,
 * so `lib/db/prisma` and every `new PrismaClient()` connect to this worker's own copy of the migrated template.
 */
import { beforeAll, inject } from "vitest";
import { adminClient, createDatabase, databaseExists, urlForDatabase, workerDatabaseName } from "./database";

const baseUrl = inject("integrationBaseUrl");
const template = inject("integrationTemplateDatabase");
const workerDatabase = workerDatabaseName(template, process.env.VITEST_POOL_ID);

process.env.DATABASE_URL = urlForDatabase(baseUrl, workerDatabase);
process.env.INTEGRATION_WORKER_DATABASE = workerDatabase;

beforeAll(async () => {
  const admin = adminClient(baseUrl);
  try {
    // Workers may start together; copying one template concurrently can briefly fail, so retry.
    for (let attempt = 1; !(await databaseExists(admin, workerDatabase)); attempt++) {
      try {
        await createDatabase(admin, workerDatabase, template);
      } catch (error) {
        if (attempt >= 20) throw error;
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
      }
    }
  } finally {
    await admin.$disconnect();
  }
});
