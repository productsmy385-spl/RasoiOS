import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { checkTenantSlugAction, createTenantAction, inviteTenantAdminAction } from "@/app/admin/actions";
import { testDb } from "../setup/db";
import { SUPER_ADMIN_EMAIL, asPlatformAdmin, invokeAction, seedOnce } from "../helpers/actors";
import { dataOf, errorOf } from "../orders/helpers";
import { APP_URL, clerkCalls, clerkStub, json, newTenantInput, platformSnapshot, resetClerkStub, startClerkStub, stopClerkStub, xminOf } from "./helpers";

vi.mock("@/lib/auth/clerk-admin", async (importOriginal) => {
  const { stubbedClerkAdminModule } = await import("./helpers");
  return stubbedClerkAdminModule(await importOriginal());
});

// TC-ADMIN-003 (SA-ADM-01) and the create-time part of TC-ADMIN-004 (slug rules) — S1-P06-T001.
const db = testDb();

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

describe("TC-ADMIN-003 create tenant", () => {
  it("commits tenant, restaurant, closed hours and the INVITED TENANT_ADMIN atomically with both audit rows, then sends the invitation", async () => {
    const { userId: superAdminId } = await asPlatformAdmin();
    const result = await invokeAction(
      createTenantAction,
      newTenantInput({ slug: " Coastal-Curry ", currencyCode: "inr", countryCode: "in", adminEmail: "  Owner.Coastal+clerk_test@Example.COM " }),
    );
    const data = dataOf(result);
    expect(data).toMatchObject({ slug: "coastal-curry", invitation: { status: "SENT" } });

    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: data.tenantId }, include: { restaurant: true } });
    expect(tenant).toMatchObject({ name: "Coastal Curry House", slug: "coastal-curry", status: "ACTIVE", createdByUserId: superAdminId, suspendedAt: null });
    expect(tenant.restaurant).toMatchObject({ name: "Coastal Curry", timezone: "Asia/Kolkata", currencyCode: "INR", countryCode: "IN", websitePublished: false });

    const hours = await db.restaurantHours.findMany({ where: { tenantId: data.tenantId }, orderBy: { dayOfWeek: "asc" } });
    expect(hours.map((h) => [h.dayOfWeek, h.sequence, h.isClosed, h.opensAt, h.closesAt])).toEqual(
      [1, 2, 3, 4, 5, 6, 7].map((day) => [day, 1, true, null, null]),
    );

    const user = await db.user.findUniqueOrThrow({ where: { email: "owner.coastal+clerk_test@example.com" } });
    expect(user).toMatchObject({ fullName: "Meera Pillai", platformRole: "NONE", status: "ACTIVE", clerkUserId: null });
    const membership = await db.userTenant.findUniqueOrThrow({ where: { id: data.membershipId } });
    expect(membership).toMatchObject({ tenantId: data.tenantId, userId: user.id, role: "TENANT_ADMIN", status: "INVITED", invitedByUserId: superAdminId, clerkInvitationId: "inv_stub_1" });
    expect(membership.invitedAt).toBeInstanceOf(Date);

    // The invitation went to the normalised address with the server-built sign-up URL.
    expect(clerkCalls()).toEqual(["POST /v1/invitations"]);
    expect(clerkStub.requests[0].body).toMatchObject({ email_address: "owner.coastal+clerk_test@example.com", redirect_url: `${APP_URL}/sign-up`, notify: true });

    // Both audit rows, written by the transaction that created the tenant (SC-AUD-02).
    // Sorted in JS: ORDER BY on text follows the database collation, and en_US (CI) ignores punctuation, C does not.
    const audits = await db.auditLog.findMany({ where: { tenantId: data.tenantId } });
    expect(audits.map((a) => a.action).sort()).toEqual(["tenant.created", "tenant_admin.invited"]);
    for (const row of audits) expect(row).toMatchObject({ actorType: "USER", actorUserId: superAdminId, actorRole: "SUPER_ADMIN" });
    const created = audits.find((a) => a.action === "tenant.created")!;
    const invited = audits.find((a) => a.action === "tenant_admin.invited")!;
    expect(created).toMatchObject({ resourceType: "tenant", resourceId: data.tenantId });
    expect(created.afterState).toMatchObject({ name: "Coastal Curry House", slug: "coastal-curry", restaurant: { timezone: "Asia/Kolkata", currencyCode: "INR", countryCode: "IN" } });
    expect(invited).toMatchObject({ resourceType: "user_tenant", resourceId: data.membershipId });
    expect(invited.afterState).toEqual({ role: "TENANT_ADMIN", status: "INVITED", email: "o***@example.com", newUser: true });
    const txId = await xminOf("tenants", data.tenantId);
    expect(await xminOf("restaurants", tenant.restaurant!.id)).toBe(txId);
    expect(await xminOf("users", user.id)).toBe(txId);
    expect(await xminOf("audit_logs", created.id)).toBe(txId);
    expect(await xminOf("audit_logs", invited.id)).toBe(txId);
  });

  it("an invitation failure keeps the tenant with a resendable INVITED admin and returns an INVITATION_FAILED warning", async () => {
    await asPlatformAdmin();
    clerkStub.override = (req, res) => req.pathname === "/v1/invitations" && json(res, 500, { errors: [{ code: "internal", message: "down" }] });
    const data = dataOf(await invokeAction(createTenantAction, newTenantInput({ slug: "lagoon-kitchen", tenantName: "Lagoon Kitchen", adminEmail: "lagoon.owner@example.test" })));
    expect(data.invitation).toMatchObject({ status: "FAILED", code: "INVITATION_FAILED" });

    expect(await db.tenant.findUniqueOrThrow({ where: { id: data.tenantId } })).toMatchObject({ slug: "lagoon-kitchen", status: "ACTIVE" });
    expect(await db.userTenant.findUniqueOrThrow({ where: { id: data.membershipId } })).toMatchObject({ status: "INVITED", role: "TENANT_ADMIN", clerkInvitationId: null });
    expect((await db.auditLog.findMany({ where: { tenantId: data.tenantId } })).map((a) => a.action).sort()).toEqual(["tenant.created", "tenant_admin.invited"]);

    // "Resend": inviting the same address again sends a new invitation on the same membership.
    resetClerkStub();
    const resent = dataOf(await invokeAction(inviteTenantAdminAction, { targetTenantId: data.tenantId, email: "lagoon.owner@example.test" }));
    expect(resent).toMatchObject({ tenantId: data.tenantId, membershipId: data.membershipId, resent: true, invitation: { status: "SENT" } });
    expect(clerkCalls()).toEqual(["POST /v1/invitations"]);
    const membership = await db.userTenant.findUniqueOrThrow({ where: { id: data.membershipId } });
    expect(membership.status).toBe("INVITED");
    expect(membership.clerkInvitationId).toMatch(/^inv_stub_/);
    expect(await db.auditLog.count({ where: { tenantId: data.tenantId, action: "tenant_admin.invited" } })).toBe(2);
  });

  it("a timed-out invitation is reported as CLERK_TIMEOUT and still leaves a resendable admin", async () => {
    await asPlatformAdmin();
    clerkStub.timeoutMs = 300;
    clerkStub.override = (req) => req.pathname === "/v1/invitations"; // never answers
    const data = dataOf(await invokeAction(createTenantAction, newTenantInput({ slug: "slow-lane-diner", adminEmail: "slow.owner@example.test" })));
    expect(data.invitation).toMatchObject({ status: "FAILED", code: "CLERK_TIMEOUT" });
    expect(await db.userTenant.findUniqueOrThrow({ where: { id: data.membershipId } })).toMatchObject({ status: "INVITED", clerkInvitationId: null });
  });

  it("when the local transaction fails nothing is written and no invitation is sent", async () => {
    await asPlatformAdmin();
    const before = await platformSnapshot();

    // Duplicate slug (a seeded tenant; uppercase input is normalised first).
    const taken = errorOf(await invokeAction(createTenantAction, newTenantInput({ slug: "Spice-Route", adminEmail: "dup.slug@example.test" })));
    expect(taken).toMatchObject({ code: "SLUG_TAKEN", fieldErrors: { slug: ["This slug is already in use"] } });

    // The first administrator is refused after the tenant rows were inserted: the whole transaction rolls back.
    const platformAdmin = errorOf(await invokeAction(createTenantAction, newTenantInput({ slug: "rollback-bistro", adminEmail: SUPER_ADMIN_EMAIL })));
    expect(platformAdmin.code).toBe("PLATFORM_ADMIN_NOT_INVITABLE");

    expect(await platformSnapshot()).toEqual(before);
    expect(await db.tenant.findUnique({ where: { slug: "rollback-bistro" } })).toBeNull();
    expect(await db.user.findUnique({ where: { email: "dup.slug@example.test" } })).toBeNull();
    expect(clerkCalls()).toEqual([]);
  });

  it("timezone, currency and country are required and validated — no silent defaults (Q-005 open)", async () => {
    await asPlatformAdmin();
    const before = await platformSnapshot();
    const withoutLocale: Record<string, unknown> = newTenantInput({ slug: "no-locale-cafe" });
    delete withoutLocale.timezone;
    delete withoutLocale.currencyCode;
    delete withoutLocale.countryCode;
    const missing = errorOf(await invokeAction(createTenantAction, withoutLocale as never));
    expect(missing.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(missing.fieldErrors ?? {}).sort()).toEqual(["countryCode", "currencyCode", "timezone"]);

    for (const [field, value] of [
      ["timezone", "IST"],
      ["timezone", "GMT+5:30"],
      ["timezone", "Mars/Olympus_Mons"],
      ["currencyCode", "XYZ"],
      ["currencyCode", "RUPEES"],
      ["countryCode", "XX"],
      ["countryCode", "IND"],
      ["adminEmail", "not-an-email"],
      ["tenantName", "A"],
      ["restaurantName", ""],
    ] as const) {
      const error = errorOf(await invokeAction(createTenantAction, newTenantInput({ slug: "bad-input-cafe", [field]: value })));
      expect(error.code, `${field}=${value}`).toBe("VALIDATION_ERROR");
      expect(Object.keys(error.fieldErrors ?? {}), `${field}=${value}`).toEqual([field]);
    }

    const extra = errorOf(await invokeAction(createTenantAction, { ...newTenantInput({ slug: "extra-key-cafe" }), tenantId: "11111111-1111-4111-8111-111111111111" } as never));
    expect(extra.code).toBe("VALIDATION_ERROR");
    expect(await platformSnapshot()).toEqual(before);
    expect(clerkCalls()).toEqual([]);
  });
});

