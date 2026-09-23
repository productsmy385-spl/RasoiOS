import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { gstBreakup } from "@/lib/pricing/gst";
import { priceLines, PricingError, type CartLine, type CatalogueItem } from "@/lib/pricing/price-order";

// TC-ORDER-002, TC-PRICE-002, TC-PRICE-003 — pricing engine and GST presentation (S1-P12-T002, ADR-010 §2–3).
const D = (v: string) => new Prisma.Decimal(v);

function item(id: string, over: Partial<CatalogueItem> = {}): CatalogueItem {
  return {
    id,
    name: `Item ${id}`,
    basePrice: D("100.00"),
    taxRate: D("5.00"),
    kitchenSectionId: "section-hot",
    isAvailable: true,
    isPublished: true,
    isArchived: false,
    variants: [],
    addons: [],
    ...over,
  };
}
const catalogueOf = (...items: CatalogueItem[]) => new Map(items.map((i) => [i.id, i]));

const PANEER = item("paneer", { name: "Paneer Tikka", basePrice: D("280.00"), taxRate: D("5.00") });
const BIRYANI = item("biryani", {
  name: "Chicken Biryani",
  basePrice: D("0.00"),
  taxRate: D("5.00"),
  variants: [
    { id: "half", name: "Half", price: D("240.00"), isAvailable: true },
    { id: "full", name: "Full", price: D("420.00"), isAvailable: true },
    { id: "family", name: "Family", price: D("900.00"), isAvailable: false },
  ],
  addons: [
    { id: "raita", name: "Raita", price: D("40.00"), isAvailable: true },
    { id: "egg", name: "Boiled egg", price: D("25.50"), isAvailable: true },
    { id: "salan", name: "Salan", price: D("30.00"), isAvailable: false },
  ],
});
const MOCKTAIL = item("mocktail", { name: "Mint Mojito", basePrice: D("149.00"), taxRate: D("18.00"), kitchenSectionId: "section-bar" });
const CATALOGUE = catalogueOf(PANEER, BIRYANI, MOCKTAIL);

