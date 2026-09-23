import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import PublicRestaurantPage from "@/app/r/[slug]/page";
import DailyMenuPage from "@/app/r/[slug]/daily/page";
import { channels } from "@/components/public/theme";
import { freezeTime, testDb } from "../setup/db";
import { SEED_NOW, asAnonymous, invokeLoader, seedOnce, seeded, tenantIdOf } from "../helpers/actors";

/**
 * TC-WEB-020 — two tenants must not render the same document (S1-P09-T012).
 *
 * The seed gives Tenant A a CUSTOM warm palette on a dark site with "most ordered" on and the gallery off, and
 * Tenant B the OCEAN preset on a light site with a different section list. Rendering both pages and comparing the
 * markup is the only way to prove the theme and the section list really come from tenant data rather than from a
 * default the code fell back to.
 */
const db = testDb();

const pageFor = (slug: string) => invokeLoader(PublicRestaurantPage, { params: Promise.resolve({ slug }) });
const dailyFor = (slug: string) => invokeLoader(DailyMenuPage, { params: Promise.resolve({ slug }) });

async function markup(slug: string): Promise<string> {
  const element = await pageFor(slug);
  expect(element, slug).not.toEqual({ notFound: true });
  return renderToStaticMarkup(element as ReactElement);
}

type SectionRow = Awaited<ReturnType<typeof db.websiteSection.findMany>>[number];
type HoursRow = Awaited<ReturnType<typeof db.restaurantHours.findMany>>[number];

let seededSections: SectionRow[] = [];
let seededHours: HoursRow[] = [];

beforeAll(async () => {
  await seedOnce();
  seededSections = await db.websiteSection.findMany();
  seededHours = await db.restaurantHours.findMany();
}, 120_000);

let unfreeze: (() => void) | null = null;

/** Both websites back to exactly what the seed produced, so each test starts from the same two documents. */
beforeEach(async () => {
  asAnonymous();
  await db.tenant.updateMany({ data: { status: "ACTIVE", suspendedAt: null, suspensionReason: null } });
  await db.restaurant.updateMany({ data: { websitePublished: true, showPhone: true, showEmail: true, showAddress: true } });
  await db.menuCategory.updateMany({ data: { isPublished: true, archivedAt: null } });
  await db.menuItem.updateMany({ data: { isPublished: true, archivedAt: null, isAvailable: true } });
  await db.dailyMenu.updateMany({ where: { id: { in: [seeded("A", "daily:today"), seeded("B", "daily:today")] } }, data: { status: "PUBLISHED" } });
  await db.websiteSection.deleteMany({});
  await db.websiteSection.createMany({ data: seededSections });
  await db.restaurantHours.deleteMany({});
  await db.restaurantHours.createMany({ data: seededHours });
  unfreeze = freezeTime(SEED_NOW.toISOString());
});

afterEach(() => {
  unfreeze?.();
  unfreeze = null;
});

