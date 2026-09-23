import type { Restaurant, WebsiteSection } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  getWebsiteSettingsAction,
  saveWebsiteSectionsAction,
  updateWebsiteIdentityAction,
  updateWebsiteThemeAction,
} from "@/app/restaurant/website/actions";
import { SURFACE_HEX, THEME_PRESETS, contrastRatio, resolveSections, resolveTheme } from "@/lib/services/website-theme";
import { MIN_THEME_CONTRAST, WEBSITE_SECTION_DEFAULTS, WEBSITE_SECTION_KEYS, type WebsiteSectionInput } from "@/lib/validation/website";
import { testDb } from "../setup/db";
import { actorState } from "../helpers/actor-state";
import { asSeedUser, invokeAction, seedOnce, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf } from "../orders/helpers";

// S1-P07-T010 — SA-WEB-01…03 and LD-WEB-01 (api.md §5, ADR-013 §6):
// TC-WEB-014 contrast rejection, TC-WEB-015 tenant isolation and text-not-markup, TC-WEB-016 HERO / reorder / defaults.
const db = testDb();
let seededA: Restaurant;
let seededB: Restaurant;
let seededSectionsA: WebsiteSection[];

const sectionsOf = (tenantId: string) => db.websiteSection.findMany({ where: { tenantId }, orderBy: { key: "asc" } });

beforeAll(async () => {
  await seedOnce();
  vi.stubEnv("ALLOWED_IMAGE_HOSTS", "images.example.com");
  seededA = await db.restaurant.findUniqueOrThrow({ where: { tenantId: tenantIdOf("A") } });
  seededB = await db.restaurant.findUniqueOrThrow({ where: { tenantId: tenantIdOf("B") } });
  seededSectionsA = await sectionsOf(tenantIdOf("A"));
}, 120_000);

afterAll(() => vi.unstubAllEnvs());

// Put Tenant A's website back so every test starts from the seed.
afterEach(async () => {
  const { themePreset, themeSurfaceMode, themePrimaryHex, themeSecondaryHex, brandAccentHex, gradientFromHex, gradientToHex, tagline, heroImageUrl, faviconUrl, instagramUrl, facebookUrl, whatsappE164, mapsUrl } = seededA;
  await db.restaurant.update({
    where: { id: seededA.id },
    data: { themePreset, themeSurfaceMode, themePrimaryHex, themeSecondaryHex, brandAccentHex, gradientFromHex, gradientToHex, tagline, heroImageUrl, faviconUrl, instagramUrl, facebookUrl, whatsappE164, mapsUrl },
  });
  await db.websiteSection.deleteMany({ where: { tenantId: tenantIdOf("A") } });
  await db.websiteSection.createMany({ data: seededSectionsA });
});

const themeState = (r: Restaurant) => ({
  themePreset: r.themePreset,
  themeSurfaceMode: r.themeSurfaceMode,
  themePrimaryHex: r.themePrimaryHex,
  themeSecondaryHex: r.themeSecondaryHex,
  brandAccentHex: r.brandAccentHex,
  gradientFromHex: r.gradientFromHex,
  gradientToHex: r.gradientToHex,
});

const sectionPayload = (
  overrides: Partial<{ key: string; enabled: boolean; sortOrder: number; headline: string | null; body: string | null; ctaLabel: string | null; ctaHref: string | null }> = {},
): WebsiteSectionInput => ({ key: "ABOUT", enabled: true, sortOrder: 10, ...overrides }) as WebsiteSectionInput;

