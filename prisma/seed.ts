/**
 * Development seed (S1-P02-T007): `npm run db:seed` (or `npx prisma db seed`).
 * Two isolated tenants — Spice Route (Asia/Kolkata, INR) and Harbour Grill (America/New_York, USD) — with every
 * role, order status, payment state, KOT state, print-job state and agent state. See prisma/seed-data/.
 *
 * Refuses to run for NODE_ENV=production or a non-local database unless SEED_ALLOW_REMOTE=1 (guard.ts).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { assertSeedAllowed, SeedRefusedError } from "./seed-data/guard";

async function main() {
  const envFile = path.resolve(__dirname, "..", ".env");
  if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

  try {
    assertSeedAllowed(process.env);
  } catch (error) {
    if (error instanceof SeedRefusedError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  // Imported only after the guard passes, so a refused run never opens a database connection.
  const { PrismaClient } = await import("@prisma/client");
  const { seedDatabase } = await import("./seed-data/build");
  const db = new PrismaClient();
  try {
    const summary = await seedDatabase(db, {
      now: new Date(),
      superAdminEmail: process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    });
    const inserted = Object.values(summary).reduce((a, b) => a + b, 0);
    console.log(`Seed complete: ${inserted} new rows (0 means the dataset was already present).`);
    console.log(Object.entries(summary).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
    if (!process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL) {
      console.log("SUPER_ADMIN_BOOTSTRAP_EMAIL is not set, so no platform administrator was created.");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
