import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "@/app/admin/page";
import AdminAuditPage from "@/app/admin/audit/page";
import AdminTenantsPage from "@/app/admin/tenants/page";
import TenantDetailPage from "@/app/admin/tenants/[tenantId]/page";
import { createTenantAction, suspendTenantAction } from "@/app/admin/actions";
import { TenantMembers } from "@/components/admin/tenant-members";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { DataTable } from "@/components/ui/data-table";
import { DescriptionList, type DescriptionItem } from "@/components/ui/description-list";
import { Pagination } from "@/components/ui/pagination";
import type { PlatformContext } from "@/lib/auth/context-types";
import { requirePlatform, requireTenantPage } from "@/lib/auth/guards";
import type { TenantMemberRow } from "@/lib/data/platform-tenants";
import { inspectTenant } from "@/lib/services/platform-tenants";
import { testDb } from "../setup/db";
import { asPlatformAdmin, asSeedUser, invokeAction, invokeLoader, seedOnce, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf } from "../orders/helpers";
import { APP_URL, newTenantInput, resetClerkStub, startClerkStub, stopClerkStub } from "./helpers";

vi.mock("@/lib/auth/clerk-admin", async (importOriginal) => {
  const { stubbedClerkAdminModule } = await import("./helpers");
  return stubbedClerkAdminModule(await importOriginal());
});

/**
 * The Super Admin console pages (S1-P06-T003…T007): TC-ADMIN-001 (dashboard), TC-ADMIN-002 (list, filters,
 * pagination), TC-ADMIN-006 (inspection is metadata only), TC-ADMIN-008 (platform audit), TC-ADMIN-010 (create) and
 * TC-ADMIN-011 (a suspension reaching the restaurant's staff).
 *
 * The pages are Server Components, so each is rendered through `invokeLoader` and asserted on the element tree it
 * returns — the rows it hands its table, the empty state it would show and the words a person would read. Client
 * components are not rendered here, so what they receive is asserted on their props instead.
 */
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

const A = tenantIdOf("A");
const B = tenantIdOf("B");

const listPage = (params: Record<string, string> = {}) => invokeLoader(AdminTenantsPage, { searchParams: Promise.resolve(params) });
const auditPage = (params: Record<string, string> = {}) => invokeLoader(AdminAuditPage, { searchParams: Promise.resolve(params) });
const detailPage = (tenantId: string, params: Record<string, string> = {}) =>
  invokeLoader(() => TenantDetailPage({ params: Promise.resolve({ tenantId }), searchParams: Promise.resolve(params) }));

/** The props of the first element of `type` in a rendered tree. */
function propsOf<P>(node: ReactNode, type: unknown): P | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = propsOf<P>(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) return element.props as P;
  return propsOf<P>(element.props.children, type);
}

/**
 * Everything a person would read. Child components are not rendered, so their props carry their words: an element is
 * read through `props`, and a plain object (a table row, an audit entry) through its own values.
 */
function textOf(node: unknown, depth = 0): string {
  if (depth > 12) return "";
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "function" || typeof node === "symbol") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((child) => textOf(child, depth + 1)).join(" ");
  if (typeof node !== "object") return "";
  const props = (node as { props?: Record<string, unknown> }).props;
  return Object.values(props ?? (node as Record<string, unknown>))
    .map((child) => textOf(child, depth + 1))
    .join(" ");
}

type TableProps = { rows: Array<{ id: string; name: string; slug: string; status: string }>; empty: ReactNode };
const tableOf = (page: unknown) => propsOf<TableProps>(page as ReactNode, DataTable)!;

