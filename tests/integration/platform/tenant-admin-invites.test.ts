import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { inviteTenantAdminAction, revokeTenantAdminInviteAction } from "@/app/admin/actions";
import { createMembership, createUser } from "../../factories";
import { testDb } from "../setup/db";
import { SUPER_ADMIN_EMAIL, asPlatformAdmin, invokeAction, seedOnce, seeded, staffEmail, SEED_TENANTS, tenantIdOf } from "../helpers/actors";
import { RANDOM_UUID, dataOf, errorOf } from "../orders/helpers";
import { APP_URL, clerkCalls, clerkStub, json, platformSnapshot, resetClerkStub, startClerkStub, stopClerkStub, xminOf } from "./helpers";

vi.mock("@/lib/auth/clerk-admin", async (importOriginal) => {
  const { stubbedClerkAdminModule } = await import("./helpers");
  return stubbedClerkAdminModule(await importOriginal());
});

// SA-ADM-05 invite / resend and TC-ADMIN-007 (SA-ADM-06) revoke of a pending TENANT_ADMIN invitation (S1-P06-T001).
// Clerk-dependent writes follow lib/auth/clerk-admin.ts: a Clerk failure leaves no partial local state.
const db = testDb();
const A = () => tenantIdOf("A");

beforeAll(async () => {
  await seedOnce();
  await startClerkStub();
}, 120_000);
afterAll(stopClerkStub);
beforeEach(() => {
  resetClerkStub();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP_URL);
});
afterEach(() => vi.unstubAllEnvs());

async function membershipOf(email: string, tenantId = A()) {
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  return db.userTenant.findUniqueOrThrow({ where: { tenantId_userId: { tenantId, userId: user.id } } });
}

