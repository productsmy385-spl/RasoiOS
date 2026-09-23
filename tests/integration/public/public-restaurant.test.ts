import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPublicRestaurant } from "@/lib/data/public-restaurant";
import { NotFoundError } from "@/lib/errors";
import { getPublicRestaurantBySlug, type PublicRestaurantData } from "@/lib/services/public-restaurant";
import { freezeTime, testDb } from "../setup/db";
import { SEED_NOW, SEED_TENANTS, seedOnce, seeded, staffEmail, tenantIdOf } from "../helpers/actors";

/**
 * Public website projection (LD-PUB-01 / LD-PUB-02; S1-P09-T002):
 * TC-WEB-002 key whitelist · TC-WEB-003 published-only · TC-WEB-004 not-found parity · TC-WEB-005 no private data ·
 * TC-DMENU-005 today's menu in the restaurant's own time zone · TC-TZ-002 open-now at the projection boundary ·
 * TC-SEC-005 hostile slugs · TC-ORDER-012 no public order submission endpoint exists (Q-001 answered A, 2026-09-23).
 */
const db = testDb();
const root = path.resolve(__dirname, "../../..");

beforeAll(seedOnce, 120_000);

let unfreeze: (() => void) | null = null;

beforeEach(async () => {
  // Undo per-test mutations of the shared seed (Tenant A published, Tenant B not).
  await db.tenant.updateMany({ data: { status: "ACTIVE", suspendedAt: null, suspensionReason: null } });
  await db.restaurant.update({ where: { tenantId: tenantIdOf("A") }, data: { websitePublished: true, showPhone: true, showEmail: true, showAddress: true } });
  await db.restaurant.update({ where: { tenantId: tenantIdOf("B") }, data: { websitePublished: false } });
  await db.menuCategory.updateMany({ where: { tenantId: tenantIdOf("A") }, data: { isPublished: true, archivedAt: null } });
  await db.menuItem.updateMany({ where: { tenantId: tenantIdOf("A") }, data: { isPublished: true, archivedAt: null, isAvailable: true } });
  await db.menuItemVariant.updateMany({ where: { tenantId: tenantIdOf("A") }, data: { isAvailable: true, archivedAt: null } });
  await db.menuItemAddon.updateMany({ where: { tenantId: tenantIdOf("A") }, data: { isAvailable: true, archivedAt: null } });
  await db.dailyMenu.updateMany({ where: { id: seeded("A", "daily:today") }, data: { status: "PUBLISHED" } });
  unfreeze = freezeTime(SEED_NOW.toISOString());
});

afterEach(() => {
  unfreeze?.();
  unfreeze = null;
});

async function notFoundError(slug: string): Promise<NotFoundError> {
  const error = await getPublicRestaurantBySlug(slug).then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, slug).toBeInstanceOf(NotFoundError);
  return error as NotFoundError;
}

