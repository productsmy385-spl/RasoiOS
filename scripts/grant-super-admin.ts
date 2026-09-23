/**
 * Grant the platform SUPER_ADMIN role (S1-P06-T008). First run in any environment:
 *
 *   npm run platform:grant-super-admin -- --email owner@example.com --confirm
 *
 * Creates or updates the USER with platform_role = SUPER_ADMIN, audits it (actor SYSTEM), and — if that person has
 * never signed in — sends a Clerk invitation to `${NEXT_PUBLIC_APP_URL}/sign-up` (skip with --no-invite).
 * Refuses to do anything without --confirm. Prints no secrets.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

type Args = { email?: string; confirm: boolean; invite: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { confirm: false, invite: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirm") args.confirm = true;
    else if (a === "--no-invite") args.invite = false;
    else if (a === "--email") args.email = argv[++i];
    else if (a.startsWith("--email=")) args.email = a.slice("--email=".length);
  }
  return args;
}

const mask = (email: string) => `${email.slice(0, 1)}***@${email.split("@")[1] ?? ""}`;

async function main() {
  const envFile = path.resolve(__dirname, "..", ".env");
  if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.confirm) {
    console.error("Usage: npm run platform:grant-super-admin -- --email <address> --confirm [--no-invite]");
    console.error(args.email ? "Refusing: add --confirm to grant platform administration." : "Refusing: --email is required.");
    process.exit(1);
  }

  const { normaliseEmail, grantSuperAdmin } = await import("../lib/platform/grant-super-admin");
  let email: string;
  try {
    email = normaliseEmail(args.email);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const result = await grantSuperAdmin(db, email, `cli-${randomUUID()}`);
    console.log(result.outcome === "GRANTED" ? `Granted SUPER_ADMIN to ${mask(email)}.` : `${mask(email)} is already SUPER_ADMIN; nothing changed.`);

    if (result.needsInvitation && args.invite) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!appUrl || !secretKey) {
        console.log("Not sending an invitation: NEXT_PUBLIC_APP_URL or CLERK_SECRET_KEY is not set. The user can be invited from Clerk later.");
      } else {
        const { createClerkClient } = await import("@clerk/backend");
        const clerk = createClerkClient({ secretKey });
        await clerk.invitations.createInvitation({ emailAddress: email, redirectUrl: new URL("/sign-up", appUrl).toString(), notify: true, ignoreExisting: true });
        console.log(`Clerk invitation sent to ${mask(email)}.`);
      }
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
