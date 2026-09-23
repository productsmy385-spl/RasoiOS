import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { MoneyFormatError, parseMoney, percentOf, roundHalfUp, sumMoney, toMoneyString, zodMoney, zodTaxRate } from "@/lib/money";
import { formatMoney, localeForCountry } from "@/lib/ui/format";

// TC-PRICE-001 — money parsing, rounding and formatting (S1-P02-T010, ADR-010 §1).

describe("parseMoney", () => {
  it.each([
    ["0", "0"],
    ["0.5", "0.5"],
    ["480", "480"],
    ["480.00", "480"],
    ["9999999999.99", "9999999999.99"],
  ])("accepts %s", (input, expected) => {
    expect(parseMoney(input).toString()).toBe(expected);
  });

  it.each(["-1", "1e3", "1E3", "0.005", "1.005", " 1", "1 ", "1,000", "", ".5", "5.", "+1", "0x10", "12345678901", "NaN", "Infinity"])(
    "rejects %j",
    (input) => {
      expect(() => parseMoney(input)).toThrow(MoneyFormatError);
    },
  );

  it.each([1, 1.5, null, undefined, {}, ["1"]])("rejects non-string %j", (input) => {
    expect(() => parseMoney(input)).toThrow(MoneyFormatError);
  });
});

describe("rounding and arithmetic", () => {
  it.each([
    ["0.005", "0.01"],
    ["0.004", "0.00"],
    ["0.015", "0.02"],
    ["2.675", "2.68"], // a float would give 2.67
    ["1.005", "1.01"], // a float would give 1.00
    ["-0.005", "-0.01"],
    ["123.4549", "123.45"],
  ])("roundHalfUp(%s) = %s", (input, expected) => {
    expect(roundHalfUp(input).toFixed(2)).toBe(expected);
  });

  it("does not depend on the global Decimal rounding mode", () => {
    const Decimal = Prisma.Decimal;
    const original = Decimal.rounding;
    try {
      Decimal.set({ rounding: Decimal.ROUND_DOWN });
      expect(roundHalfUp("0.005").toFixed(2)).toBe("0.01");
    } finally {
      Decimal.set({ rounding: original });
    }
  });

  it("sums exactly (0.1 + 0.2 = 0.3)", () => {
    expect(sumMoney(["0.10", "0.20"]).toFixed(2)).toBe("0.30");
    expect(sumMoney([]).toFixed(2)).toBe("0.00");
    expect(sumMoney(Array(1000).fill("0.01")).toFixed(2)).toBe("10.00");
  });

  it("computes per-line tax half-up", () => {
    expect(percentOf("99.90", "5").toFixed(2)).toBe("5.00"); // 4.995 → 5.00
    expect(percentOf("333.33", "18").toFixed(2)).toBe("60.00"); // 59.9994 → 60.00
    expect(percentOf("10.10", "8.5").toFixed(2)).toBe("0.86"); // 0.8585 → 0.86
  });

  it("serialises to two-decimal strings", () => {
    expect(toMoneyString("480")).toBe("480.00");
    expect(toMoneyString(new Prisma.Decimal("0.1"))).toBe("0.10");
    expect(toMoneyString("0.125")).toBe("0.13");
  });
});

describe("zod schemas", () => {
  it("parses a valid amount into a Decimal and rejects bad ones", () => {
    const schema = zodMoney();
    const parsed = schema.parse("120.50");
    expect(parsed).toBeInstanceOf(Prisma.Decimal);
    expect(parsed.toFixed(2)).toBe("120.50");
    expect(schema.safeParse("1e3").success).toBe(false);
    expect(schema.safeParse(120.5).success).toBe(false);
  });

  it("applies positive, min and max bounds", () => {
    expect(zodMoney({ positive: true }).safeParse("0").success).toBe(false);
    expect(zodMoney({ positive: true }).safeParse("0.01").success).toBe(true);
    expect(zodMoney({ min: "10" }).safeParse("9.99").success).toBe(false);
    expect(zodMoney({ max: "100" }).safeParse("100.01").success).toBe(false);
    expect(zodMoney({ min: "10", max: "100" }).safeParse("50").success).toBe(true);
  });

  it("validates tax rates between 0 and 100 with up to 2 decimals", () => {
    expect(zodTaxRate.parse("18.5").toFixed(2)).toBe("18.50");
    for (const bad of ["100.01", "-5", "5.125", "abc", "1000"]) expect(zodTaxRate.safeParse(bad).success, bad).toBe(false);
  });
});

describe("formatMoney", () => {
  it("formats INR with Indian digit grouping and USD with US grouping", () => {
    expect(formatMoney("1234567.50", "INR", "en-IN")).toBe("₹12,34,567.50");
    expect(formatMoney("1234567.50", "USD", "en-US")).toBe("$1,234,567.50");
    expect(formatMoney("0", "INR", "en-IN")).toBe("₹0.00");
  });

  it("formats the exact decimal, beyond float precision", () => {
    expect(formatMoney("9999999999.99", "USD", "en-US")).toBe("$9,999,999,999.99");
  });

  it("refuses numbers and malformed strings", () => {
    expect(() => formatMoney("1e3", "INR")).toThrow(RangeError);
    expect(() => formatMoney(12 as unknown as string, "INR")).toThrow(RangeError);
  });

  it("maps restaurant countries to display locales", () => {
    expect(localeForCountry("IN")).toBe("en-IN");
    expect(localeForCountry("us")).toBe("en-US");
    expect(localeForCountry("ZZ")).toBe("en");
    expect(localeForCountry(null)).toBe("en");
  });
});
