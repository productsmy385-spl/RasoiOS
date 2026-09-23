import { describe, expect, it } from "vitest";
import { classifyRoute, ensureRequestId, gate } from "@/lib/auth/route-policy";

// TC-AUTH-003 / TC-AUTH-004 — the middleware's decision table (S1-P03-T002). The e2e suite exercises the real
// middleware (tests/e2e/auth-gate.spec.ts).
const rid = "req-12345678";

describe("classifyRoute", () => {
  it.each([
    ["/", "public"],
    ["/r/spice-route", "public"],
    ["/r/spice-route/menu", "public"],
    ["/sign-in", "public"],
    ["/sign-in/factor-one", "public"],
    ["/sign-up", "public"],
    ["/offline", "public"],
    ["/api/health", "public"],
    ["/api/ready", "public"],
    ["/manifest.json", "public"],
    ["/api/webhooks/clerk", "webhook"],
    ["/api/v1/print-agent/jobs/claim", "agent"],
    ["/api/v1/print-agent", "agent"],
    ["/api/v1/orders", "api"],
    ["/api/print-jobs/poll", "api"],
    ["/restaurant/orders", "page"],
    ["/admin", "page"],
    ["/account/no-access", "page"],
  ])("%s is %s", (pathname, kind) => {
    expect(classifyRoute(pathname)).toBe(kind);
  });

  it("does not treat look-alike paths as public", () => {
    expect(classifyRoute("/sign-inx")).toBe("page");
    expect(classifyRoute("/r")).toBe("page");
    expect(classifyRoute("/api/healthz")).toBe("api");
    expect(classifyRoute("/api/webhooks/clerk/extra")).toBe("api");
    expect(classifyRoute("/api/v1/print-agentx")).toBe("api");
  });
});

describe("gate", () => {
  it("TC-AUTH-003 redirects a signed-out page request to sign-in with a relative redirect_url", () => {
    expect(gate("/restaurant/orders", "", false, rid)).toEqual({ action: "redirect", location: "/sign-in?redirect_url=%2Frestaurant%2Forders" });
    expect(gate("/restaurant/orders", "?status=NEW", false, rid)).toEqual({
      action: "redirect",
      location: "/sign-in?redirect_url=%2Frestaurant%2Forders%3Fstatus%3DNEW",
    });
  });

  it("TC-AUTH-004 answers a signed-out API request with 401 UNAUTHENTICATED JSON", () => {
    expect(gate("/api/v1/orders", "", false, rid)).toEqual({
      action: "json",
      status: 401,
      body: { error: { code: "UNAUTHENTICATED", message: "Sign in to continue.", requestId: rid } },
    });
  });

  it("lets public, agent and webhook routes through without a session (they authenticate themselves)", () => {
    for (const path of ["/", "/r/spice-route", "/sign-in", "/api/webhooks/clerk", "/api/v1/print-agent/jobs/claim"]) {
      expect(gate(path, "", false, rid)).toEqual({ action: "next" });
    }
  });

  it("lets signed-in requests through (authorization happens in the handler)", () => {
    expect(gate("/restaurant/orders", "", true, rid)).toEqual({ action: "next" });
    expect(gate("/api/v1/orders", "", true, rid)).toEqual({ action: "next" });
  });
});

describe("ensureRequestId", () => {
  it("keeps a well-formed incoming id and replaces anything else", () => {
    const generate = () => "generated-uuid";
    expect(ensureRequestId("abc12345-railway", generate)).toBe("abc12345-railway");
    expect(ensureRequestId(null, generate)).toBe("generated-uuid");
    expect(ensureRequestId("short", generate)).toBe("generated-uuid");
    expect(ensureRequestId("bad id\r\ninjected: 1", generate)).toBe("generated-uuid");
    expect(ensureRequestId("x".repeat(65), generate)).toBe("generated-uuid");
  });
});