/** Every key path in a JSON value, with array indexes collapsed to `[]`. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => keyPaths(item, `${prefix}[]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [`${prefix}.${key}`, ...keyPaths(child, `${prefix}.${key}`)]);
  }
  return [];
}

const itemNames = (data: PublicRestaurantData) => data.categories.flatMap((c) => c.items.map((i) => i.name));

describe("LD-PUB-01 published restaurant", () => {
  it("returns Tenant A (spice-route, ACTIVE + published) with its published categories and items only", async () => {
    const data = await getPublicRestaurantBySlug("spice-route");
    expect(data).toMatchObject({
      slug: "spice-route",
      timezone: "Asia/Kolkata",
      currencyCode: "INR",
      countryCode: "IN",
      restaurant: {
        name: "Spice Route",
        phone: "+918041234567",
        email: SEED_TENANTS.A.restaurant.email,
        address: "12 MG Road, Bengaluru, Karnataka, 560001",
      },
    });
    expect(data.categories.map((c) => c.name)).toEqual(["Starters", "Mains", "Beverages"]);
    expect(itemNames(data)).toEqual(["Paneer Tikka", "Chicken 65", "Masala Omelette", "Butter Chicken", "Dal Makhani", "Masala Chai", "Fresh Lime Soda"]);
    const paneer = data.categories[0].items[0];
    expect(paneer).toMatchObject({ id: seeded("A", "item:paneer-tikka"), price: "280.00", isAvailable: true, dietaryType: "VEG" });
    expect(paneer.variants.map((v) => [v.name, v.price, v.isDefault])).toEqual([
      ["Half", "160.00", false],
      ["Full", "280.00", true],
    ]);
    expect(data.categories[1].items[0].addOns.map((a) => [a.name, a.price])).toEqual([
      ["Extra Butter", "30.00"],
      ["Butter Naan", "60.00"],
    ]);
  });

  it("REQ-WEB-006 publishes the restaurant's own week of opening hours, Monday first", async () => {
    const data = await getPublicRestaurantBySlug("spice-route");
    expect(data.hours).toHaveLength(7);
    expect(data.hours.map((day) => day.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(data.hours[1].shifts).toEqual([
      { opensAt: "12:00", closesAt: "15:30" },
      { opensAt: "19:00", closesAt: "23:30" },
    ]);
  });

  it("TC-TZ-002 open-now is answered in the restaurant's time zone, not the server's", async () => {
    await db.restaurant.update({ where: { tenantId: tenantIdOf("B") }, data: { websitePublished: true } });
    // 2026-09-15T08:30Z is a Tuesday: 14:00 in Bengaluru (inside 12:00–15:30) and 04:30 in New York (before 11:00).
    expect((await getPublicRestaurantBySlug("spice-route")).openNow).toBe(true);
    expect((await getPublicRestaurantBySlug("harbour-grill")).openNow).toBe(false);

    // In the gap between Bengaluru's lunch and dinner shifts (16:30 local) it is closed…
    expect((await getPublicRestaurant("spice-route", new Date("2026-09-15T11:00:00.000Z"))).openNow).toBe(false);
    // …and at midday in New York the other restaurant is open.
    expect((await getPublicRestaurant("harbour-grill", new Date("2026-09-15T16:00:00.000Z"))).openNow).toBe(true);
  });

  it("publishes 'most ordered' from real order lines only, and never an order or a customer", async () => {
    const data = await getPublicRestaurantBySlug("spice-route");
    const menuItemIds = new Set(data.categories.flatMap((category) => category.items.map((item) => item.id)));
    expect(data.popularItems.length).toBeGreaterThan(0);
    for (const item of data.popularItems) expect(menuItemIds.has(item.id), item.name).toBe(true);

    // An item that is unpublished afterwards cannot come back through the popularity ranking.
    const dropped = data.popularItems[0];
    await db.menuItem.update({ where: { id: dropped.id }, data: { isPublished: false } });
    const after = await getPublicRestaurantBySlug("spice-route");
    expect(after.popularItems.map((item) => item.id)).not.toContain(dropped.id);
  });
});

describe("TC-DMENU-005 today's published daily menu (LD-PUB-02)", () => {
  it("returns the PUBLISHED menu whose business date is today in the restaurant's time zone", async () => {
    const data = await getPublicRestaurantBySlug("spice-route");
    expect(data.dailyMenu).toMatchObject({ businessDate: "2026-09-15", title: "Today's specials" });
    expect(data.dailyMenu!.items.length).toBeGreaterThan(0);
  });

  it("a DRAFT or UNPUBLISHED menu is invisible, and yesterday's menu never stands in for today's", async () => {
    await db.dailyMenu.update({ where: { id: seeded("A", "daily:today") }, data: { status: "DRAFT" } });
    expect((await getPublicRestaurantBySlug("spice-route")).dailyMenu).toBeNull();

    await db.dailyMenu.update({ where: { id: seeded("A", "daily:today") }, data: { status: "UNPUBLISHED" } });
    expect((await getPublicRestaurantBySlug("spice-route")).dailyMenu).toBeNull();
  });

  it("TC-TZ-003 each restaurant flips at its own midnight, not the server's", async () => {
    await db.restaurant.update({ where: { tenantId: tenantIdOf("B") }, data: { websitePublished: true } });
    // 18:30Z is 00:00 on 16 September in Kolkata but still 14:30 on 15 September in New York.
    const midnightInKolkata = new Date("2026-09-15T18:30:00.000Z");
    expect((await getPublicRestaurant("spice-route", midnightInKolkata)).dailyMenu).toBeNull();
    expect((await getPublicRestaurant("harbour-grill", midnightInKolkata)).dailyMenu).toMatchObject({ businessDate: "2026-09-15" });

    // One minute earlier it is still 15 September in Kolkata.
    expect((await getPublicRestaurant("spice-route", new Date("2026-09-15T18:29:59.000Z"))).dailyMenu).toMatchObject({ businessDate: "2026-09-15" });
  });
});

describe("TC-WEB-004 / TI-062 not-found parity", () => {
  it("Tenant B (harbour-grill) has an unpublished website → NotFound; publishing it is the only difference", async () => {
    await notFoundError("harbour-grill");
    await db.restaurant.update({ where: { tenantId: tenantIdOf("B") }, data: { websitePublished: true } });
    expect((await getPublicRestaurantBySlug("harbour-grill")).restaurant.name).toBe("Harbour Grill");
  });

  it("unknown, suspended and unpublished produce identical errors", async () => {
    const unknown = await notFoundError("no-such-restaurant");
    const unpublished = await notFoundError("harbour-grill");
    await db.tenant.update({ where: { id: tenantIdOf("A") }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: "Test suspension" } });
    const suspended = await notFoundError("spice-route");
    for (const error of [unpublished, suspended]) {
      expect({ code: error.code, statusCode: error.statusCode, message: error.message }).toEqual({ code: unknown.code, statusCode: unknown.statusCode, message: unknown.message });
    }
    expect(unknown.message).not.toContain("no-such-restaurant");
  });

  it("TC-SEC-005 invalid slugs, and a tenant id used as a slug, are refused identically", async () => {
    for (const slug of ["Spice-Route", "spice route", "../admin", "a", "x".repeat(60), "spice-route' OR 1=1 --", "-spice", tenantIdOf("A")]) {
      await notFoundError(slug);
    }
  });
});

describe("TC-WEB-003 only published, non-archived menu content", () => {
  it("excludes unpublished/archived categories and items and unavailable/archived variants and add-ons; sold-out items keep only a flag", async () => {
    await db.menuItem.update({ where: { id: seeded("A", "item:chicken-65") }, data: { isPublished: false } });
    await db.menuItem.update({ where: { id: seeded("A", "item:masala-omelette") }, data: { archivedAt: new Date() } });
    await db.menuCategory.update({ where: { id: seeded("A", "category:beverages") }, data: { isPublished: false } });
    await db.menuItemVariant.update({ where: { id: seeded("A", "variant:paneer-tikka:0") }, data: { archivedAt: new Date() } });
    await db.menuItemAddon.update({ where: { id: seeded("A", "addon:butter-chicken:1") }, data: { isAvailable: false } });
    await db.menuItem.update({ where: { id: seeded("A", "item:dal-makhani") }, data: { isAvailable: false } });

    const data = await getPublicRestaurantBySlug("spice-route");
    expect(data.categories.map((c) => c.name)).toEqual(["Starters", "Mains"]);
    expect(itemNames(data)).toEqual(["Paneer Tikka", "Butter Chicken", "Dal Makhani"]);
    expect(data.categories[0].items[0].variants.map((v) => v.name)).toEqual(["Full"]);
    expect(data.categories[1].items[0].addOns.map((a) => a.name)).toEqual(["Extra Butter"]);
    expect(data.categories[1].items[1]).toMatchObject({ name: "Dal Makhani", isAvailable: false });

    const json = JSON.stringify(data);
    for (const hidden of [
      seeded("A", "item:chicken-65"),
      seeded("A", "item:masala-omelette"),
      seeded("A", "category:beverages"),
      seeded("A", "variant:paneer-tikka:0"),
      seeded("A", "addon:butter-chicken:1"),
      "Chicken 65",
      "Masala Omelette",
      "Butter Naan",
      "240.00",
      "120.00",
      "160.00",
    ]) {
      expect(json, hidden).not.toContain(hidden);
    }
  });

  it("an unpublished item also disappears from today's daily menu", async () => {
    const before = await getPublicRestaurantBySlug("spice-route");
    const listed = before.dailyMenu!.items[0];
    await db.menuItem.update({ where: { id: listed.id }, data: { isPublished: false } });
    const after = await getPublicRestaurantBySlug("spice-route");
    expect(after.dailyMenu!.items.map((item) => item.id)).not.toContain(listed.id);
  });

  it("ADV-025 an archived category hides its items even when the items are published", async () => {
    await db.menuCategory.update({ where: { id: seeded("A", "category:mains") }, data: { archivedAt: new Date() } });
    const data = await getPublicRestaurantBySlug("spice-route");
    expect(itemNames(data)).not.toContain("Butter Chicken");
    expect(JSON.stringify(data)).not.toContain(seeded("A", "item:butter-chicken"));
  });
});

describe("TC-WEB-005 no private fields or tenant identifiers", () => {
  it("TC-WEB-002 the payload has exactly the documented public key paths", async () => {
    const data = await getPublicRestaurantBySlug("spice-route");
    const item = [
      ".id",
      ".name",
      ".description",
      ".imageUrl",
      ".iconKey",
      ".price",
      ".isAvailable",
      ".dietaryType",
      ".variants",
      ".variants[].id",
      ".variants[].name",
      ".variants[].price",
      ".variants[].isDefault",
      ".addOns",
      ".addOns[].id",
      ".addOns[].name",
      ".addOns[].price",
    ];
    const expected = [
      ".slug",
      ".timezone",
      ".currencyCode",
      ".countryCode",
      ".restaurant",
      ".restaurant.name",
      ".restaurant.logoUrl",
      ".restaurant.coverImageUrl",
      ".restaurant.description",
      ".restaurant.address",
      ".restaurant.email",
      ".restaurant.phone",
      ".hours",
      ".hours[].dayOfWeek",
      ".hours[].isClosed",
      ".hours[].shifts",
      ".hours[].shifts[].opensAt",
      ".hours[].shifts[].closesAt",
      ".openNow",
      ".dailyMenu",
      ".dailyMenu.businessDate",
      ".dailyMenu.title",
      ".dailyMenu.note",
      ".dailyMenu.items",
      ...item.map((key) => `.dailyMenu.items[]${key}`),
      ".categories",
      ".categories[].id",
      ".categories[].name",
      ".categories[].description",
      ".categories[].iconKey",
      ".categories[].sortOrder",
      ".categories[].items",
      ...item.map((key) => `.categories[].items[]${key}`),
      ".popularItems",
      ...item.map((key) => `.popularItems[]${key}`),
    ];
    expect([...new Set(keyPaths(data))].sort()).toEqual([...new Set(expected)].sort());
  });

  it("never contains GSTIN, tenant/restaurant ids, private settings, staff, customers, orders or the other tenant", async () => {
    const data = await getPublicRestaurantBySlug("spice-route");
    const json = JSON.stringify(data);
    const order = await db.order.findFirstOrThrow({ where: { tenantId: tenantIdOf("A") } });
    for (const value of [
      "29ABCDE1234F1Z5",
      tenantIdOf("A"),
      tenantIdOf("B"),
      seeded("A", "restaurant"),
      SEED_TENANTS.A.restaurant.receiptFooter,
      "Spice Route — Menu", // seo_title
      staffEmail(SEED_TENANTS.A, "admin"),
      staffEmail(SEED_TENANTS.A, "cashier"),
      "Sam Taylor",
      "+919900000001",
      order.id,
      order.orderNumber,
      "Harbour Grill",
      "Clam Chowder",
      seeded("B", "item:clam-chowder"),
    ]) {
      expect(json, value).not.toContain(value);
    }
    expect(keyPaths(data).some((key) => /tenantId|gstin|receiptFooter|seo|autoPrint|defaultOrderType/i.test(key))).toBe(false);
  });

  it("contact fields are omitted when their show flags are off", async () => {
    await db.restaurant.update({ where: { tenantId: tenantIdOf("A") }, data: { showPhone: false, showEmail: false, showAddress: false } });
    const data = await getPublicRestaurantBySlug("spice-route");
    expect(data.restaurant).toMatchObject({ phone: null, email: null, address: null });
    const json = JSON.stringify(data);
    for (const hidden of ["+918041234567", "hello.spiceroute", "12 MG Road", "560001"]) expect(json, hidden).not.toContain(hidden);
  });
});

// ─── TC-ORDER-012 ───

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("TC-ORDER-012 public ordering is gone (Q-001 answered A on 2026-09-23)", () => {
  it("no public order submission action or route exists anywhere under the public site", () => {
    const files = [...sourceFiles(path.join(root, "app/r")), ...sourceFiles(path.join(root, "components/public"))];
    expect(files.length).toBeGreaterThan(4);

    const offenders = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return /"use server"|submitPublicOrderAction|checkout|addToCart|CartDrawer/i.test(source);
    });
    expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
  });

  it("the public site holds no cart state and no order-writing import", () => {
    for (const file of sourceFiles(path.join(root, "components/public"))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@\/lib\/(db|services\/orders)\b|@prisma\/client/);
      expect(source, file).not.toMatch(/\bcart\b/i);
    }
  });

  it("the public projection exposes nothing an order would need beyond display data", async () => {
    const data = await getPublicRestaurantBySlug("spice-route");
    expect(keyPaths(data).some((key) => /quantity|tax|taxRate|kitchenSection|orderType|idempotenc/i.test(key))).toBe(false);
  });
});