describe("TC-ADMIN-004 slug validation at creation", () => {
  it("rejects reserved words and bad patterns with a slug field error", async () => {
    await asPlatformAdmin();
    const before = await platformSnapshot();
    for (const slug of ["admin", "api", "restaurant", "sign-in", "sign-up", "account", "offline", "r"]) {
      const error = errorOf(await invokeAction(createTenantAction, newTenantInput({ slug })));
      expect(error.code, slug).toBe("VALIDATION_ERROR");
      expect(error.fieldErrors?.slug, slug).toBeDefined();
    }
    for (const slug of ["ab", "-leading", "trailing-", "under_score", "space here", "dot.slug", "x".repeat(49), "émigré"]) {
      const error = errorOf(await invokeAction(createTenantAction, newTenantInput({ slug })));
      expect(error, slug).toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { slug: [expect.stringContaining("lowercase letters")] } });
    }
    expect(await platformSnapshot()).toEqual(before);
  });

  it("accepts the longest valid slug (48 characters)", async () => {
    await asPlatformAdmin();
    const slug = `a${"b".repeat(46)}c`;
    const data = dataOf(await invokeAction(createTenantAction, newTenantInput({ slug, adminEmail: "long.slug@example.test" })));
    expect(data.slug).toBe(slug);
  });

  it("the availability hint reports available, taken, reserved and invalid slugs", async () => {
    await asPlatformAdmin();
    expect(dataOf(await invokeAction(checkTenantSlugAction, { slug: "Fresh-Name " }))).toEqual({ slug: "fresh-name", available: true, reason: null, message: null });
    expect(dataOf(await invokeAction(checkTenantSlugAction, { slug: "spice-route" }))).toMatchObject({ available: false, reason: "TAKEN" });
    expect(dataOf(await invokeAction(checkTenantSlugAction, { slug: "admin" }))).toMatchObject({ available: false, reason: "RESERVED" });
    expect(dataOf(await invokeAction(checkTenantSlugAction, { slug: "a_b" }))).toMatchObject({ available: false, reason: "INVALID" });
    expect(errorOf(await invokeAction(checkTenantSlugAction, { slug: "x", tenantId: "11111111-1111-4111-8111-111111111111" } as never)).code).toBe("VALIDATION_ERROR");
  });
});