describe("TC-ORDER-002 table-driven totals", () => {
  const cases: Array<{ name: string; lines: CartLine[]; catalogue?: Map<string, CatalogueItem>; subtotal: string; tax: string; total: string; lineTaxes?: string[] }> = [
    { name: "single base-price line", lines: [{ menuItemId: "paneer", quantity: 1 }], subtotal: "280.00", tax: "14.00", total: "294.00" },
    { name: "quantity 99", lines: [{ menuItemId: "paneer", quantity: 99 }], subtotal: "27720.00", tax: "1386.00", total: "29106.00" },
    {
      name: "variant with two add-ons",
      lines: [{ menuItemId: "biryani", variantId: "full", addonIds: ["raita", "egg"], quantity: 2 }],
      subtotal: "971.00", // (420 + 40 + 25.50) × 2
      tax: "48.55",
      total: "1019.55",
    },
    {
      name: "mixed tax rates, rounded per line",
      lines: [
        { menuItemId: "paneer", quantity: 3 },
        { menuItemId: "mocktail", quantity: 2 },
        { menuItemId: "biryani", variantId: "half", quantity: 1 },
      ],
      subtotal: "1378.00", // 840 + 298 + 240
      tax: "107.64", // 42.00 + 53.64 + 12.00
      total: "1485.64",
      lineTaxes: ["42.00", "53.64", "12.00"],
    },
    {
      name: ".005 rounds up (0.10 × 5% = 0.005 → 0.01)",
      lines: [{ menuItemId: "tiny", quantity: 1 }],
      catalogue: catalogueOf(item("tiny", { basePrice: D("0.10"), taxRate: D("5.00") })),
      subtotal: "0.10",
      tax: "0.01",
      total: "0.11",
    },
    {
      name: ".004 rounds down (0.08 × 5% = 0.004 → 0.00)",
      lines: [{ menuItemId: "tiny", quantity: 1 }],
      catalogue: catalogueOf(item("tiny", { basePrice: D("0.08"), taxRate: D("5.00") })),
      subtotal: "0.08",
      tax: "0.00",
      total: "0.08",
    },
    {
      name: "per-line rounding differs from rounding the order (3 × 0.10 at 5% = 3 × 0.01, not 0.02)",
      lines: [
        { menuItemId: "tiny", quantity: 1 },
        { menuItemId: "tiny", quantity: 1 },
        { menuItemId: "tiny", quantity: 1 },
      ],
      catalogue: catalogueOf(item("tiny", { basePrice: D("0.10"), taxRate: D("5.00") })),
      subtotal: "0.30",
      tax: "0.03",
      total: "0.33",
    },
    {
      name: "zero tax rate",
      lines: [{ menuItemId: "water", quantity: 4 }],
      catalogue: catalogueOf(item("water", { basePrice: D("20.00"), taxRate: D("0.00") })),
      subtotal: "80.00",
      tax: "0.00",
      total: "80.00",
    },
    {
      name: "fractional tax rate 12.5% with odd paise",
      lines: [{ menuItemId: "odd", quantity: 3 }],
      catalogue: catalogueOf(item("odd", { basePrice: D("33.33"), taxRate: D("12.50") })),
      subtotal: "99.99",
      tax: "12.50", // 12.49875 → 12.50
      total: "112.49",
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const priced = priceLines(c.lines, c.catalogue ?? CATALOGUE);
      expect(priced.subtotalAmount.toFixed(2)).toBe(c.subtotal);
      expect(priced.taxAmount.toFixed(2)).toBe(c.tax);
      expect(priced.totalAmount.toFixed(2)).toBe(c.total);
      expect(priced.discountAmount.toFixed(2)).toBe("0.00");
      if (c.lineTaxes) expect(priced.lines.map((l) => l.lineTax.toFixed(2))).toEqual(c.lineTaxes);
    });
  }

  it("snapshots names, variant, add-ons, section, rate and instructions on each line", () => {
    const [line] = priceLines([{ menuItemId: "biryani", variantId: "half", addonIds: ["egg"], quantity: 1, specialInstructions: "Less spicy" }], CATALOGUE).lines;
    expect(line).toMatchObject({
      menuItemId: "biryani",
      variantId: "half",
      itemName: "Chicken Biryani",
      variantName: "Half",
      kitchenSectionId: "section-hot",
      quantity: 1,
      specialInstructions: "Less spicy",
      addons: [{ id: "egg", name: "Boiled egg" }],
    });
    expect([line.unitPrice, line.addonsTotal, line.taxRate, line.lineSubtotal, line.lineTax, line.lineTotal].map((d) => d.toFixed(2))).toEqual([
      "240.00",
      "25.50",
      "5.00",
      "265.50",
      "13.28", // 13.275 → 13.28
      "278.78",
    ]);
    expect(priceLines([{ menuItemId: "paneer", quantity: 1 }], CATALOGUE).lines[0]).toMatchObject({ variantId: null, variantName: null, addons: [], specialInstructions: null });
  });
});