describe("TC-WEB-020 two tenants render different documents", () => {
  it("each site carries its own theme, surface mode, headings and menu", async () => {
    const [a, b] = await Promise.all([markup("spice-route"), markup("harbour-grill")]);
    expect(a).not.toEqual(b);

    // Theme: Tenant A's CUSTOM palette on a dark surface, Tenant B's OCEAN preset on a light one.
    expect(a).toContain("data-theme=\"dark\"");
    expect(b).toContain("data-theme=\"light\"");
    expect(a).toContain("--site-primary:#FF7A1A");
    expect(a).toContain(`--primary:${channels("#FF7A1A")}`);
    expect(b).not.toContain("#FF7A1A");
    expect(a).not.toContain(b.match(/--site-primary:(#[0-9A-F]{6})/)![1]);

    // Copy: each restaurant's own section headings, in its own order.
    expect(a).toContain("Chef&#x27;s picks");
    expect(a).toContain("Most ordered this week");
    expect(a).toContain("Find us on MG Road");
    expect(b).toContain("The room");
    expect(b).toContain("Before you come");
    for (const aOnly of ["Chef&#x27;s picks", "Most ordered this week", "Find us on MG Road"]) expect(b, aOnly).not.toContain(aOnly);
    for (const bOnly of ["The room", "Before you come"]) expect(a, bOnly).not.toContain(bOnly);

    // Menu: no dish, price or currency of the other restaurant appears.
    expect(a).toContain("Paneer Tikka");
    expect(b).toContain("Clam Chowder");
    expect(a).not.toContain("Clam Chowder");
    expect(b).not.toContain("Paneer Tikka");
  });

  it("the sections appear in the restaurant's stored order, and a disabled section is absent", async () => {
    const a = await markup("spice-route");
    // Tenant A: hero, featured menu, most ordered, about, full menu, hours, location, contact, CTA.
    const order = ["id=\"top\"", "id=\"today\"", "id=\"popular\"", "id=\"about\"", "id=\"menu\"", "id=\"hours\"", "id=\"location\"", "id=\"contact\"", "id=\"visit\""];
    const positions = order.map((anchor) => a.indexOf(anchor));
    for (const [index, position] of positions.entries()) expect(position, order[index]).toBeGreaterThan(-1);
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
    // INFO and GALLERY are disabled for Tenant A.
    expect(a).not.toContain("id=\"gallery\"");
    expect(a).not.toContain("id=\"info\"");

    const b = await markup("harbour-grill");
    // Tenant B has no featured menu, no popular items and no CTA, but does have "Before you come".
    expect(b).toContain("id=\"info\"");
    expect(b).not.toContain("id=\"today\"");
    expect(b).not.toContain("id=\"popular\"");
    expect(b).not.toContain("id=\"visit\"");
  });

  it("SC-VAL-03 tenant copy is rendered as text, never as markup", async () => {
    const injected = "<img src=x onerror=alert(1)> & \"quoted\" <script>alert(2)</script>";
    await db.websiteSection.updateMany({ where: { tenantId: tenantIdOf("A"), key: "ABOUT" }, data: { headline: injected, body: injected } });

    const a = await markup("spice-route");
    expect(a).not.toContain("<img src=x");
    expect(a).not.toContain("<script>alert(2)</script>");
    expect(a).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(a).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
  });

  it("the theme is set on the page root only, so it can never reach the console or another tenant", async () => {
    const a = await markup("spice-route");
    const roots = a.match(/data-site-slug="[a-z-]+"/g) ?? [];
    expect(roots).toEqual(["data-site-slug=\"spice-route\""]);
    // Every tenant colour lives in one style attribute, on that one element.
    const styles = a.match(/style="[^"]*--site-primary[^"]*"/g) ?? [];
    expect(styles).toHaveLength(1);
    expect(a.indexOf("--site-primary")).toBeGreaterThan(a.indexOf("data-site-slug"));
  });
});

describe("TC-WEB-001 the site shows this restaurant's menu, prices and state", () => {
  it("renders the hero, today's menu, categories and INR prices, and labels an unavailable dish", async () => {
    await db.menuItem.update({ where: { id: seeded("A", "item:dal-makhani") }, data: { isAvailable: false } });
    const a = await markup("spice-route");

    expect(a).toContain("Spice Route");
    expect(a).toContain("Clay-oven cooking from both coasts");
    expect(a).toContain("Today&#x27;s specials");
    expect(a).toContain("Starters");
    expect(a).toContain("₹280.00");
    expect(a).toContain("₹160.00"); // "from" price of the cheaper Paneer Tikka variant
    expect(a).toContain("Unavailable today");
    expect(a).toContain("Open now");
    // Opening hours in the restaurant's own zone.
    expect(a).toContain("Asia/Kolkata");
    expect(a).not.toContain("Harbour Grill");
  });

  it("publishes schema.org data built only from what the restaurant published", async () => {
    const a = await markup("spice-route");
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(a)?.[1];
    expect(json, "JSON-LD block").toBeTruthy();
    // `<`-style escapes are ordinary JSON string escapes, so consumers read the original characters.
    const data = JSON.parse(json!);
    expect(data["@type"]).toBe("Restaurant");
    expect(data.name).toBe("Spice Route");
    expect(data.currenciesAccepted).toBe("INR");
    expect(data.openingHoursSpecification.length).toBeGreaterThan(0);
    expect(JSON.stringify(data)).not.toContain(tenantIdOf("A"));
  });
});

describe("TC-WEB-010 today's menu share page", () => {
  it("shows today's published menu on its own address", async () => {
    const element = await dailyFor("spice-route");
    const html = renderToStaticMarkup(element as ReactElement);
    expect(html).toContain("Today&#x27;s specials");
    expect(html).toContain("See the full menu");
  });

  it("falls back to an empty state and a link to the full menu when nothing is published today", async () => {
    await db.dailyMenu.update({ where: { id: seeded("A", "daily:today") }, data: { status: "DRAFT" } });
    const html = renderToStaticMarkup((await dailyFor("spice-route")) as ReactElement);
    expect(html).toContain("has not published a menu for today");
    expect(html).toContain("See the full menu");
    await db.dailyMenu.update({ where: { id: seeded("A", "daily:today") }, data: { status: "PUBLISHED" } });
  });

  it("is unreachable for an unpublished website", async () => {
    await db.restaurant.update({ where: { tenantId: tenantIdOf("B") }, data: { websitePublished: false } });
    expect(await dailyFor("harbour-grill")).toEqual({ notFound: true });
  });
});

describe("empty states (TC-WEB-021 server half)", () => {
  it("a restaurant with no published menu still renders its site, and says the menu is missing", async () => {
    await db.menuCategory.updateMany({ where: { tenantId: tenantIdOf("A") }, data: { isPublished: false } });
    const a = await markup("spice-route");
    expect(a).toContain("Spice Route");
    expect(a).toContain("has not published its menu yet");
    expect(a).not.toContain("₹");
  });

  it("a restaurant with no opening hours says so instead of showing an empty table", async () => {
    await db.restaurantHours.updateMany({ where: { tenantId: tenantIdOf("A") }, data: { isClosed: true, opensAt: null, closesAt: null } });
    const a = await markup("spice-route");
    expect(a).toContain("has not published its opening hours yet");
    expect(a).toContain("Closed now");
  });
});
