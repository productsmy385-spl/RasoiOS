import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMembership, createTenant, createUser } from "../../factories";
import { disconnectTestDb, resetDatabase, testDb } from "../setup/db";
import { resolveSession, verifiedPrimaryEmailOf, type ClerkIdentity } from "@/lib/auth/session";
import { ServiceUnavailableError } from "@/lib/errors";

// TC-AUTH-005/006/007/010 — invite-only session resolution (S1-P03-T003, ADR-006 §2).
const db = testDb();
afterAll(disconnectTestDb);
beforeEach(() => resetDatabase(db));

const identity = (clerkUserId: string, email: string | null): ClerkIdentity & { emailLookups: () => number } => {
  let lookups = 0;
  return {
    clerkUserId,
    verifiedPrimaryEmail: async () => {
      lookups++;
      return email;
    },
    emailLookups: () => lookups,
  };
};

describe("TC-AUTH-005 invited user is linked and activated once", () => {
  it("links clerk_user_id by verified email, activates every invitation and audits it", async () => {
    const { tenant: tenantA } = await createTenant(db);
    const { tenant: tenantB } = await createTenant(db);
    const user = await createUser(db, { email: "asha@example.test" });
    await db.userTenant.create({ data: { tenantId: tenantA.id, userId: user.id, role: "CASHIER", status: "INVITED", invitedAt: new Date() } });
    await db.userTenant.create({ data: { tenantId: tenantB.id, userId: user.id, role: "WAITER", status: "INVITED", invitedAt: new Date() } });

    const first = await resolveSession(identity("user_clerk_asha", "asha@example.test"), "req-link-1");
    expect(first).toMatchObject({ state: "ACTIVE", user: { id: user.id, clerkUserId: "user_clerk_asha" } });

    const memberships = await db.userTenant.findMany({ where: { userId: user.id } });
    expect(memberships.every((m) => m.status === "ACTIVE" && m.acceptedAt)).toBe(true);
    const audits = await db.auditLog.findMany({ where: { actorUserId: user.id }, orderBy: { action: "asc" } });
    expect(audits.map((a) => a.action)).toEqual(["staff.activated", "staff.activated", "user.linked"]);
    expect(audits.every((a) => a.requestId === "req-link-1")).toBe(true);

    // Second sign-in: found by clerk_user_id; no email lookup, no second link, no new audit rows.
    const again = identity("user_clerk_asha", "asha@example.test");
    expect(await resolveSession(again, "req-link-2")).toMatchObject({ state: "ACTIVE", user: { id: user.id } });
    expect(again.emailLookups()).toBe(0);
    expect(await db.auditLog.count({ where: { actorUserId: user.id } })).toBe(3);
  });

  it("links a pre-created SUPER_ADMIN who has no tenant invitation", async () => {
    const admin = await createUser(db, { email: "owner@example.test", platformRole: "SUPER_ADMIN" });
    const result = await resolveSession(identity("user_clerk_owner", "owner@example.test"), "req-owner");
    expect(result).toMatchObject({ state: "ACTIVE", user: { id: admin.id, platformRole: "SUPER_ADMIN" } });
  });

  it("never re-points a USER already linked to another Clerk account", async () => {
    const user = await createUser(db, { email: "taken@example.test" });
    await db.user.update({ where: { id: user.id }, data: { clerkUserId: "user_clerk_original" } });
    const { tenant } = await createTenant(db);
    await db.userTenant.create({ data: { tenantId: tenant.id, userId: user.id, role: "WAITER", status: "INVITED" } });

    expect(await resolveSession(identity("user_clerk_attacker", "taken@example.test"), "req-x")).toEqual({ state: "NO_ACCOUNT" });
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).clerkUserId).toBe("user_clerk_original");
  });
});