describe("pricing errors carry the contract code and line references (api.md SA-ORD-01)", () => {
  const errorOf = (lines: CartLine[], catalogue = CATALOGUE): PricingError => {
    try {
      priceLines(lines, catalogue);
    } catch (error) {
      if (error instanceof PricingError) return error;
      throw error;
    }
    throw new Error("expected a PricingError");
  };

  it("ITEM_UNAVAILABLE for unavailable, unpublished, archived, missing items and unavailable variants — every line listed", () => {
    const catalogue = catalogueOf(
      PANEER,
      BIRYANI,
      item("off", { name: "Off", isAvailable: false }),
      item("draft", { name: "Draft", isPublished: false }),
      item("old", { name: "Old", isArchived: true }),
    );
    const error = errorOf(
      [
        { menuItemId: "paneer", quantity: 1 },
        { menuItemId: "off", quantity: 1 },
        { menuItemId: "draft", quantity: 1 },
        { menuItemId: "old", quantity: 1 },
        { menuItemId: "ghost", quantity: 1 },
        { menuItemId: "biryani", variantId: "family", quantity: 1 },
      ],
      catalogue,
    );
    expect(error).toMatchObject({ code: "ITEM_UNAVAILABLE", statusCode: 422 });
    expect(Object.keys(error.fieldErrors ?? {})).toEqual(["items.1.menuItemId", "items.2.menuItemId", "items.3.menuItemId", "items.4.menuItemId", "items.5.variantId"]);
    expect(error.fieldErrors?.["items.1.menuItemId"]).toEqual(["Off is not available."]);
    expect(error.fieldErrors?.["items.4.menuItemId"]).toEqual(["This item is not available."]);
  });

  it("VARIANT_REQUIRED when a variant is missing, foreign, or sent for an item without variants", () => {
    expect(errorOf([{ menuItemId: "biryani", quantity: 1 }])).toMatchObject({ code: "VARIANT_REQUIRED", fieldErrors: { "items.0.variantId": ["Choose a variant for Chicken Biryani."] } });
    expect(errorOf([{ menuItemId: "biryani", variantId: "not-mine", quantity: 1 }]).fieldErrors).toEqual({ "items.0.variantId": ["That variant does not belong to Chicken Biryani."] });
    expect(errorOf([{ menuItemId: "paneer", variantId: "half", quantity: 1 }]).fieldErrors).toEqual({ "items.0.variantId": ["Paneer Tikka has no variants."] });
  });

  it("INVALID_ADDON for foreign, duplicate or unavailable add-ons", () => {
    expect(errorOf([{ menuItemId: "paneer", addonIds: ["raita"], quantity: 1 }])).toMatchObject({ code: "INVALID_ADDON", fieldErrors: { "items.0.addonIds": ["That add-on does not belong to Paneer Tikka."] } });
    expect(errorOf([{ menuItemId: "biryani", variantId: "half", addonIds: ["raita", "raita"], quantity: 1 }]).fieldErrors).toEqual({ "items.0.addonIds": ["Each add-on can be chosen once."] });
    expect(errorOf([{ menuItemId: "biryani", variantId: "half", addonIds: ["salan"], quantity: 1 }]).fieldErrors).toEqual({ "items.0.addonIds": ["Salan is not available."] });
  });

  it("reports the highest-precedence code when several kinds occur", () => {
    const error = errorOf([
      { menuItemId: "biryani", quantity: 1 },
      { menuItemId: "ghost", quantity: 1 },
      { menuItemId: "paneer", addonIds: ["raita"], quantity: 1 },
    ]);
    expect(error.code).toBe("ITEM_UNAVAILABLE");
    expect(error.fieldErrors).toEqual({ "items.1.menuItemId": ["This item is not available."] });
    expect(errorOf([{ menuItemId: "biryani", quantity: 1 }, { menuItemId: "paneer", addonIds: ["raita"], quantity: 1 }]).code).toBe("VARIANT_REQUIRED");
  });
});

