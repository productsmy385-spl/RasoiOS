/**
 * Local PostgreSQL 16 for development without Docker or a system install (S1-P01-T009, owner decision 2026-09-15).
 *
 *   npm run db:local            # start (creates the cluster on first run), Ctrl+C to stop
 *
 * Data lives in `.local/postgres` (gitignored). Listens on localhost only. Credentials match `.env.example`.
 * CI does not use this; it runs a postgres:16 service container.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.LOCAL_PG_PORT ?? 5432);
const DATABASES = ["rasoios_db"];
const dataDir = path.resolve(__dirname, "..", ".local", "postgres");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: PORT,
    user: "postgres",
    password: "postgres",
    authMethod: "scram-sha-256",
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: (error) => console.error("[postgres]", error),
  });

  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log(`Creating a new PostgreSQL cluster in ${path.relative(process.cwd(), dataDir)} …`);
    await pg.initialise();
  }

  await pg.start();

  for (const name of DATABASES) {
    try {
      await pg.createDatabase(name);
      console.log(`Created database ${name}`);
    } catch (error) {
      if (!String(error).includes("already exists")) throw error;
    }
  }

  console.log(`PostgreSQL ready on localhost:${PORT} (databases: ${DATABASES.join(", ")}). Press Ctrl+C to stop.`);

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
