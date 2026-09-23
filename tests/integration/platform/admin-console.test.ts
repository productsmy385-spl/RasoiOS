import { existsSync } from "node:fs";
import path from "node:path";
import { isValidElement } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import AdminLayout from "@/app/admin/layout";
import AdminPage from "@/app/admin/page";
import AdminAuditPage from "@/app/admin/audit/page";
import AdminTenantsPage from "@/app/admin/tenants/page";
import NewTenantPage from "@/app/admin/tenants/new/page";
import TenantDetailPage from "@/app/admin/tenants/[tenantId]/page";
import type { PlatformContext } from "@/lib/auth/context-types";
import { requirePlatform, requireTenant } from "@/lib/auth/guards";
import { getPlatformDashboard, inspectTenant, listTenantsForPlatform } from "@/lib/services/platform-tenants";
import { TENANT_ROLES } from "@/prisma/seed-data/tenants";
import { testDb } from "../setup/db";
import { SEED_TENANTS, asAnonymous, asPlatformAdmin, asSeedUser, asUninvited, invokeLoader, seedOnce, staffEmail, tenantIdOf } from "../helpers/actors";

// S1-P04-T008 BA-03 (platform console guarded) and BA-01 (print poll removed): TC-SEC-018, TC-RBAC-101, ADV-006, TI-061.
const db = testDb();
const root = path.resolve(__dirname, "../../..");

beforeAll(seedOnce, 120_000);
afterEach(async () => {
  await db.tenant.updateMany({ data: { status: "ACTIVE", suspendedAt: null, suspensionReason: null } });
});

const renderAdminLayout = () => AdminLayout({ children: null });
const noParams = { searchParams: Promise.resolve({}) };
const detailOf = (tenantId: string) => TenantDetailPage({ params: Promise.resolve({ tenantId }), searchParams: Promise.resolve({}) });