describe("SA-ADM-05 invite a tenant administrator", () => {
  it("creates the USER and an INVITED TENANT_ADMIN with the Clerk invitation, audited in the same transaction", async () => {
    const { userId: superAdminId } = await asPlatformAdmin();
    const data = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: " Second.Admin@Example.TEST ", fullName: "Kiran Rao" }));
    expect(data).toMatchObject({ tenantId: A(), resent: false, invitation: { status: "SENT" } });

    expect(clerkCalls()).toEqual(["POST /v1/invitations"]);
    expect(clerkStub.requests[0].body).toMatchObject({ email_address: "second.admin@example.test", redirect_url: `${APP_URL}/sign-up` });
    const user = await db.user.findUniqueOrThrow({ where: { email: "second.admin@example.test" } });
    expect(user).toMatchObject({ fullName: "Kiran Rao", platformRole: "NONE", clerkUserId: null });
    const membership = await db.userTenant.findUniqueOrThrow({ where: { id: data.membershipId } });
    expect(membership).toMatchObject({ tenantId: A(), userId: user.id, role: "TENANT_ADMIN", status: "INVITED", invitedByUserId: superAdminId });
    expect(membership.clerkInvitationId).toMatch(/^inv_stub_/);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "tenant_admin.invited", resourceId: data.membershipId } });
    expect(audit).toMatchObject({ tenantId: A(), actorRole: "SUPER_ADMIN", resourceType: "user_tenant", beforeState: null });
    expect(audit.afterState).toEqual({ status: "INVITED", role: "TENANT_ADMIN", email: "s***@example.test", resent: false, newUser: true });
    const txId = await xminOf("user_tenants", data.membershipId);
    expect(await xminOf("audit_logs", audit.id)).toBe(txId);
    expect(await xminOf("users", user.id)).toBe(txId);
  });

  it("re-inviting a pending administrator resends: new invitation on the same membership, previous one revoked", async () => {
    await asPlatformAdmin();
    const first = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: "resend.admin@example.test" }));
    const firstInvitation = (await db.userTenant.findUniqueOrThrow({ where: { id: first.membershipId } })).clerkInvitationId!;
    resetClerkStub();

    const second = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: "resend.admin@example.test" }));
    expect(second).toMatchObject({ membershipId: first.membershipId, resent: true });
    const membership = await db.userTenant.findUniqueOrThrow({ where: { id: first.membershipId } });
    expect(membership.status).toBe("INVITED");
    expect(membership.clerkInvitationId).not.toBe(firstInvitation);
    expect(clerkCalls()).toEqual(["POST /v1/invitations", `POST /v1/invitations/${firstInvitation}/revoke`]);
    const audits = await db.auditLog.findMany({ where: { action: "tenant_admin.invited", resourceId: first.membershipId }, orderBy: { createdAt: "asc" } });
    expect(audits).toHaveLength(2);
    expect(audits[1].afterState).toMatchObject({ resent: true, newUser: false });
    expect(audits[1].beforeState).toEqual({ status: "INVITED", role: "TENANT_ADMIN" });
  });

  it("an existing identity (staff elsewhere) is invited without creating a second USER", async () => {
    await asPlatformAdmin();
    const bManagerEmail = staffEmail(SEED_TENANTS.B, "manager");
    const usersBefore = await db.user.count();
    const data = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: bManagerEmail }));
    expect(await db.user.count()).toBe(usersBefore);
    expect(await db.userTenant.findUniqueOrThrow({ where: { id: data.membershipId } })).toMatchObject({ userId: seeded("B", "user:MANAGER"), role: "TENANT_ADMIN", status: "INVITED" });
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "tenant_admin.invited", resourceId: data.membershipId } });
    expect(audit.afterState).toMatchObject({ newUser: false });
  });

  it("refuses members, other pending roles, platform administrators and deactivated accounts before contacting Clerk", async () => {
    await asPlatformAdmin();
    const inactive = await createUser(db, { email: "inactive.person@example.test" });
    await db.user.update({ where: { id: inactive.id }, data: { status: "INACTIVE" } });
    const before = await platformSnapshot();

    const cases: Array<[string, string]> = [
      [staffEmail(SEED_TENANTS.A, "manager"), "ALREADY_MEMBER"], // ACTIVE member
      [staffEmail(SEED_TENANTS.A, "waiter2"), "ALREADY_MEMBER"], // pending WAITER invitation
      [SUPER_ADMIN_EMAIL, "PLATFORM_ADMIN_NOT_INVITABLE"],
      ["inactive.person@example.test", "USER_INACTIVE"],
    ];
    for (const [email, code] of cases) {
      expect(errorOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email })).code, email).toBe(code);
    }
    expect(errorOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: RANDOM_UUID, email: "ghost.admin@example.test" })).code).toBe("NOT_FOUND");
    expect(errorOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: "not-an-email" })).code).toBe("VALIDATION_ERROR");
    expect(clerkCalls()).toEqual([]);
    expect(await platformSnapshot()).toEqual(before);
  });

  it("a Clerk failure leaves no USER, membership or audit row behind", async () => {
    await asPlatformAdmin();
    const before = await platformSnapshot();
    clerkStub.override = (req, res) => req.pathname === "/v1/invitations" && json(res, 502, { errors: [{ code: "bad_gateway", message: "upstream" }] });
    const error = errorOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: "clerk.down@example.test" }));
    expect(error.code).toBe("INVITATION_FAILED");
    expect(error.message).not.toMatch(/upstream|bad_gateway/);
    expect(await db.user.findUnique({ where: { email: "clerk.down@example.test" } })).toBeNull();
    expect(await platformSnapshot()).toEqual(before);
  });

  it("when the local commit fails after Clerk succeeded, the new invitation is revoked again (compensation)", async () => {
    await asPlatformAdmin();
    const email = "raced.admin@example.test";
    // While Clerk is answering, the same person becomes an ACTIVE member through another path.
    clerkStub.override = async (req, res) => {
      if (req.pathname !== "/v1/invitations") return false;
      const user = await createUser(db, { email });
      await createMembership(db, A(), user.id, "MANAGER");
      return json(res, 200, { object: "invitation", id: "inv_raced_1", email_address: email, status: "pending", created_at: 1, updated_at: 1 });
    };
    const error = errorOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email }));
    expect(error.code).toBe("ALREADY_MEMBER");
    expect(clerkCalls()).toEqual(["POST /v1/invitations", "POST /v1/invitations/inv_raced_1/revoke"]);
    const membership = await membershipOf(email);
    expect(membership).toMatchObject({ role: "MANAGER", status: "ACTIVE", clerkInvitationId: null });
    expect(await db.auditLog.count({ where: { action: "tenant_admin.invited", resourceId: membership.id } })).toBe(0);
  });
});

