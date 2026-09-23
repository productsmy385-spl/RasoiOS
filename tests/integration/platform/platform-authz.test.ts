import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkTenantSlugAction,
  createTenantAction,
  inviteTenantAdminAction,
  reactivateTenantAction,
  revokeTenantAdminInviteAction,
  suspendTenantAction,
  updateTenantAction,
} from "@/app/admin/actions";
import type { PlatformContext, TenantContext } from "@/lib/auth/context-types";
import { requirePlatform, requireTenant } from "@/lib/auth/guards";
import { PLATFORM_PERMISSIONS } from "@/lib/auth/permissions";
import {
  checkSlugAvailability,
  createTenant,
  getPlatformDashboard,
  inspectTenant,
  inviteTenantAdmin,
  listTenantsForPlatform,
  reactivateTenant,
  revokeTenantAdminInvite,
  suspendTenant,
  updateTenant,
} from "@/lib/services/platform-tenants";
import { TENANT_ROLES } from "@/prisma/seed-data/tenants";
import { testDb } from "../setup/db";
import { asAnonymous, asPlatformAdmin, asSeedUser, asUninvited, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { RANDOM_UUID, errorOf } from "../orders/helpers";
import { APP_URL, clerkCalls, newTenantInput, platformSnapshot, resetClerkStub, startClerkStub, stopClerkStub } from "./helpers";

vi.mock("@/lib/auth/clerk-admin", async (importOriginal) => {
  const { stubbedClerkAdminModule } = await import("./helpers");
  return stubbedClerkAdminModule(await importOriginal());
});

// security.md §3.3 rows 1–6 (SC-RBAC-01/03, ADV-006): every platform action refuses every tenant role with FORBIDDEN
// before reading its input or any row; platform services re-check the platform permission and cannot take a
// TenantContext (S1-P06-T001 acceptance criteria).
const db = testDb();
const REASON = "Tenant role attempting a platform suspension.";

beforeAll(async () => {
  await seedOnce();
  await startClerkStub();
}, 120_000);
afterAll(stopClerkStub);
beforeEach(() => {
  resetClerkStub();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP_URL);
});

/** Valid-looking inputs aimed at the caller's own tenant (ADV-006); a Proxy records any property read. */
function probes(ownTenantId: string) {
  return [
    { name: "createTenantAction", fn: createTenantAction, input: newTenantInput({ slug: "escalation-attempt", adminEmail: "escalate@example.test" }) },
    { name: "checkTenantSlugAction", fn: checkTenantSlugAction, input: { slug: "spice-route" } },
    { name: "updateTenantAction", fn: updateTenantAction, input: { targetTenantId: ownTenantId, name: "Renamed by staff" } },
    { name: "suspendTenantAction", fn: suspendTenantAction, input: { targetTenantId: ownTenantId === tenantIdOf("A") ? tenantIdOf("B") : tenantIdOf("A"), reason: REASON } },
    { name: "reactivateTenantAction", fn: reactivateTenantAction, input: { targetTenantId: ownTenantId } },
    { name: "inviteTenantAdminAction", fn: inviteTenantAdminAction, input: { targetTenantId: ownTenantId, email: "sneaky.admin@example.test" } },
    { name: "revokeTenantAdminInviteAction", fn: revokeTenantAdminInviteAction, input: { targetTenantId: ownTenantId, membershipId: RANDOM_UUID } },
  ] as const;
}

function tracked<T extends object>(input: T): { proxy: T; touched: string[] } {
  const touched: string[] = [];
  const proxy = new Proxy(input, {
    get(target, key, receiver) {
      touched.push(String(key));
      return Reflect.get(target, key, receiver);
    },
    ownKeys(target) {
      touched.push("<keys>");
      return Reflect.ownKeys(target);
    },
    has(target, key) {
      touched.push(`has:${String(key)}`);
      return Reflect.has(target, key);
    },
  });
  return { proxy, touched };
}

async function snapshot() {
  return { ...(await platformSnapshot()), rateLimitBuckets: await db.rateLimitBucket.count() };
}