/** Every key path in a JSON value, with array indexes collapsed to `[]`. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => keyPaths(item, `${prefix}[]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [`${prefix}.${key}`, ...keyPaths(child, `${prefix}.${key}`)]);
  }
  return [];
}

async function platformCtx(): Promise<PlatformContext> {
  await asPlatformAdmin();
  return requirePlatform("platform:tenant:read");
}

describe("TC-RBAC-101 SUPER_ADMIN reads the platform console", () => {
  it("lists both seeded tenants with counts from the database", async () => {
    const ctx = await platformCtx();
    const { items } = await listTenantsForPlatform(ctx, { limit: 100 });
    expect(items.map((t) => t.slug).sort()).toEqual(["harbour-grill", "spice-route"]);
    expect(items.find((t) => t.slug === "spice-route")).toMatchObject({ id: tenantIdOf("A"), name: "Spice Route", status: "ACTIVE", websitePublished: true });
    expect(items.find((t) => t.slug === "harbour-grill")).toMatchObject({ id: tenantIdOf("B"), websitePublished: false });
    for (const tenant of items) {
      expect(tenant.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(tenant.memberCount).toBe(await db.userTenant.count({ where: { tenantId: tenant.id, status: "ACTIVE" } }));
    }
    expect(await getPlatformDashboard(ctx)).toMatchObject({ tenantCounts: { active: 2, suspended: 0 } });
  });

  it("reflects a suspension in the counts and the list", async () => {
    const ctx = await platformCtx();
    await db.tenant.update({ where: { id: tenantIdOf("B") }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: "Test suspension" } });
    expect((await getPlatformDashboard(ctx)).tenantCounts).toEqual({ active: 1, suspended: 1 });
    const { items } = await listTenantsForPlatform(ctx, { limit: 100 });
    expect(items.find((t) => t.id === tenantIdOf("B"))?.status).toBe("SUSPENDED");
  });

  it("renders every platform page and the admin layout", async () => {
    await platformCtx();
    for (const [name, page] of [
      ["/admin", () => invokeLoader(AdminPage)],
      ["/admin/tenants", () => invokeLoader(AdminTenantsPage, noParams)],
      ["/admin/tenants/new", () => invokeLoader(NewTenantPage)],
      ["/admin/tenants/[tenantId]", () => invokeLoader(() => detailOf(tenantIdOf("A")))],
      ["/admin/audit", () => invokeLoader(AdminAuditPage, noParams)],
      ["layout", () => invokeLoader(renderAdminLayout)],
    ] as const) {
      expect(isValidElement(await page()), name).toBe(true);
    }
  });
});

describe("platform tenant reads are tenant metadata only (security.md §3.3 rows 1–7)", () => {
  it("the list exposes exactly the documented metadata keys", async () => {
    const { items } = await listTenantsForPlatform(await platformCtx(), { limit: 100 });
    expect([...new Set(keyPaths(items))].sort()).toEqual(
      ["[].createdAt", "[].id", "[].memberCount", "[].name", "[].slug", "[].status", "[].websitePublished"].sort(),
    );
  });

  it("contains no order, customer, transaction or menu data of any tenant", async () => {
    const ctx = await platformCtx();
    const { items } = await listTenantsForPlatform(ctx, { limit: 100 });
    const json = JSON.stringify(items);
    for (const key of keyPaths(items)) expect(key).not.toMatch(/order|customer|transaction|payment|menu|item|gstin|email|phone|user|member(?!Count)/i);

    const order = await db.order.findFirstOrThrow({ where: { tenantId: tenantIdOf("A") } });
    const forbiddenValues = [
      order.id,
      order.orderNumber,
      "Sam Taylor",
      "Priya Nair",
      "+919900000001",
      "Paneer Tikka",
      "Grilled Salmon",
      "29ABCDE1234F1Z5",
      "Thank you for dining with us.",
      staffEmail(SEED_TENANTS.A, "cashier"),
      "hello.spiceroute",
      "+918041234567",
    ];
    for (const value of forbiddenValues) expect(json).not.toContain(value);
  });
});

describe("TC-SEC-018 admin forbidden", () => {
  const pages = [
    ["/admin", () => invokeLoader(AdminPage)],
    ["/admin/tenants", () => invokeLoader(AdminTenantsPage, noParams)],
    ["/admin/tenants/new", () => invokeLoader(NewTenantPage)],
    ["/admin/tenants/[tenantId]", () => invokeLoader(() => detailOf(tenantIdOf("A")))],
    ["/admin/audit", () => invokeLoader(AdminAuditPage, noParams)],
    ["layout", () => invokeLoader(renderAdminLayout)],
  ] as const;

  it("TENANT_ADMIN of Tenant A is redirected to /account/forbidden from every admin page (ADV-006)", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    for (const [name, page] of pages) expect(await page(), name).toEqual({ redirect: "/account/forbidden" });
  });

  it("TC-ADMIN-009 TENANT_ADMIN and MANAGER get no admin page and no tenant list", async () => {
    for (const role of ["TENANT_ADMIN", "MANAGER"] as const) {
      await asSeedUser("A", role);
      for (const [name, page] of pages) {
        const result = await page();
        expect(result, `${role} ${name}`).toEqual({ redirect: "/account/forbidden" });
        // A redirect carries no markup, so no restaurant of any tenant can be in it.
        expect(JSON.stringify(result), `${role} ${name}`).not.toContain("Harbour Grill");
      }
    }
  });

  it("TC-RBAC-101 every tenant role of both tenants is denied platform:tenant:read", async () => {
    for (const tenant of ["A", "B"] as const) {
      for (const role of TENANT_ROLES) {
        await asSeedUser(tenant, role);
        expect(await invokeLoader(AdminPage), `${tenant}/${role}`).toEqual({ redirect: "/account/forbidden" });
        await expect(requirePlatform("platform:tenant:read"), `${tenant}/${role}`).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
      }
    }
  });

  it("signed-out visitors go to /sign-in and uninvited identities to /account/no-access", async () => {
    asAnonymous();
    for (const [name, page] of pages) expect(await page(), name).toEqual({ redirect: "/sign-in" });
    asUninvited();
    expect(await invokeLoader(AdminPage)).toEqual({ redirect: "/account/no-access?reason=NO_ACCOUNT" });
  });

  it("the data functions re-check the platform permission (defence in depth)", async () => {
    const forged = { kind: "platform", requestId: "test", userId: "x", permissions: new Set() } as unknown as PlatformContext;
    await expect(listTenantsForPlatform(forged)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getPlatformDashboard(forged)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(inspectTenant(forged, tenantIdOf("A"))).rejects.toMatchObject({ code: "FORBIDDEN" });

    await asSeedUser("A", "TENANT_ADMIN");
    const tenantCtx = (await requireTenant("restaurant:read")) as unknown as PlatformContext;
    await expect(listTenantsForPlatform(tenantCtx)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("TI-061 SUPER_ADMIN gets no tenant context from the platform role", async () => {
    await asPlatformAdmin();
    await expect(requireTenant("order:read")).rejects.toMatchObject({ code: "NO_ACTIVE_MEMBERSHIP" });
  });
});

describe("TC-SEC-018 print poll removed", () => {
  it("the unauthenticated tenantId print poll route no longer exists (BA-01)", () => {
    expect(existsSync(path.join(root, "app/api/print-jobs/poll/route.ts"))).toBe(false);
    expect(existsSync(path.join(root, "app/api/print-jobs/poll"))).toBe(false);
  });
});
