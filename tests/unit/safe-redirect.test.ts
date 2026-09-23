import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/ui/safe-redirect";

// TC-AUTH-012 — post-sign-in redirect accepts same-origin relative paths only (S1-P03-T005, SC-AUTH-11).
const FALLBACK = "/sign-in/landing";

describe("TC-AUTH-012 safeRedirect", () => {
  it("accepts same-origin relative paths, keeping query and hash", () => {
    expect(safeRedirect("/restaurant/orders", FALLBACK)).toBe("/restaurant/orders");
    expect(safeRedirect("/restaurant/orders?status=NEW#top", FALLBACK)).toBe("/restaurant/orders?status=NEW#top");
    expect(safeRedirect("/admin/tenants", FALLBACK)).toBe("/admin/tenants");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeRedirect("https://evil.test", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("http://evil.test/restaurant", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("//evil.test", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("//evil.test/restaurant/orders", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects backslash tricks that browsers treat as another host", () => {
    expect(safeRedirect("/\\evil", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/\\/evil.test", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("\\\\evil.test", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects script URLs, control characters, whitespace and non-strings", () => {
    expect(safeRedirect("javascript:alert(1)", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/restaurant\n/orders", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/\t/evil.test", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect(" /restaurant", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect(["/restaurant"], FALLBACK)).toBe(FALLBACK);
  });

  it("does not send users back into the sign-in or sign-up flow, or to API routes", () => {
    expect(safeRedirect("/sign-in", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/sign-in/factor-one", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/sign-up?__clerk_ticket=x", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/api/v1/orders", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/restaurant/../sign-in", FALLBACK)).toBe(FALLBACK);
    // Look-alike paths are fine.
    expect(safeRedirect("/sign-installer", FALLBACK)).toBe("/sign-installer");
  });
});
