import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTenant, createUser } from "../../factories";
import { disconnectTestDb, resetDatabase, testDb } from "../setup/db";
import { resolveSession } from "@/lib/auth/session";
import { createClerkAdmin } from "@/lib/auth/clerk-admin";

// TC-AUTH-011 — logs from sign-in resolution, webhook and invitation flows contain no OTP, bearer token, cookie,
// signature, secret or full email address (S1-P03-T009, SC-AUTH-10, SC-LOG-02).
const db = testDb();
const secretBytes = randomBytes(24);
const WEBHOOK_SECRET = `whsec_${secretBytes.toString("base64")}`;
const CLERK_SECRET = "sk_test_logredactionsecret0000000000";
const EMAIL = "priya.sharma@example.test";

const lines: string[] = [];
let server: Server;
let stubUrl: string;
let handler: (request: never) => Promise<Response>;

beforeAll(async () => {
  await resetDatabase(db);
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = WEBHOOK_SECRET;
  ({ POST: handler } = await import("@/app/api/webhooks/clerk/route"));
  for (const method of ["log", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => void lines.push(args.map(String).join(" ")));
  }
  server = createServer((_req, res) => {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ errors: [{ code: "internal", message: `failed for ${EMAIL} with ${CLERK_SECRET}` }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  stubUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  vi.restoreAllMocks();
  delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectTestDb();
});

function signed(body: string, secret = secretBytes) {
  const id = `msg_${randomUUID()}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `v1,${createHmac("sha256", secret).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
  return {
    signature,
    request: new Request("http://localhost/api/webhooks/clerk", {
      method: "POST",
      headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": signature, cookie: "__session=eyJhbGciOiJSUzI1NiJ9.secretpayload.sig", authorization: "Bearer should-never-appear" },
      body,
    }),
  };
}

describe("TC-AUTH-011 authentication logs are redacted", () => {
  it("never logs OTPs, tokens, cookies, signatures, secrets or full emails", async () => {
    // 1. Sign-in resolution with invited-user linking.
    const { tenant } = await createTenant(db);
    const user = await createUser(db, { email: EMAIL });
    await db.userTenant.create({ data: { tenantId: tenant.id, userId: user.id, role: "CASHIER", status: "INVITED" } });
    await resolveSession({ clerkUserId: "user_logtest", verifiedPrimaryEmail: async () => EMAIL }, "req-log-1");

    // 2. Webhooks: a valid event and a forged one.
    const valid = signed(JSON.stringify({ type: "user.updated", object: "event", data: { id: "user_logtest", first_name: "Priya", last_name: "S", primary_email_address_id: "e1", email_addresses: [{ id: "e1", email_address: EMAIL, verification: { status: "verified" } }] } }));
    expect((await handler(valid.request as never)).status).toBe(200);
    const forged = signed(JSON.stringify({ type: "user.deleted", data: { id: "user_logtest" } }), randomBytes(24));
    expect((await handler(forged.request as never)).status).toBe(400);

    // 3. Invitation failure from Clerk, whose error body echoes the email and a secret.
    const admin = createClerkAdmin({ apiUrl: stubUrl, secretKey: CLERK_SECRET, timeoutMs: 3000 });
    await expect(admin.createInvitation(EMAIL, "https://app.example.test/sign-up")).rejects.toMatchObject({ code: "INVITATION_FAILED" });

    // 4. Anything that reaches the logger directly with request headers.
    const { logger } = await import("@/lib/logger");
    logger.warn("security.auth_failed", { headers: forged.request.headers, otp: "424242", note: `code 424242 for ${EMAIL}` });

    const output = lines.join("\n");
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain("security.webhook_rejected");
    expect(output).toContain("p***@example.test");
    for (const forbidden of [
      EMAIL,
      WEBHOOK_SECRET,
      secretBytes.toString("base64"),
      CLERK_SECRET,
      valid.signature,
      forged.signature,
      "should-never-appear",
      "secretpayload",
      "424242\"",
    ]) {
      expect(output, `log output leaked ${forbidden.slice(0, 12)}…`).not.toContain(forbidden);
    }
  }, 60_000);
});
