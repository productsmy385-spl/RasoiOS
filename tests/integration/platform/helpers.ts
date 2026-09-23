/**
 * Platform console test helpers (S1-P06-T001).
 *
 * Clerk is stubbed at the HTTP boundary: a local server speaks the Clerk Backend API endpoints the app uses
 * (invitations, invitation revocation, session list/revoke), and `clerkAdmin()` is pointed at it by each test file:
 *
 *   vi.mock("@/lib/auth/clerk-admin", async (importOriginal) => {
 *     const { stubbedClerkAdminModule } = await import("./helpers");
 *     return stubbedClerkAdminModule(await importOriginal());
 *   });
 *
 * The real Clerk SDK and lib/auth/clerk-admin.ts run unchanged; the real Clerk API is never called (the stub refuses to
 * hand out a client before it is listening, so a misconfigured test cannot fall back to api.clerk.com).
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type * as ClerkAdminModule from "@/lib/auth/clerk-admin";
import { testDb } from "../setup/db";

export type ClerkRequest = { method: string; path: string; pathname: string; query: URLSearchParams; body: Record<string, unknown> | undefined };

/** Return `true` from an override when it has answered the request; otherwise the default behaviour answers. */
export type ClerkOverride = (req: ClerkRequest, res: ServerResponse) => boolean | Promise<boolean>;

type StubState = {
  server: Server | null;
  url: string;
  timeoutMs: number;
  requests: ClerkRequest[];
  override: ClerkOverride | null;
  invitationCounter: number;
  /** Active Clerk session ids per Clerk user id, served by GET /v1/sessions. */
  sessions: Map<string, string[]>;
};

export const clerkStub: StubState = {
  server: null,
  url: "",
  timeoutMs: 2000,
  requests: [],
  override: null,
  invitationCounter: 0,
  sessions: new Map(),
};

export function json(res: ServerResponse, status: number, body: unknown): true {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
  return true;
}

const invitation = (id: string, email: unknown, status: string) => ({ object: "invitation", id, email_address: email ?? "x@example.test", status, created_at: 1, updated_at: 1 });
const session = (id: string, userId: string, status: string) => ({
  object: "session",
  id,
  user_id: userId,
  client_id: "client_stub",
  status,
  last_active_at: 1,
  expire_at: 2,
  abandon_at: 3,
  created_at: 1,
  updated_at: 1,
});

function defaultResponse(req: ClerkRequest, res: ServerResponse): void {
  const { method, pathname } = req;
  if (method === "POST" && pathname === "/v1/invitations") {
    json(res, 200, invitation(`inv_stub_${++clerkStub.invitationCounter}`, req.body?.email_address, "pending"));
    return;
  }
  const revokeInvitation = pathname.match(/^\/v1\/invitations\/([^/]+)\/revoke$/);
  if (method === "POST" && revokeInvitation) {
    json(res, 200, invitation(revokeInvitation[1], null, "revoked"));
    return;
  }
  if (method === "GET" && pathname === "/v1/sessions") {
    const userId = req.query.get("user_id") ?? "";
    const ids = clerkStub.sessions.get(userId) ?? [];
    json(res, 200, { data: ids.map((id) => session(id, userId, "active")), total_count: ids.length });
    return;
  }
  const revokeSession = pathname.match(/^\/v1\/sessions\/([^/]+)\/revoke$/);
  if (method === "POST" && revokeSession) {
    json(res, 200, session(revokeSession[1], "user_stub", "revoked"));
    return;
  }
  json(res, 404, { errors: [{ code: "resource_not_found", message: "not found" }] });
}

export async function startClerkStub(): Promise<void> {
  if (clerkStub.server) return;
  const server = createServer((incoming: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    incoming.on("data", (chunk) => (raw += chunk));
    incoming.on("end", () => {
      const url = new URL(incoming.url ?? "/", "http://clerk.stub");
      const req: ClerkRequest = {
        method: incoming.method ?? "",
        path: incoming.url ?? "",
        pathname: url.pathname,
        query: url.searchParams,
        body: raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined,
      };
      clerkStub.requests.push(req);
      void (async () => {
        const handled = clerkStub.override ? await clerkStub.override(req, res) : false;
        if (!handled) defaultResponse(req, res);
      })().catch(() => json(res, 500, { errors: [{ code: "stub_error", message: "stub failure" }] }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  clerkStub.server = server;
  clerkStub.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

export async function stopClerkStub(): Promise<void> {
  const server = clerkStub.server;
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  clerkStub.server = null;
  clerkStub.url = "";
}

export function resetClerkStub(): void {
  clerkStub.requests = [];
  clerkStub.override = null;
  clerkStub.sessions = new Map();
  clerkStub.timeoutMs = 2000;
}

/** `clerkAdmin()` replacement: the real wrapper and SDK, talking to the stub. */
export function stubbedClerkAdminModule(actual: typeof ClerkAdminModule): typeof ClerkAdminModule {
  return {
    ...actual,
    clerkAdmin: () => {
      if (!clerkStub.url) throw new Error("Clerk stub is not running: call startClerkStub() in beforeAll");
      return actual.createClerkAdmin({ apiUrl: clerkStub.url, secretKey: "sk_test_stubbedsecretkey000000", timeoutMs: clerkStub.timeoutMs });
    },
  };
}

/** Requests the app sent to Clerk, as `METHOD /path` (query strings dropped). */
export function clerkCalls(): string[] {
  return clerkStub.requests.map((r) => `${r.method} ${r.pathname}`);
}

export const APP_URL = "https://app.rasoios.test";

// ─── Database helpers ───

type XminTable = "tenants" | "restaurants" | "user_tenants" | "users" | "audit_logs";

/** PostgreSQL transaction id that wrote the current version of a row: equal xmin ⇒ written by the same transaction. */
export async function xminOf(table: XminTable, id: string): Promise<string> {
  const db = testDb();
  const rows =
    table === "tenants"
      ? await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM tenants WHERE id = ${id}::uuid`
      : table === "restaurants"
        ? await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM restaurants WHERE id = ${id}::uuid`
        : table === "user_tenants"
          ? await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM user_tenants WHERE id = ${id}::uuid`
          : table === "users"
            ? await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM users WHERE id = ${id}::uuid`
            : await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM audit_logs WHERE id = ${id}::uuid`;
  if (rows.length !== 1) throw new Error(`${table} row ${id} not found`);
  return rows[0].xmin;
}

/** Row counts that must not move when a request is refused. */
export async function platformSnapshot(): Promise<Record<string, number>> {
  const db = testDb();
  const [tenants, restaurants, hours, users, memberships, audits] = await Promise.all([
    db.tenant.count(),
    db.restaurant.count(),
    db.restaurantHours.count(),
    db.user.count(),
    db.userTenant.count(),
    db.auditLog.count(),
  ]);
  return { tenants, restaurants, hours, users, memberships, audits };
}

/** A valid SA-ADM-01 input; override any field. */
export function newTenantInput(overrides: Record<string, unknown> = {}) {
  return {
    tenantName: "Coastal Curry House",
    slug: "coastal-curry",
    restaurantName: "Coastal Curry",
    timezone: "Asia/Kolkata",
    currencyCode: "INR",
    countryCode: "IN",
    adminEmail: "owner.coastal+clerk_test@example.com",
    adminFullName: "Meera Pillai",
    ...overrides,
  };
}
