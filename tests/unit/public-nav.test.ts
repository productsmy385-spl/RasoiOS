import { describe, expect, it } from "vitest";
import { monogram, primaryNavLinks, type SiteNavLink } from "@/components/public/site-view";

// Public website header: the logo fallback and the capped inline navigation (the ☰ drawer lists every section).

describe("monogram — the mark of a restaurant without a logo", () => {
  it("takes up to two initials, splitting on spaces and hyphens", () => {
    expect(monogram("Akshayapatra-Devarapalli")).toBe("AD");
    expect(monogram("Spice Route Kitchen")).toBe("SR");
    expect(monogram("harbour")).toBe("H");
    expect(monogram("  &  ")).toBe("·");
    expect(monogram("ఆహార వేదిక")).toBe("ఆవ");
  });
});

describe("primaryNavLinks — sections shown inline on a desktop header", () => {
  const link = (key: string): SiteNavLink => ({ key, href: `#${key.toLowerCase()}`, label: key });
  const all = ["ABOUT", "FEATURED_MENU", "CATEGORIES", "POPULAR_ITEMS", "INFO", "HOURS", "GALLERY", "LOCATION", "CONTACT"].map(link);

  it("prefers the menu, about, gallery, hours and contact, and never more than five", () => {
    expect(primaryNavLinks(all).map((l) => l.key)).toEqual(["CATEGORIES", "FEATURED_MENU", "ABOUT", "GALLERY", "HOURS"]);
    expect(primaryNavLinks(all, 3)).toHaveLength(3);
  });

  it("only offers sections the restaurant has enabled", () => {
    expect(primaryNavLinks([link("CONTACT"), link("LOCATION")]).map((l) => l.key)).toEqual(["CONTACT"]);
    expect(primaryNavLinks([])).toEqual([]);
  });
});