describe("TC-ADMIN-007 revoke a pending administrator invitation", () => {
  it("revokes the Clerk invitation and marks the membership INACTIVE, audited in the same transaction", async () => {
    const { userId: superAdminId } = await asPlatformAdmin();
    const invited = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: "revoke.me@example.test" }));
    const invitationId = (await db.userTenant.findUniqueOrThrow({ where: { id: invited.membershipId } })).clerkInvitationId!;
    resetClerkStub();

    const data = dataOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: invited.membershipId }));
    expect(data).toEqual({ tenantId: A(), membershipId: invited.membershipId, status: "INACTIVE" });
    expect(clerkCalls()).toEqual([`POST /v1/invitations/${invitationId}/revoke`]);

    const membership = await db.userTenant.findUniqueOrThrow({ where: { id: invited.membershipId } });
    expect(membership).toMatchObject({ status: "INACTIVE", deactivatedByUserId: superAdminId });
    expect(membership.deactivatedAt).toBeInstanceOf(Date);
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "tenant_admin.invite_revoked", resourceId: invited.membershipId } });
    expect(audit).toMatchObject({ tenantId: A(), actorRole: "SUPER_ADMIN", resourceType: "user_tenant", beforeState: { status: "INVITED", role: "TENANT_ADMIN" }, afterState: { status: "INACTIVE" } });
    expect(await xminOf("audit_logs", audit.id)).toBe(await xminOf("user_tenants", invited.membershipId));

    // Revoking again is a conflict; inviting again turns the same row into a fresh invitation.
    expect(errorOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: invited.membershipId })).code).toBe("NOT_INVITED");
    const again = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: "revoke.me@example.test" }));
    expect(again).toMatchObject({ membershipId: invited.membershipId, resent: false });
    expect(await db.userTenant.findUniqueOrThrow({ where: { id: invited.membershipId } })).toMatchObject({ status: "INVITED", deactivatedAt: null, deactivatedByUserId: null });
  });

  it("a Clerk failure leaves the invitation pending and writes nothing", async () => {
    await asPlatformAdmin();
    const invited = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: "sticky.invite@example.test" }));
    resetClerkStub();
    clerkStub.override = (req, res) => req.pathname.endsWith("/revoke") && json(res, 500, { errors: [{ code: "internal", message: "down" }] });
    const before = await platformSnapshot();

    const error = errorOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: invited.membershipId }));
    expect(error.code).toBe("INVITATION_REVOKE_FAILED");
    expect((await db.userTenant.findUniqueOrThrow({ where: { id: invited.membershipId } })).status).toBe("INVITED");
    expect(await platformSnapshot()).toEqual(before);
  });

  it("an invitation Clerk already forgot (404) and one never sent are still revoked locally", async () => {
    await asPlatformAdmin();
    const invited = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: A(), email: "gone.invite@example.test" }));
    resetClerkStub();
    clerkStub.override = (req, res) => req.pathname.endsWith("/revoke") && json(res, 404, { errors: [{ code: "resource_not_found", message: "gone" }] });
    expect(dataOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: invited.membershipId })).status).toBe("INACTIVE");

    // An INVITED admin whose invitation was never sent (INVITATION_FAILED at creation) has nothing to revoke in Clerk.
    resetClerkStub();
    const user = await createUser(db, { email: "never.sent@example.test" });
    const pending = await db.userTenant.create({ data: { tenantId: A(), userId: user.id, role: "TENANT_ADMIN", status: "INVITED", invitedAt: new Date() } });
    expect(dataOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: pending.id })).status).toBe("INACTIVE");
    expect(clerkCalls()).toEqual([]);
  });

  it("only a pending TENANT_ADMIN invitation of the target tenant can be revoked; others look like NOT_FOUND or conflict", async () => {
    await asPlatformAdmin();
    const before = await platformSnapshot();
    // Tenant B's pending invitation addressed through Tenant A is indistinguishable from a random id (no oracle).
    const foreign = errorOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: seeded("B", "membership:WAITER2") }));
    const random = errorOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: RANDOM_UUID }));
    expect(foreign).toMatchObject({ code: "NOT_FOUND" });
    expect({ code: foreign.code, message: foreign.message }).toEqual({ code: random.code, message: random.message });

    expect(errorOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: seeded("A", "membership:WAITER2") })).code).toBe("NOT_TENANT_ADMIN_INVITE");
    expect(errorOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: seeded("A", "membership:TENANT_ADMIN") })).code).toBe("NOT_INVITED");
    expect(errorOf(await invokeAction(revokeTenantAdminInviteAction, { targetTenantId: A(), membershipId: "nope" })).code).toBe("VALIDATION_ERROR");
    expect(clerkCalls()).toEqual([]);
    expect(await platformSnapshot()).toEqual(before);
  });
});