describe("tenant roles are denied every platform action before anything is read", () => {
  it("returns FORBIDDEN to all five tenant roles of both tenants, without reading input, writing rows or calling Clerk", async () => {
    const before = await snapshot();
    const tenantsBefore = await db.tenant.findMany({ orderBy: { id: "asc" } });
    for (const tenant of ["A", "B"] as const) {
      for (const role of TENANT_ROLES) {
        await asSeedUser(tenant, role);
        for (const probe of probes(tenantIdOf(tenant))) {
          const { proxy, touched } = tracked(probe.input);
          const result = await invokeAction(probe.fn as (input: unknown) => Promise<unknown>, proxy);
          expect(errorOf(result as never), `${tenant}/${role} ${probe.name}`).toMatchObject({ code: "FORBIDDEN", message: "You don't have permission to do this." });
          expect(touched, `${tenant}/${role} ${probe.name} read its input`).toEqual([]);
        }
      }
    }
    expect(await snapshot()).toEqual(before);
    expect(await db.tenant.findMany({ orderBy: { id: "asc" } })).toEqual(tenantsBefore);
    expect(clerkCalls()).toEqual([]);
  });

  it("signed-out callers get UNAUTHENTICATED and uninvited identities NO_ACTIVE_MEMBERSHIP", async () => {
    const before = await snapshot();
    for (const [actAs, code] of [
      [asAnonymous, "UNAUTHENTICATED"],
      [() => asUninvited(), "NO_ACTIVE_MEMBERSHIP"],
    ] as const) {
      actAs();
      for (const probe of probes(tenantIdOf("A"))) {
        const { proxy, touched } = tracked(probe.input);
        const result = await invokeAction(probe.fn as (input: unknown) => Promise<unknown>, proxy);
        expect(errorOf(result as never).code, `${code} ${probe.name}`).toBe(code);
        expect(touched).toEqual([]);
      }
    }
    expect(await snapshot()).toEqual(before);
    expect(clerkCalls()).toEqual([]);
  });

  it("the SUPER_ADMIN passes the guard for every platform permission", async () => {
    await asPlatformAdmin();
    for (const permission of PLATFORM_PERMISSIONS) {
      expect((await requirePlatform(permission)).kind, permission).toBe("platform");
    }
  });
});

describe("platform services re-check the platform permission (defence in depth)", () => {
  const calls = (ctx: PlatformContext) => [
    () => createTenant(ctx, { ...newTenantInput({ slug: "forged-context" }), adminFullName: null }),
    () => updateTenant(ctx, { targetTenantId: tenantIdOf("A"), name: "Forged" }),
    () => suspendTenant(ctx, { targetTenantId: tenantIdOf("A"), reason: REASON }),
    () => reactivateTenant(ctx, { targetTenantId: tenantIdOf("A") }),
    () => inviteTenantAdmin(ctx, { targetTenantId: tenantIdOf("A"), email: "forged@example.test", fullName: null }),
    () => revokeTenantAdminInvite(ctx, { targetTenantId: tenantIdOf("A"), membershipId: seeded("A", "membership:WAITER2") }),
    () => getPlatformDashboard(ctx),
    () => listTenantsForPlatform(ctx, {}),
    () => inspectTenant(ctx, tenantIdOf("A")),
    () => checkSlugAvailability(ctx, { slug: "spice-route" }),
  ];

  it("a TenantContext smuggled past the type system and a platform context without permissions are both refused", async () => {
    const before = await snapshot();
    await asSeedUser("A", "TENANT_ADMIN");
    const tenantCtx = (await requireTenant("restaurant:read")) as unknown as PlatformContext;
    const empty = { kind: "platform", requestId: "forged", userId: seeded("A", "user:TENANT_ADMIN"), permissions: new Set() } as unknown as PlatformContext;
    for (const ctx of [tenantCtx, empty]) {
      for (const call of calls(ctx)) await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(await snapshot()).toEqual(before);
    expect(clerkCalls()).toEqual([]);
  });

  it("each mutation needs its own permission: platform:tenant:read alone cannot change anything", async () => {
    await asPlatformAdmin();
    const full = await requirePlatform("platform:tenant:read");
    const readOnly = { ...full, permissions: new Set(["platform:tenant:read"]) } as PlatformContext;
    const before = await snapshot();
    const [create, update, suspend, reactivate, invite, revoke] = calls(readOnly);
    for (const call of [create, update, suspend, reactivate, invite, revoke]) await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await snapshot()).toEqual(before);
    expect(clerkCalls()).toEqual([]);
  });

  it("platform services cannot be called with a TenantContext (type check, enforced by tsc)", () => {
    const typeChecks = (tenantCtx: TenantContext) => [
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => createTenant(tenantCtx, { ...newTenantInput(), adminFullName: null }),
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => updateTenant(tenantCtx, { targetTenantId: RANDOM_UUID, name: "x" }),
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => suspendTenant(tenantCtx, { targetTenantId: RANDOM_UUID, reason: REASON }),
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => reactivateTenant(tenantCtx, { targetTenantId: RANDOM_UUID }),
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => inviteTenantAdmin(tenantCtx, { targetTenantId: RANDOM_UUID, email: "x@example.test", fullName: null }),
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => revokeTenantAdminInvite(tenantCtx, { targetTenantId: RANDOM_UUID, membershipId: RANDOM_UUID }),
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => getPlatformDashboard(tenantCtx),
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => listTenantsForPlatform(tenantCtx, {}),
      // @ts-expect-error — a TenantContext is not a PlatformContext
      () => inspectTenant(tenantCtx, RANDOM_UUID),
    ];
    expect(typeof typeChecks).toBe("function");
  });
});