describe("TC-WEB-014 a colour that fails contrast is rejected and nothing is written", () => {
  it("names the failing field and the measured ratio, and leaves the stored theme untouched", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const before = themeState(await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } }));

    // #FFF9C4 is a pale yellow: readable on a dark site, unreadable on the light one.
    const error = errorOf(
      await invokeAction(updateWebsiteThemeAction, {
        preset: "CUSTOM",
        surfaceMode: "LIGHT",
        primaryHex: "#FFF9C4",
        secondaryHex: "#0E7490",
        accentHex: "#4338CA",
      }),
    );
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.fieldErrors?.primaryHex?.[0]).toMatch(/:1 on the light website background/);
    expect(error.fieldErrors?.primaryHex?.[0]).toMatch(new RegExp(`at least ${MIN_THEME_CONTRAST}:1`));
    expect(error.fieldErrors?.secondaryHex).toBeUndefined();

    // A gradient running from near-white to near-black: no single text colour survives both ends.
    const gradient = errorOf(
      await invokeAction(updateWebsiteThemeAction, {
        preset: "OCEAN",
        surfaceMode: "DARK",
        gradientFromHex: "#FFE066",
        gradientToHex: "#111111",
      }),
    );
    expect(gradient.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(gradient.fieldErrors ?? {}).sort()).toEqual(["gradientFromHex", "gradientToHex"]);

    expect(themeState(await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } }))).toEqual(before);
    expect(await db.auditLog.count({ where: { requestId: actorState.requestId } })).toBe(0);
  });

  it("accepts a readable custom theme, audits it once, and clears the custom colours when a preset is chosen", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const saved = dataOf(
      await invokeAction(updateWebsiteThemeAction, {
        preset: "CUSTOM",
        surfaceMode: "LIGHT",
        primaryHex: "#0369a1",
        secondaryHex: "#7E22CE",
        accentHex: "#9D174D",
        gradientFromHex: "#0C4A6E",
        gradientToHex: "#4C1D95",
      }),
    );
    expect(saved.theme).toMatchObject({ preset: "CUSTOM", surfaceMode: "LIGHT", primaryHex: "#0369A1", secondaryHex: "#7E22CE", accentHex: "#9D174D" });
    expect(saved.resolvedTheme.surface).toBe(SURFACE_HEX.LIGHT);
    expect(saved.cssVariables["--site-primary"]).toBe("#0369A1");

    const stored = await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } });
    expect(themeState(stored)).toEqual({
      themePreset: "CUSTOM",
      themeSurfaceMode: "LIGHT",
      themePrimaryHex: "#0369A1",
      themeSecondaryHex: "#7E22CE",
      brandAccentHex: "#9D174D",
      gradientFromHex: "#0C4A6E",
      gradientToHex: "#4C1D95",
    });
    const audits = await db.auditLog.findMany({ where: { requestId: actorState.requestId } });
    expect(audits.map((a) => a.action)).toEqual(["restaurant.theme_updated"]);
    expect(audits[0]).toMatchObject({ tenantId: tenantIdOf("A"), resourceType: "restaurant", resourceId: seededA.id });
    expect(audits[0].afterState).toMatchObject({ themePrimaryHex: "#0369A1" });

    // Switching to a preset hands the colours back to the preset: the custom columns are cleared.
    await asSeedUser("A", "TENANT_ADMIN");
    const preset = dataOf(await invokeAction(updateWebsiteThemeAction, { preset: "BERRY", surfaceMode: "DARK" }));
    expect(preset.theme).toMatchObject({ preset: "BERRY", surfaceMode: "DARK", primaryHex: null, secondaryHex: null, accentHex: null });
    expect(preset.resolvedTheme.primary).toBe(THEME_PRESETS.BERRY.DARK.primary);
    expect(themeState(await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } }))).toMatchObject({ themePreset: "BERRY", themePrimaryHex: null, brandAccentHex: null });
  });

  it("requires the three colours for a custom theme, both gradient ends, and #RRGGBB", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const missing = errorOf(await invokeAction(updateWebsiteThemeAction, { preset: "CUSTOM", surfaceMode: "DARK" }));
    expect(Object.keys(missing.fieldErrors ?? {}).sort()).toEqual(["accentHex", "primaryHex", "secondaryHex"]);

    const halfGradient = errorOf(await invokeAction(updateWebsiteThemeAction, { preset: "OCEAN", surfaceMode: "DARK", gradientFromHex: "#0C4A6E" }));
    expect(halfGradient.fieldErrors?.gradientToHex).toBeDefined();

    for (const bad of ["red", "#FFF", "#12345", "rgb(0,0,0)"]) {
      const error = errorOf(await invokeAction(updateWebsiteThemeAction, { preset: "CUSTOM", surfaceMode: "DARK", primaryHex: bad, secondaryHex: "#22D3EE", accentHex: "#FFD166" }));
      expect(error.fieldErrors?.primaryHex, bad).toBeDefined();
    }
    // An unknown key — including `tenantId` — is refused outright (SC-TEN-01).
    const extra = errorOf(await invokeAction(updateWebsiteThemeAction, { preset: "OCEAN", surfaceMode: "DARK", tenantId: tenantIdOf("B") } as never));
    expect(extra.code).toBe("VALIDATION_ERROR");
    expect(themeState(await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } }))).toEqual(themeState(seededA));
  });

  it("every preset palette meets AA on its own surface", () => {
    for (const [name, modes] of Object.entries(THEME_PRESETS)) {
      for (const [mode, palette] of Object.entries(modes)) {
        for (const role of ["primary", "secondary", "accent"] as const) {
          const ratio = contrastRatio(palette[role], SURFACE_HEX[mode as "DARK" | "LIGHT"]);
          expect(ratio, `${name} ${mode} ${role}`).toBeGreaterThanOrEqual(MIN_THEME_CONTRAST);
        }
      }
    }
  });
});

