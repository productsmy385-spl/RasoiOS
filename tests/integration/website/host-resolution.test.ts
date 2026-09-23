import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import PublicRestaurantPage, { generateMetadata } from "@/app/r/[slug]/page";
import { getPublicSite } from "@/lib/services/website-theme";
import { TENANT_SLUG_HEADER, publicRewritePath, resolveHost } from "@/lib/tenancy/hostnames";
import { testDb } from "../setup/db";
import { actorState } from "../helpers/actor-state";
import { asAnonymous, invokeLoader, seedOnce, tenantIdOf, type ControlFlow } from "../helpers/actors";

// TC-WEB-018 — S1-P09-T011, RASOIOS-ADR-012: the host selects the tenant, and every way of failing to resolve one
// produces the same public 404. Host parsing itself is covered by tests/unit/hostnames.test.ts; this file drives the
// resolved loader against real rows.
const db = testDb();
const ROOT = "example.test";

/** What the middleware does for `host` + `path`, as the app then sees it. */
async function requestOn(host: string, path = "/"): Promise<{ slug: string | null; page: unknown }> {
  const resolution = resolveHost(host, ROOT);
  asAnonymous();
  if (resolution.kind === "apex") return { slug: null, page: null };
  const slug = resolution.kind === "tenant" ? resolution.slug : "_";
  actorState.headers.set(TENANT_SLUG_HEADER, resolution.kind === "tenant" ? slug : "");
  const rewritten = publicRewritePath(slug, path);
  expect(rewritten).toBe(`/r/${slug}${path === "/" ? "" : path}`);
  const page = await invokeLoader(PublicRestaurantPage, { params: Promise.resolve({ slug }) });
  return { slug, page };
}

const isNotFound = (value: unknown): boolean => Boolean(value && typeof value === "object" && (value as ControlFlow as { notFound?: true }).notFound === true);

beforeAll(seedOnce, 120_000);

beforeEach(async () => {
  asAnonymous();
  await db.tenant.updateMany({ data: { status: "ACTIVE", suspendedAt: null, suspensionReason: null } });
  await db.restaurant.update({ where: { tenantId: tenantIdOf("A") }, data: { websitePublished: true } });
  await db.restaurant.update({ where: { tenantId: tenantIdOf("B") }, data: { websitePublished: false } });
});

afterEach(() => vi.unstubAllEnvs());

describe("TC-WEB-018 the host selects the tenant", () => {
  it("{slug}.example.test resolves to that tenant's published site", async () => {
    const { slug, page } = await requestOn("spice-route.example.test");
    expect(slug).toBe("spice-route");
    expect(isNotFound(page)).toBe(false);

    const site = await getPublicSite("spice-route");
    expect(site.restaurant.name).toBe("Spice Route");
    // The theme really is this tenant's own (seeded CUSTOM/DARK), not the platform default.
    expect(site.theme).toMatchObject({ preset: "CUSTOM", surfaceMode: "DARK", primary: "#FF7A1A" });
    expect(site.cssVariables["--site-primary"]).toBe("#FF7A1A");
    expect(site.sections.map((s) => s.key)[0]).toBe("HERO");
    expect(site.sections.some((s) => s.key === "GALLERY")).toBe(false);
  });

  it("the same site is served from {slug}.localhost with no PUBLIC_ROOT_DOMAIN configured", () => {
    expect(resolveHost("spice-route.localhost:3000", null)).toEqual({ kind: "tenant", slug: "spice-route" });
    expect(publicRewritePath("spice-route", "/")).toBe("/r/spice-route");
  });

  it("an unknown slug, a reserved label, a malformed label, an unpublished site and a suspended tenant are all the same 404", async () => {
    const responses: unknown[] = [];

    // Unknown slug on a tenant host.
    responses.push((await requestOn("no-such-restaurant.example.test")).page);
    // A malformed label never becomes a slug: the middleware rewrites it to the unresolvable public path.
    responses.push((await requestOn("bad_slug.example.test")).page);
    responses.push((await requestOn("a.b.example.test")).page);
    // Tenant B exists and is ACTIVE but its website is not published.
    responses.push((await requestOn("harbour-grill.example.test")).page);
    // Tenant A suspended by the platform.
    await db.tenant.update({ where: { id: tenantIdOf("A") }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: "Integration test" } });
    responses.push((await requestOn("spice-route.example.test")).page);

    for (const response of responses) expect(isNotFound(response)).toBe(true);
    // Every one of them is the identical value — nothing distinguishes "absent" from "hidden" (ADR-012 §7).
    expect(new Set(responses.map((r) => JSON.stringify(r))).size).toBe(1);
  });

  it("a reserved label is never a tenant: it stays on the apex host", async () => {
    for (const label of ["admin", "api", "www", "app", "static", "mail"]) {
      expect(resolveHost(`${label}.example.test`, ROOT), label).toEqual({ kind: "apex" });
      expect((await requestOn(`${label}.example.test`)).slug, label).toBeNull();
    }
  });

  it("a forged slug header cannot mix one host with another tenant's page", async () => {
    asAnonymous();
    // The header says Tenant A, the path says Tenant B: the page refuses rather than serving either.
    actorState.headers.set(TENANT_SLUG_HEADER, "spice-route");
    const page = await invokeLoader(PublicRestaurantPage, { params: Promise.resolve({ slug: "harbour-grill" }) });
    expect(isNotFound(page)).toBe(true);

    // A header that is not a usable slug is ignored, and the path form keeps working on the apex host.
    actorState.headers.set(TENANT_SLUG_HEADER, "admin");
    expect(isNotFound(await invokeLoader(PublicRestaurantPage, { params: Promise.resolve({ slug: "spice-route" }) }))).toBe(false);
  });
});

describe("TC-WEB-018 canonical address", () => {
  it("points the path form at the sub-domain when PUBLIC_ROOT_DOMAIN is set", async () => {
    asAnonymous();
    vi.stubEnv("PUBLIC_ROOT_DOMAIN", ROOT);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "spice-route" }) });
    expect(metadata.alternates?.canonical).toBe("https://spice-route.example.test/");
    expect(metadata.title).toBe("Spice Route — Menu");
  });

  it("emits no canonical link when PUBLIC_ROOT_DOMAIN is unset, and nothing crashes", async () => {
    asAnonymous();
    vi.stubEnv("PUBLIC_ROOT_DOMAIN", "");
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "spice-route" }) });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.title).toBe("Spice Route — Menu");
  });

  it("a slug that resolves to nothing gets neutral metadata, never a hint that the tenant exists", async () => {
    asAnonymous();
    vi.stubEnv("PUBLIC_ROOT_DOMAIN", ROOT);
    for (const slug of ["no-such-restaurant", "harbour-grill", "_", "bad_slug"]) {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
      expect(metadata, slug).toEqual({ title: "Restaurant not found" });
    }
  });
});
