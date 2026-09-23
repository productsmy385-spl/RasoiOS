import { expect, test } from "@playwright/test";

// TC-AUTH-003 / TC-AUTH-004 against the real middleware and Clerk (S1-P03-T002). Runs once (desktop project).
test.describe("authentication gate", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "request-level checks run once");
  });

  test("TC-AUTH-003 signed-out page request redirects to sign-in with a relative redirect_url", async ({ request }) => {
    const response = await request.get("/restaurant/orders", { maxRedirects: 0 });
    expect([302, 307, 308]).toContain(response.status());
    const location = new URL(response.headers()["location"], "http://placeholder.invalid");
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("redirect_url")).toBe("/restaurant/orders");
    expect(response.headers()["x-request-id"]).toBeTruthy();
  });

  test("TC-AUTH-004 signed-out API request gets 401 UNAUTHENTICATED JSON with a request id", async ({ request }) => {
    const response = await request.get("/api/v1/orders", { headers: { accept: "application/json" } });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.requestId).toBe(response.headers()["x-request-id"]);
  });

  test("keeps a well-formed incoming request id", async ({ request }) => {
    const response = await request.get("/api/v1/orders", { headers: { "x-request-id": "test-request-0001" } });
    expect(response.headers()["x-request-id"]).toBe("test-request-0001");
  });

  test("public routes stay public", async ({ request }) => {
    expect((await request.get("/")).status()).toBe(200);
    expect((await request.get("/sign-in")).status()).toBe(200);
  });
});