describe("TC-WEB-015 tenant isolation and text, never markup", () => {
  it("a MANAGER of Tenant A can only change Tenant A; Tenant B's theme and sections never move", async () => {
    const beforeB = themeState(await db.restaurant.findUniqueOrThrow({ where: { id: seededB.id } }));
    const beforeSectionsB = await sectionsOf(tenantIdOf("B"));

    await asSeedUser("A", "TENANT_ADMIN");
    dataOf(await invokeAction(updateWebsiteThemeAction, { preset: "CITRUS", surfaceMode: "DARK" }));
    dataOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload({ headline: "Tenant A only" })] }));

    expect(themeState(await db.restaurant.findUniqueOrThrow({ where: { id: seededB.id } }))).toEqual(beforeB);
    expect(await sectionsOf(tenantIdOf("B"))).toEqual(beforeSectionsB);

    // Tenant B's own loader still reports Tenant B's theme.
    await asSeedUser("B", "TENANT_ADMIN");
    const viewB = dataOf(await invokeAction(getWebsiteSettingsAction));
    expect(viewB.theme).toMatchObject({ preset: "OCEAN", surfaceMode: "LIGHT" });
    expect(viewB.sections.find((s) => s.key === "ABOUT")?.headline).not.toBe("Tenant A only");
  });

  it("a role without website:update is refused before anything is read (SC-RBAC-08)", async () => {
    await asSeedUser("A", "CASHIER");
    const error = errorOf(await invokeAction(updateWebsiteThemeAction, { preset: "BERRY", surfaceMode: "DARK" }));
    expect(error.code).toBe("FORBIDDEN");
    // The same role may still read the settings, with canEdit false.
    const view = dataOf(await invokeAction(getWebsiteSettingsAction));
    expect(view.canEdit).toBe(false);
    expect(themeState(await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } }))).toEqual(themeState(seededA));
  });

  it("stores section copy verbatim as text: markup is never parsed, control characters are dropped", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const hostile = '<script>alert("xss")</script> & <b>bold</b>';
    const saved = dataOf(
      await invokeAction(saveWebsiteSectionsAction, {
        sections: [sectionPayload({ headline: `Our\u0000 story​`, body: hostile })],
      }),
    );
    const about = saved.sections.find((s) => s.key === "ABOUT")!;
    expect(about.body).toBe(hostile);
    expect(about.headline).toBe("Our story");

    const row = await db.websiteSection.findFirstOrThrow({ where: { tenantId: tenantIdOf("A"), key: "ABOUT" } });
    expect(row.body).toBe(hostile);
    // Nothing was interpreted: the stored text still contains the angle brackets the visitor typed.
    expect(row.body).toContain("<script>");
  });

  it("refuses links that are not https, carry credentials, a port or an IP address", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    for (const [field, value] of [
      ["instagramUrl", "http://www.instagram.com/x"],
      ["instagramUrl", "javascript:alert(1)"],
      ["facebookUrl", "https://user:pass@facebook.com/x"],
      ["mapsUrl", "https://10.0.0.5/x"],
      ["mapsUrl", "https://maps.example.com:8443/x"],
      ["heroImageUrl", "https://not-allowed.example.org/a.png"],
      ["whatsappE164", "0801234567"],
    ] as const) {
      const error = errorOf(await invokeAction(updateWebsiteIdentityAction, { [field]: value } as never));
      expect(error.code, `${field}=${value}`).toBe("VALIDATION_ERROR");
      expect(error.fieldErrors?.[field], `${field}=${value}`).toBeDefined();
    }

    const ok = dataOf(
      await invokeAction(updateWebsiteIdentityAction, {
        tagline: "  Fire and spice  ",
        instagramUrl: "https://www.instagram.com/spiceroute.example/",
        heroImageUrl: "https://images.example.com/hero.jpg",
        whatsappE164: "+91 80 4123 4567",
        facebookUrl: "",
      }),
    );
    expect(ok.identity).toMatchObject({
      tagline: "Fire and spice",
      instagramUrl: "https://www.instagram.com/spiceroute.example/",
      heroImageUrl: "https://images.example.com/hero.jpg",
      whatsappE164: "+918041234567",
      facebookUrl: null,
    });
    const audits = await db.auditLog.findMany({ where: { requestId: actorState.requestId } });
    expect(audits.map((a) => a.action)).toEqual(["restaurant.website_updated"]);
  });
});

