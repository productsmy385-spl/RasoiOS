import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import robots, { PRIVATE_PATHS } from "@/app/robots";
import sitemap from "@/app/sitemap";
import { classifyRoute } from "@/lib/auth/route-policy";
import { testDb } from "../setup/db";
import { seedOnce, tenantIdOf } from "../helpers/actors";

/**
 * TC-WEB-008 — the sitemap lists only published, ACTIVE restaurants, and robots keeps crawlers out of the console
 * (S1-P09-T005, api.md LD-PUB-03).
 */
const db = testDb();

beforeAll(seedOnce, 120_000);

beforeEach(async () => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.test");
  vi.stubEnv("PUBLIC_ROOT_DOMAIN", "");
  await db.tenant.updateMany({ data: { status: "ACTIVE", suspendedAt: null, suspensionReason: null } });
  await db.restaurant.update({ where: { tenantId: tenantIdOf("A") }, data: { websitePublished: true } });
  await db.restaurant.update({ where: { tenantId: tenantIdOf("B") }, data: { websitePublished: false } });
});

const urls = async () => (await sitemap()).map((entry) => entry.url);

describe("TC-WEB-008 sitemap", () => {
  it("lists a published ACTIVE restaurant and nothing else", async () => {
    expect(await urls()).toEqual(["https://app.example.test/r/spice-route", "https://app.example.test/r/spice-route/daily"]);
  });

  it("adds a restaurant when its website is published and drops it when the tenant is suspended", async () => {
    await db.restaurant.update({ where: { tenantId: tenantIdOf("B") }, data: { websitePublished: true } });
    expect(await urls()).toContain("https://app.example.test/r/harbour-grill");

    await db.tenant.update({ where: { id: tenantIdOf("B") }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: "Test" } });
    expect(await urls()).not.toContain("https://app.example.test/r/harbour-grill");
  });

  it("uses the canonical sub-domain when PUBLIC_ROOT_DOMAIN is configured (ADR-012 §2)", async () => {
    vi.stubEnv("PUBLIC_ROOT_DOMAIN", "example.test");
    expect(await urls()).toEqual(["https://spice-route.example.test", "https://spice-route.example.test/daily"]);
  });

  it("never lists a console, admin, account or API route", async () => {
    await db.restaurant.updateMany({ data: { websitePublished: true } });
    for (const url of await urls()) {
      for (const priv of PRIVATE_PATHS) expect(url, url).not.toContain(priv);
    }
  });
});

describe("TC-WEB-008 robots", () => {
  it("disallows the private paths and points at the sitemap", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(["/restaurant", "/admin", "/account", "/api"]);
    expect(result.sitemap).toBe("https://app.example.test/sitemap.xml");
  });

  it("every disallowed path is one the middleware also refuses to anyone signed out", () => {
    for (const path of PRIVATE_PATHS) {
      if (path === "/api") continue; // API routes answer 401 JSON rather than redirecting.
      expect(classifyRoute(path), path).toBe("page");
    }
    // …and the sitemap itself stays reachable without a session.
    expect(classifyRoute("/sitemap.xml")).toBe("public");
    expect(classifyRoute("/robots.txt")).toBe("public");
  });
});
