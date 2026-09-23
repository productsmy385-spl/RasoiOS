import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ClerkAdminError, createClerkAdmin, maskEmail } from "@/lib/auth/clerk-admin";

// TC-AUTH-014 (client part) — Clerk Backend API calls are made correctly and failures are typed (S1-P03-T004).
// Clerk is stubbed at the HTTP boundary: the real SDK talks to a local server. The "next request is denied" part
// is covered with staff deactivation in S1-P07-T004.

type Recorded = { method: string; path: string; body: unknown };
let server: Server;
let baseUrl: string;
let recorded: Recorded[] = [];
let respond: (req: Recorded, res: ServerResponse) => void;

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const entry = { method: req.method ?? "", path: req.url ?? "", body: raw ? JSON.parse(raw) : undefined };
      recorded.push(entry);
      respond(entry, res);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections(); // the timeout test leaves a request unanswered
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  recorded = [];
});

const admin = (timeoutMs = 2000) => createClerkAdmin({ apiUrl: baseUrl, secretKey: "sk_test_stubbedsecretkey000000", timeoutMs });

describe("createInvitation", () => {
  it("posts the invitation with a redirect URL and returns its id", async () => {
    respond = (_req, res) => json(res, 200, { object: "invitation", id: "inv_123", email_address: "asha@example.test", status: "pending", created_at: 1, updated_at: 1 });
    const result = await admin().createInvitation("asha@example.test", "https://app.example.test/sign-up");
    expect(result).toEqual({ invitationId: "inv_123" });
    expect(recorded).toHaveLength(1);
    expect(recorded[0].method).toBe("POST");
    expect(recorded[0].path).toBe("/v1/invitations");
    expect(recorded[0].body).toMatchObject({ email_address: "asha@example.test", redirect_url: "https://app.example.test/sign-up", notify: true });
  });

  it("turns a Clerk error into INVITATION_FAILED without leaking details or the full email to logs", async () => {
    const logged: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((line: string) => void logged.push(line));
    respond = (_req, res) => json(res, 500, { errors: [{ code: "internal", message: "boom secret-detail" }] });
    const error = await admin().createInvitation("asha.rao@example.test", "https://app.example.test/sign-up").catch((e: unknown) => e);
    spy.mockRestore();
    expect(error).toBeInstanceOf(ClerkAdminError);
    expect((error as ClerkAdminError).code).toBe("INVITATION_FAILED");
    expect((error as Error).message).not.toMatch(/boom|secret/);
    expect(logged.join("\n")).toContain("a***@example.test");
    expect(logged.join("\n")).not.toContain("asha.rao@example.test");
  });

  it("times out with CLERK_TIMEOUT when Clerk does not answer", async () => {
    respond = () => undefined; // never respond
    const error = await admin(300).createInvitation("slow@example.test", "https://app.example.test/sign-up").catch((e: unknown) => e);
    expect((error as ClerkAdminError).code).toBe("CLERK_TIMEOUT");
    expect((error as ClerkAdminError).statusCode).toBe(503);
  });
});

describe("revokeInvitation", () => {
  it("revokes, and treats an already revoked or missing invitation as done", async () => {
    respond = (req, res) => json(res, 200, { object: "invitation", id: "inv_1", email_address: "x@example.test", status: "revoked", created_at: 1, updated_at: 1 });
    await admin().revokeInvitation("inv_1");
    expect(recorded[0]).toMatchObject({ method: "POST", path: "/v1/invitations/inv_1/revoke" });

    respond = (_req, res) => json(res, 404, { errors: [{ code: "resource_not_found", message: "not found" }] });
    await expect(admin().revokeInvitation("inv_gone")).resolves.toBeUndefined();

    respond = (_req, res) => json(res, 500, { errors: [{ code: "internal", message: "down" }] });
    await expect(admin().revokeInvitation("inv_2")).rejects.toMatchObject({ code: "INVITATION_REVOKE_FAILED" });
  });
});

describe("TC-AUTH-014 revokeUserSessions", () => {
  it("lists the user's active sessions and revokes each one", async () => {
    respond = (req, res) => {
      if (req.method === "GET") {
        json(res, 200, {
          data: [
            { object: "session", id: "sess_1", user_id: "user_a", client_id: "c1", status: "active", last_active_at: 1, expire_at: 2, abandon_at: 3, created_at: 1, updated_at: 1 },
            { object: "session", id: "sess_2", user_id: "user_a", client_id: "c2", status: "active", last_active_at: 1, expire_at: 2, abandon_at: 3, created_at: 1, updated_at: 1 },
          ],
          total_count: 2,
        });
      } else {
        json(res, 200, { object: "session", id: req.path.split("/")[3], user_id: "user_a", client_id: "c", status: "revoked", last_active_at: 1, expire_at: 2, abandon_at: 3, created_at: 1, updated_at: 1 });
      }
    };
    expect(await admin().revokeUserSessions("user_a")).toBe(2);
    const list = new URL(recorded[0].path, "http://x");
    expect(list.pathname).toBe("/v1/sessions");
    expect(list.searchParams.get("user_id")).toBe("user_a");
    expect(list.searchParams.get("status")).toBe("active");
    expect(recorded.slice(1).map((r) => `${r.method} ${r.path}`)).toEqual(["POST /v1/sessions/sess_1/revoke", "POST /v1/sessions/sess_2/revoke"]);
  });

  it("reports SESSION_REVOKE_FAILED when Clerk fails", async () => {
    respond = (_req, res) => json(res, 503, { errors: [{ code: "unavailable", message: "down" }] });
    await expect(admin().revokeUserSessions("user_a")).rejects.toMatchObject({ code: "SESSION_REVOKE_FAILED" });
  });
});

describe("maskEmail", () => {
  it("keeps only the first character and the domain", () => {
    expect(maskEmail("asha.rao@example.com")).toBe("a***@example.com");
    expect(maskEmail("not-an-email")).toBe("***");
  });
});