describe("TC-WEB-016 HERO, reordering and defaults", () => {
  it("refuses to disable HERO with 409 HERO_REQUIRED and writes nothing", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const before = await sectionsOf(tenantIdOf("A"));
    const error = errorOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload({ key: "HERO", enabled: false, sortOrder: 0 })] }));
    expect(error.code).toBe("HERO_REQUIRED");
    expect(await sectionsOf(tenantIdOf("A"))).toEqual(before);
    expect(await db.auditLog.count({ where: { requestId: actorState.requestId } })).toBe(0);

    // Even a stored `enabled = false` row cannot hide the hero when the page is resolved.
    await db.websiteSection.updateMany({ where: { tenantId: tenantIdOf("A"), key: "HERO" }, data: { enabled: false } });
    const rows = await sectionsOf(tenantIdOf("A"));
    expect(resolveSections(rows).map((s) => s.key)).toContain("HERO");
  });

  it("reorders sections, audits the whole layout once, and writes nothing when the layout is unchanged", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const saved = dataOf(
      await invokeAction(saveWebsiteSectionsAction, {
        sections: [
          { key: "CONTACT", enabled: true, sortOrder: 5 },
          { key: "ABOUT", enabled: true, sortOrder: 6 },
          { key: "GALLERY", enabled: false, sortOrder: 7 },
        ],
      }),
    );
    const order = saved.sections.map((s) => s.key);
    expect(order.indexOf("CONTACT")).toBeLessThan(order.indexOf("ABOUT"));

    const audits = await db.auditLog.findMany({ where: { requestId: actorState.requestId } });
    expect(audits.map((a) => a.action)).toEqual(["restaurant.website_updated"]);
    expect((audits[0].afterState as { sections: Record<string, { sortOrder: number }> }).sections.CONTACT.sortOrder).toBe(5);

    // Saving exactly the same layout again changes nothing and writes no audit row.
    await asSeedUser("A", "TENANT_ADMIN");
    dataOf(
      await invokeAction(saveWebsiteSectionsAction, {
        sections: [
          { key: "CONTACT", enabled: true, sortOrder: 5 },
          { key: "ABOUT", enabled: true, sortOrder: 6 },
          { key: "GALLERY", enabled: false, sortOrder: 7 },
        ],
      }),
    );
    expect(await db.auditLog.count({ where: { requestId: actorState.requestId } })).toBe(0);
  });

  it("a missing row falls back to its default, and a created row replaces it", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    await db.websiteSection.deleteMany({ where: { tenantId: tenantIdOf("A") } });

    const empty = dataOf(await invokeAction(getWebsiteSettingsAction));
    expect(empty.sections.map((s) => s.key).sort()).toEqual([...WEBSITE_SECTION_KEYS].sort());
    for (const section of empty.sections) {
      expect(section.stored, section.key).toBe(false);
      expect(section.enabled, section.key).toBe(WEBSITE_SECTION_DEFAULTS[section.key].enabled);
      expect(section.sortOrder, section.key).toBe(WEBSITE_SECTION_DEFAULTS[section.key].sortOrder);
    }
    // The resolved public layout is still complete, in the default order, with the default headings.
    const resolved = resolveSections([]);
    expect(resolved[0].key).toBe("HERO");
    expect(resolved.every((s) => s.headline.length > 0)).toBe(true);
    expect(resolved.every((s) => s.body === null)).toBe(true);

    await asSeedUser("A", "TENANT_ADMIN");
    dataOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload({ key: "GALLERY", enabled: true, sortOrder: 71 })] }));
    const after = dataOf(await invokeAction(getWebsiteSettingsAction));
    expect(after.sections.find((s) => s.key === "GALLERY")).toMatchObject({ stored: true, enabled: true, sortOrder: 71 });
    expect(after.sections.find((s) => s.key === "ABOUT")).toMatchObject({ stored: false });
  });

  it("rejects duplicate keys, duplicate positions, a half-configured button and an out-of-range position", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const before = await sectionsOf(tenantIdOf("A"));

    const duplicateKey = errorOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload(), sectionPayload({ sortOrder: 11 })] }));
    expect(duplicateKey.fieldErrors?.["sections.1.key"]).toBeDefined();

    const duplicateOrder = errorOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload(), sectionPayload({ key: "CONTACT" })] }));
    expect(duplicateOrder.fieldErrors?.["sections.1.sortOrder"]).toBeDefined();

    const halfButton = errorOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload({ ctaLabel: "Order" })] }));
    expect(halfButton.fieldErrors?.["sections.0.ctaHref"]).toBeDefined();

    const badHref = errorOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload({ ctaLabel: "Order", ctaHref: "//evil.test" })] }));
    expect(badHref.fieldErrors?.["sections.0.ctaHref"]).toBeDefined();

    const outOfRange = errorOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload({ sortOrder: 1000 })] }));
    expect(outOfRange.fieldErrors?.["sections.0.sortOrder"]).toBeDefined();

    const unknownKey = errorOf(await invokeAction(saveWebsiteSectionsAction, { sections: [sectionPayload({ key: "TESTIMONIALS" })] } as never));
    expect(unknownKey.code).toBe("VALIDATION_ERROR");

    expect(await sectionsOf(tenantIdOf("A"))).toEqual(before);
  });

  it("resolves a legacy row with no preset colours onto the platform palette", () => {
    const resolved = resolveTheme({ preset: "CUSTOM", surfaceMode: "DARK", primaryHex: null, secondaryHex: null, accentHex: null, gradientFromHex: null, gradientToHex: null });
    expect(resolved.primary).toBe(THEME_PRESETS.PLATFORM.DARK.primary);
    expect(resolved.surface).toBe(SURFACE_HEX.DARK);
  });
});
