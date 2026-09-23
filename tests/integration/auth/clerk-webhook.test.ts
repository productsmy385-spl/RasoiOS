import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMembership, createTenant, createUser } from "../../factories";
import { disconnectTestDb, resetDatabase, testDb } from "../setup/db";

// TC-AUTH-016 / TC-AUTH-017 — Clerk webhook verification and idempotent sync (S1-P03-T008, ADR-011 §5).
const db = testDb();
const secretBytes = randomBytes(24);
const SECRET = `whsec_${secretBytes.toString("base64")}`;
let handler: (request: never) => Promise<Response>;
// Route handlers receive a NextRequest; a plain Request carries everything verifyWebhook reads.
const POST = (request: Request) => handler(request as never);

beforeAll(async () => {
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = SECRET;
  ({ POST: handler } = await import("@/app/api/webhooks/clerk/route"));
});
afterAll(async () => {
  delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  await disconnectTestDb();
});
beforeEach(() => resetDatabase(db));

let ipCounter = 0;
function signedRequest(payload: unknown, options: { timestamp?: number; tamper?: boolean; secret?: Buffer } = {}): Request {
  const body = JSON.stringify(payload);
  const id = `msg_${randomUUID()}`;
  const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", options.secret ?? secretBytes).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Request("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
      "x-forwarded-for": `198.51.100.${++ipCounter % 250}`,
    },
    body: options.tamper ? body.replace("user_", "usex_") : body,
  });
}

const deleted = (clerkUserId: string) => ({ type: "user.deleted", object: "event", data: { id: clerkUserId, object: "user", deleted: true } });
const updated = (clerkUserId: string, email: string, verified = true) => ({
  type: "user.updated",
  object: "event",
  data: {
    id: clerkUserId,
    object: "user",
    first_name: "Asha",
    last_name: "Rao",
    primary_email_address_id: "idn_1",
    email_addresses: [{ id: "idn_1", object: "email_address", email_address: email, verification: { status: verified ? "verified" : "unverified", strategy: "email_code" }, linked_to: [] }],
  },
});

async function linkedUserWithMemberships() {
  const user = await createUser(db, { email: "asha@example.test" });
  await db.user.update({ where: { id: user.id }, data: { clerkUserId: "user_asha" } });
  const { tenant: a } = await createTenant(db);
  const { tenant: b } = await createTenant(db);
  await createMembership(db, a.id, user.id, "CASHIER");
  await createMembership(db, b.id, user.id, "MANAGER");
  return user;
}

describe("TC-AUTH-016 signature verification", () => {
  it("rejects an invalid signature with 400 and changes nothing", async () => {
    const user = await linkedUserWithMemberships();
    const response = await POST(signedRequest(deleted("user_asha"), { secret: randomBytes(24) }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_SIGNATURE");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe("ACTIVE");
  });

  it("rejects a tampered body", async () => {
    await linkedUserWithMemberships();
    expect((await POST(signedRequest(deleted("user_asha"), { tamper: true }))).status).toBe(400);
  });

  it("rejects a timestamp older than 5 minutes (and one too far in the future)", async () => {
    const user = await linkedUserWithMemberships();
    const now = Math.floor(Date.now() / 1000);
    expect((await POST(signedRequest(deleted("user_asha"), { timestamp: now - 6 * 60 }))).status).toBe(400);
    expect((await POST(signedRequest(deleted("user_asha"), { timestamp: now + 6 * 60 }))).status).toBe(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe("ACTIVE");
    expect(await db.auditLog.count()).toBe(0);
  });

  it("rejects a request without signature headers", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/clerk", { method: "POST", body: "{}" }));
    expect(response.status).toBe(400);
  });
});

describe("TC-AUTH-017 idempotent handling", () => {
  it("replaying a valid user.deleted twice yields the same final state and no duplicate audit rows", async () => {
    const user = await linkedUserWithMemberships();
    expect((await POST(signedRequest(deleted("user_asha")))).status).toBe(200);
    const afterFirst = await db.auditLog.count();
    expect((await POST(signedRequest(deleted("user_asha")))).status).toBe(200);

    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe("INACTIVE");
    const memberships = await db.userTenant.findMany({ where: { userId: user.id } });
    expect(memberships.every((m) => m.status === "INACTIVE" && m.deactivatedAt)).toBe(true);
    expect(afterFirst).toBe(3); // user.status_changed + 2 × staff.deactivated
    expect(await db.auditLog.count()).toBe(afterFirst);
  });

  it("acknowledges unknown event types with 200 and changes nothing", async () => {
    await linkedUserWithMemberships();
    const response = await POST(signedRequest({ type: "organization.created", object: "event", data: { id: "org_1" } }));
    expect(response.status).toBe(200);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("syncs a verified email and name on user.updated, but not an unverified one", async () => {
    const user = await linkedUserWithMemberships();
    expect((await POST(signedRequest(updated("user_asha", "unverified@example.test", false)))).status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe("asha@example.test");

    expect((await POST(signedRequest(updated("user_asha", "Asha.New@Example.test")))).status).toBe(200);
    const synced = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(synced.email).toBe("asha.new@example.test");
    expect(synced.fullName).toBe("Asha Rao");
  });

  it("does not take over another user's email", async () => {
    const user = await linkedUserWithMemberships();
    await createUser(db, { email: "taken@example.test" });
    expect((await POST(signedRequest(updated("user_asha", "taken@example.test")))).status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe("asha@example.test");
  });

  it("ignores events for Clerk users that have no local account", async () => {
    expect((await POST(signedRequest(deleted("user_stranger")))).status).toBe(200);
    expect(await db.user.count()).toBe(0);
  });
});