/** Every key path in a JSON value, with array indexes collapsed to `[]`. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => keyPaths(item, `${prefix}[]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, child]) => [`${prefix}.${k}`, ...keyPaths(child, `${prefix}.${k}`)]);
  return [];
}

describe("TC-ADMIN-001 platform dashboard", () => {
  it("shows the seeded restaurants, the status tiles and the platform trail", async () => {
    await asPlatformAdmin();
    const page = await invokeLoader(AdminPage);
    const text = textOf(page);

    expect(text).toContain("Active restaurants");
    expect(text).toContain("Suspended");
    expect(text).toContain("Recent platform activity");

    const table = tableOf(page);
    expect(table.rows.map((row) => row.id).sort()).toEqual([A, B].sort());
    expect(text).toContain("Spice Route");
  });

  it("would offer the create action instead of an empty table when there are no restaurants", async () => {
    await asPlatformAdmin();
    const state = propsOf<{ title: string; action?: { href: string; label: string } }>(tableOf(await invokeLoader(AdminPage)).empty, EmptyState)!;
    expect(state.title).toBe("No restaurants yet");
    expect(state.action).toEqual({ href: "/admin/tenants/new", label: "Create restaurant" });
  });

  it("carries no fabricated platform health claim (BA-30)", async () => {
    await asPlatformAdmin();
    expect(textOf(await invokeLoader(AdminPage))).not.toMatch(/operational|uptime|all systems/i);
  });
});

describe("TC-ADMIN-002 tenant list", () => {
  const bulk = Array.from({ length: 30 }, (_, index) => ({
    name: `Bulk Kitchen ${String(index).padStart(2, "0")}`,
    slug: `bulk-kitchen-${String(index).padStart(2, "0")}`,
    status: index % 2 === 0 ? ("ACTIVE" as const) : ("SUSPENDED" as const),
  }));
  const suspendedCount = bulk.filter((tenant) => tenant.status === "SUSPENDED").length;

  beforeAll(async () => {
    await db.tenant.createMany({ data: bulk });
  });
  afterAll(async () => {
    await db.tenant.deleteMany({ where: { slug: { startsWith: "bulk-kitchen-" } } });
  });

  it("the dashboard tiles follow the database", async () => {
    await asPlatformAdmin();
    const text = textOf(await invokeLoader(AdminPage));
    const [active, suspended] = await Promise.all([db.tenant.count({ where: { status: "ACTIVE" } }), db.tenant.count({ where: { status: "SUSPENDED" } })]);
    expect(active).toBe(bulk.length - suspendedCount + 2);
    expect(suspended).toBe(suspendedCount);
    expect(text).toContain(String(active));
    expect(text).toContain(String(suspended));
  });

  it("searches by name and by address, and filters by status", async () => {
    await asPlatformAdmin();
    expect(tableOf(await listPage({ q: "Spice" })).rows.map((row) => row.name)).toEqual(["Spice Route"]);
    expect(tableOf(await listPage({ q: "harbour-grill" })).rows.map((row) => row.id)).toEqual([B]);

    const suspended = tableOf(await listPage({ status: "SUSPENDED", limit: "100" }));
    expect(suspended.rows).toHaveLength(suspendedCount);
    expect(suspended.rows.every((row) => row.status === "SUSPENDED")).toBe(true);
  });

  it("pages through more than 25 restaurants without repeating or skipping one", async () => {
    await asPlatformAdmin();
    const first = await listPage();
    const firstRows = tableOf(first).rows;
    expect(firstRows).toHaveLength(25);

    const cursor = propsOf<{ nextCursor: string | null }>(first as ReactNode, Pagination)?.nextCursor;
    expect(cursor).toBeTruthy();

    const secondRows = tableOf(await listPage({ cursor: cursor! })).rows;
    const ids = [...firstRows, ...secondRows].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(bulk.length + 2);
  });

  it("offers a way back when the filters match nothing, and refuses a tampered cursor without leaking anything", async () => {
    await asPlatformAdmin();
    const none = tableOf(await listPage({ q: "no-such-restaurant" }));
    expect(none.rows).toEqual([]);
    expect(propsOf<{ title: string }>(none.empty, EmptyState)!.title).toBe("No restaurants match these filters");

    // ErrorState is a client component, so what the page decided to tell the reader is on its props.
    const page = await listPage({ cursor: "not-a-cursor" });
    const error = propsOf<{ message: string; requestId?: string | null }>(page as ReactNode, ErrorState)!;
    expect(error.message).toContain("This page link is no longer valid");
    expect(error.requestId).toBeTruthy();
    const text = textOf(page);
    expect(text).toContain("Start from the first page");
    expect(text).not.toContain("Spice Route");
  });
});

describe("TC-ADMIN-006 tenant inspection is metadata only", () => {
  it("returns counts and members, never an order, customer, transaction or menu row", async () => {
    await asPlatformAdmin();
    const ctx = await requirePlatform("platform:tenant:read");
    const inspection = await inspectTenant(ctx, A);

    expect(inspection.counts.menuItems).toBe(await db.menuItem.count({ where: { tenantId: A, archivedAt: null } }));
    expect(inspection.members.length).toBeGreaterThan(0);
    for (const key of new Set(keyPaths(inspection))) expect(key).not.toMatch(/\.order(?!sLast30Days)|customer|transaction|payment|gstin/i);

    const order = await db.order.findFirstOrThrow({ where: { tenantId: A } });
    const json = JSON.stringify(inspection);
    for (const value of [order.id, order.orderNumber, "Paneer Tikka", "29ABCDE1234F1Z5", "Thank you for dining with us."]) {
      expect(json).not.toContain(value);
    }
  });

  it("renders the restaurant, hands its people to the members table and says what the console cannot see", async () => {
    await asPlatformAdmin();
    const page = await detailPage(A);
    const text = textOf(page);
    expect(text).toContain("Spice Route");
    expect(text).toContain("Lifecycle history");
    expect(text).toContain("cannot open this restaurant");

    const details = propsOf<{ items: DescriptionItem[] }>(page as ReactNode, DescriptionList)!.items;
    expect(details.find((item) => item.term === "Time zone")?.value).toBe("Asia/Kolkata");
    expect(details.find((item) => item.term === "Currency")?.value).toBe("INR");

    const members = propsOf<{ members: TenantMemberRow[]; canInvite: boolean }>(page as ReactNode, TenantMembers)!;
    expect(members.canInvite).toBe(true);
    expect(members.members.some((member) => member.role === "TENANT_ADMIN")).toBe(true);
  });

  it("an unknown id and a malformed one both render not-found", async () => {
    await asPlatformAdmin();
    expect(await detailPage("00000000-0000-4000-8000-000000000000")).toEqual({ notFound: true });
    expect(await detailPage("not-a-uuid")).toEqual({ notFound: true });
  });

  it("every inspection is recorded", async () => {
    await asPlatformAdmin();
    const before = await db.auditLog.count({ where: { action: "platform.tenant_inspected", tenantId: B } });
    await detailPage(B);
    expect(await db.auditLog.count({ where: { action: "platform.tenant_inspected", tenantId: B } })).toBe(before + 1);
  });
});

describe("TC-ADMIN-008 platform audit", () => {
  it("shows tenant lifecycle and platform rows and never a restaurant's operational events", async () => {
    await asPlatformAdmin();
    await detailPage(A);
    const text = textOf(await auditPage());
    expect(text).toContain("Platform audit");
    expect(text).toContain("platform.tenant_inspected");

    // Tenant A really does have operational rows; none of them reach this page.
    expect(await db.auditLog.count({ where: { tenantId: A, action: "order.created" } })).toBeGreaterThan(0);
    expect(text).not.toContain("order.created");
  });

  it("filters by restaurant and answers an empty filter honestly", async () => {
    await asPlatformAdmin();
    await detailPage(A);
    const forA = textOf(await auditPage({ tenant: A }));
    expect(forA).toContain("Spice Route");

    expect(textOf(await auditPage({ from: "2099-01-01" }))).toContain("No platform events for these filters");
  });
});

describe("TC-ADMIN-010 create restaurant", () => {
  it("creates it, lands on its page with the invitation confirmed, and refuses a duplicate address on the field", async () => {
    await asPlatformAdmin();
    const created = dataOf(await invokeAction(createTenantAction, newTenantInput({ slug: "ferry-road-cafe", adminEmail: "owner.ferry+clerk_test@example.com" })));
    expect(created).toMatchObject({ slug: "ferry-road-cafe", invitation: { status: "SENT" } });

    const text = textOf(await detailPage(created.tenantId, { created: "1", invitation: "sent" }));
    expect(text).toContain("Restaurant created");
    expect(text).toContain("owner.ferry+clerk_test@example.com");
    expect(text).toContain("Provisioning");

    const duplicate = errorOf(await invokeAction(createTenantAction, newTenantInput({ slug: "ferry-road-cafe", adminEmail: "someone.else+clerk_test@example.com" })));
    expect(duplicate).toMatchObject({ code: "SLUG_TAKEN", fieldErrors: { slug: ["This slug is already in use"] } });
  });
});

describe("TC-ADMIN-011 suspension reaches the restaurant", () => {
  afterAll(async () => {
    await db.tenant.updateMany({ where: { id: B }, data: { status: "ACTIVE", suspendedAt: null, suspensionReason: null } });
  });

  it("suspending with a reason shows it on the restaurant's page and sends its staff to the suspended page", async () => {
    await asPlatformAdmin();
    expect(dataOf(await invokeAction(suspendTenantAction, { targetTenantId: B, reason: "Hardware returned; account paused pending handover." }))).toMatchObject({
      status: "SUSPENDED",
    });

    expect(textOf(await detailPage(B))).toContain("Hardware returned; account paused pending handover.");

    await asSeedUser("B", "CASHIER");
    expect(await invokeLoader(() => requireTenantPage("order:read"))).toEqual({ redirect: "/account/suspended" });

    // The other restaurant is untouched.
    await asSeedUser("A", "CASHIER");
    const ctxA = await invokeLoader(() => requireTenantPage("order:read"));
    expect((ctxA as { tenantId?: string }).tenantId).toBe(A);
  });

  it("a suspended restaurant is still readable in the console, with its reason", async () => {
    await asPlatformAdmin();
    const ctx = (await requirePlatform("platform:tenant:read")) as PlatformContext;
    expect((await inspectTenant(ctx, B)).tenant).toMatchObject({ status: "SUSPENDED", suspensionReason: "Hardware returned; account paused pending handover." });
  });
});