describe("TC-AUTH-006 uninvited Clerk users get no local account", () => {
  it("returns NO_ACCOUNT and writes nothing", async () => {
    const before = await db.user.count();
    expect(await resolveSession(identity("user_clerk_stranger", "stranger@example.test"), "req-s")).toEqual({ state: "NO_ACCOUNT" });
    expect(await db.user.count()).toBe(before);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("does not link a USER that exists without an invitation or platform role", async () => {
    const user = await createUser(db, { email: "former@example.test" });
    const { tenant } = await createTenant(db);
    await db.userTenant.create({ data: { tenantId: tenant.id, userId: user.id, role: "WAITER", status: "INACTIVE" } });
    expect(await resolveSession(identity("user_clerk_former", "former@example.test"), "req-f")).toEqual({ state: "NO_ACCOUNT" });
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).clerkUserId).toBeNull();
  });

  it("never links by an unverified email", async () => {
    await createUser(db, { email: "unverified@example.test" });
    // The Clerk adapter returns null when the primary email is not verified.
    expect(
      verifiedPrimaryEmailOf({
        primaryEmailAddressId: "e1",
        emailAddresses: [{ id: "e1", emailAddress: "Unverified@Example.test", verification: { status: "unverified" } }],
      }),
    ).toBeNull();
    expect(await resolveSession(identity("user_clerk_u", null), "req-u")).toEqual({ state: "NO_ACCOUNT" });
    expect(
      verifiedPrimaryEmailOf({
        primaryEmailAddressId: "e1",
        emailAddresses: [
          { id: "e0", emailAddress: "other@example.test", verification: { status: "verified" } },
          { id: "e1", emailAddress: "  Mixed.Case@Example.TEST ", verification: { status: "verified" } },
        ],
      }),
    ).toBe("mixed.case@example.test");
  });

  it("returns SIGNED_OUT without a Clerk identity", async () => {
    expect(await resolveSession(null, "req-none")).toEqual({ state: "SIGNED_OUT" });
  });
});

describe("TC-AUTH-007 inactive users receive no data", () => {
  it.each(["INACTIVE", "SUSPENDED"] as const)("a %s user resolves to INACTIVE", async (status) => {
    const { tenant } = await createTenant(db);
    const user = await createUser(db);
    await db.user.update({ where: { id: user.id }, data: { clerkUserId: `user_clerk_${status}`, status } });
    await createMembership(db, tenant.id, user.id, "MANAGER");
    expect(await resolveSession(identity(`user_clerk_${status}`, null), "req-i")).toEqual({ state: "INACTIVE", userId: user.id });
  });
});

describe("last sign-in is throttled", () => {
  it("writes last_sign_in_at at most once per 15 minutes", async () => {
    const user = await createUser(db);
    await db.user.update({ where: { id: user.id }, data: { clerkUserId: "user_clerk_t" } });
    await resolveSession(identity("user_clerk_t", null), "r1");
    const first = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).lastSignInAt;
    expect(first).not.toBeNull();
    await resolveSession(identity("user_clerk_t", null), "r2");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).lastSignInAt?.getTime()).toBe(first?.getTime());
  });
});

describe("TC-AUTH-010 database outage during resolution", () => {
  it("fails with 503 SERVICE_UNAVAILABLE, not as signed out", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/prisma", async () => {
      const actual = await vi.importActual<typeof import("@/lib/db/prisma")>("@/lib/db/prisma");
      const down = actual.createPrismaClient({ databaseUrl: "postgresql://nobody:nothing@127.0.0.1:1/unreachable?connect_timeout=2" });
      return { ...actual, db: down, prisma: down };
    });
    const { resolveSession: resolveWithOutage } = await import("@/lib/auth/session");
    const { ServiceUnavailableError: Unavailable } = await import("@/lib/errors");
    const error = await resolveWithOutage(identity("user_clerk_any", "any@example.test"), "req-outage").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Unavailable);
    expect((error as InstanceType<typeof ServiceUnavailableError>).statusCode).toBe(503);
    vi.doUnmock("@/lib/db/prisma");
  }, 30_000);
});