/** Deterministic PRNG so the property test is reproducible (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("TC-PRICE-002 property: totals are sums of line amounts", () => {
  it("holds for 500 random valid carts", () => {
    const next = rng(20260922);
    const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
    const paise = (max: number) => D((int(0, max * 100) / 100).toFixed(2));
    const rates = ["0.00", "5.00", "12.00", "18.00", "28.00", "2.50", "12.50"];

    for (let run = 0; run < 500; run++) {
      const items: CatalogueItem[] = Array.from({ length: int(1, 6) }, (_, i) => {
        const withVariants = next() < 0.4;
        return item(`i${i}`, {
          basePrice: paise(999),
          taxRate: D(rates[int(0, rates.length - 1)]),
          variants: withVariants ? Array.from({ length: int(1, 3) }, (_, v) => ({ id: `i${i}v${v}`, name: `V${v}`, price: paise(999), isAvailable: true })) : [],
          addons: Array.from({ length: int(0, 4) }, (_, a) => ({ id: `i${i}a${a}`, name: `A${a}`, price: paise(99), isAvailable: true })),
        });
      });
      const lines: CartLine[] = Array.from({ length: int(1, 12) }, () => {
        const it = items[int(0, items.length - 1)];
        const addonIds = it.addons.filter(() => next() < 0.5).map((a) => a.id);
        return { menuItemId: it.id, variantId: it.variants.length ? it.variants[int(0, it.variants.length - 1)].id : undefined, addonIds, quantity: int(1, 99) };
      });

      const priced = priceLines(lines, catalogueOf(...items));
      const sum = (pick: (l: (typeof priced.lines)[number]) => Prisma.Decimal) => priced.lines.reduce((acc, l) => acc.add(pick(l)), D("0"));
      expect(priced.totalAmount.equals(sum((l) => l.lineTotal)), `run ${run}`).toBe(true);
      expect(priced.taxAmount.equals(sum((l) => l.lineTax)), `run ${run}`).toBe(true);
      expect(priced.subtotalAmount.equals(sum((l) => l.lineSubtotal)), `run ${run}`).toBe(true);
      for (const l of priced.lines) {
        expect(l.lineSubtotal.equals(l.unitPrice.add(l.addonsTotal).mul(l.quantity))).toBe(true);
        expect(l.lineTax.decimalPlaces()).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("TC-PRICE-003 GST breakup", () => {
  it("groups by rate; CGST = ROUND_HALF_UP(tax / 2, 2), SGST = tax − CGST, and CGST + SGST = tax exactly", () => {
    const rows = gstBreakup([
      { taxRate: "18.00", lineSubtotal: "298.00", lineTax: "53.64" },
      { taxRate: "5.00", lineSubtotal: "840.00", lineTax: "42.00" },
      { taxRate: "5.00", lineSubtotal: "265.50", lineTax: "13.28" },
      { taxRate: "5.00", lineSubtotal: "0.10", lineTax: "0.01" },
    ]);
    expect(rows.map((r) => [r.taxRate, r.taxableValue, r.taxAmount, r.cgstRate, r.sgstRate, r.cgstAmount, r.sgstAmount].map((d) => d.toString()))).toEqual([
      ["5", "1105.6", "55.29", "2.5", "2.5", "27.65", "27.64"], // odd paise: 55.29 / 2 = 27.645 → CGST 27.65, SGST 27.64
      ["18", "298", "53.64", "9", "9", "26.82", "26.82"],
    ]);
    for (const row of rows) expect(row.cgstAmount.add(row.sgstAmount).equals(row.taxAmount)).toBe(true);
  });

  it("an odd single paisa goes to CGST by rounding and SGST keeps the remainder", () => {
    const [row] = gstBreakup([{ taxRate: "5.00", lineSubtotal: "0.10", lineTax: "0.01" }]);
    expect([row.cgstAmount.toFixed(2), row.sgstAmount.toFixed(2)]).toEqual(["0.01", "0.00"]);
  });

  it("is exact for random tax totals", () => {
    const next = rng(42);
    for (let i = 0; i < 1000; i++) {
      const tax = (Math.floor(next() * 1_000_000) / 100).toFixed(2);
      const [row] = gstBreakup([{ taxRate: "12.00", lineSubtotal: "1.00", lineTax: tax }]);
      expect(row.cgstAmount.add(row.sgstAmount).toFixed(2)).toBe(tax);
      expect(row.cgstAmount.sub(row.sgstAmount).abs().lte(D("0.01"))).toBe(true);
    }
  });

  it("returns no rows for no lines", () => {
    expect(gstBreakup([])).toEqual([]);
  });
});
