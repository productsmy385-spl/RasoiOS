import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  createKitchenSectionSchema,
  isCountryCode,
  isSupportedCurrency,
  openingHoursIssues,
  replaceOpeningHoursSchema,
  timeZoneField,
  updateBrandingSchema,
  updateOperationalSettingsSchema,
  type OpeningDay,
} from "@/lib/validation/settings";

// Pure rules behind SA-RST-02/03/04 and SA-KSEC-01 (S1-P07-T001, S1-P07-T003). The database-backed behaviour is in
// tests/integration/settings/.

const closedWeek = (): OpeningDay[] => Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, isClosed: true, shifts: [] }));
function week(overrides: Record<number, Array<[string, string]>>): OpeningDay[] {
  return closedWeek().map((day) =>
    overrides[day.dayOfWeek] ? { dayOfWeek: day.dayOfWeek, isClosed: false, shifts: overrides[day.dayOfWeek].map(([opensAt, closesAt]) => ({ opensAt, closesAt })) } : day,
  );
}

describe("accent colour contrast (E02 brand_accent_hex)", () => {
  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // Order does not matter.
    expect(contrastRatio("#FBF9F5", "#1A1715")).toBeCloseTo(contrastRatio("#1A1715", "#FBF9F5"), 10);
  });

  it("accepts accents with ≥4.5:1 against #FBF9F5 (stored uppercase) and rejects lighter ones", () => {
    expect(updateBrandingSchema.parse({ brandAccentHex: "#7c2d12" })).toEqual({ brandAccentHex: "#7C2D12" });
    expect(updateBrandingSchema.parse({ brandAccentHex: "#1A1715" })).toEqual({ brandAccentHex: "#1A1715" });
    for (const light of ["#D97706", "#FFFF00", "#FBF9F5", "#10B981"]) {
      expect(updateBrandingSchema.safeParse({ brandAccentHex: light }).success, light).toBe(false);
    }
    for (const malformed of ["7C2D12", "#7C2D1", "#GGGGGG", "red"]) {
      expect(updateBrandingSchema.safeParse({ brandAccentHex: malformed }).success, malformed).toBe(false);
    }
    expect(updateBrandingSchema.parse({ brandAccentHex: "" })).toEqual({ brandAccentHex: null });
  });
});

describe("opening hours rules (E03)", () => {
  it("accepts split shifts, overnight closing and touching shifts", () => {
    expect(openingHoursIssues(week({ 1: [["12:00", "15:30"], ["19:00", "23:30"]], 5: [["19:00", "01:00"]], 6: [["09:00", "12:00"], ["12:00", "15:00"]] }))).toEqual([]);
    // Friday's shift ends at 01:00 Saturday; Saturday opens at 01:00 — touching, not overlapping.
    expect(openingHoursIssues(week({ 5: [["19:00", "01:00"]], 6: [["01:00", "03:00"]] }))).toEqual([]);
  });

  it("rejects overlapping shifts on the same day", () => {
    const issues = openingHoursIssues(week({ 2: [["12:00", "15:30"], ["15:00", "18:00"]] }));
    expect(issues).toEqual([{ path: ["days", 1, "shifts", 1], message: "This shift overlaps another shift" }]);
  });

  it("rejects an overnight shift running into the next day's first shift, including Sunday into Monday", () => {
    expect(openingHoursIssues(week({ 5: [["19:00", "02:00"]], 6: [["01:00", "04:00"]] }))).toHaveLength(1);
    expect(openingHoursIssues(week({ 7: [["20:00", "03:00"]], 1: [["02:00", "06:00"]] }))).toHaveLength(1);
    expect(openingHoursIssues(week({ 7: [["20:00", "03:00"]], 1: [["03:00", "06:00"]] }))).toEqual([]);
  });

  it("rejects closed days with shifts, open days without shifts, equal open/close times, and incomplete weeks", () => {
    const withShiftWhileClosed = closedWeek();
    withShiftWhileClosed[0] = { dayOfWeek: 1, isClosed: true, shifts: [{ opensAt: "10:00", closesAt: "12:00" }] };
    expect(openingHoursIssues(withShiftWhileClosed)[0].message).toBe("A closed day has no shifts");

    const openWithoutShifts = closedWeek();
    openWithoutShifts[2] = { dayOfWeek: 3, isClosed: false, shifts: [] };
    expect(openingHoursIssues(openWithoutShifts)[0].message).toBe("Add a shift or mark the day closed");

    expect(openingHoursIssues(week({ 4: [["10:00", "10:00"]] }))[0].message).toBe("Closing time must differ from opening time");
    expect(openingHoursIssues(closedWeek().slice(0, 6)).map((i) => i.message)).toContain("Send all seven days, Monday to Sunday");
    const duplicate = closedWeek();
    duplicate[6] = { dayOfWeek: 1, isClosed: true, shifts: [] };
    expect(openingHoursIssues(duplicate).map((i) => i.message)).toContain("Monday is listed twice");
  });

  it("the schema reports rules as field errors and caps shifts at three per day", () => {
    const tooMany = week({ 1: [["06:00", "07:00"], ["08:00", "09:00"], ["10:00", "11:00"], ["12:00", "13:00"]] });
    expect(replaceOpeningHoursSchema.safeParse({ days: tooMany }).success).toBe(false);
    expect(replaceOpeningHoursSchema.safeParse({ days: week({ 1: [["25:00", "26:00"]] }) }).success).toBe(false);
    expect(replaceOpeningHoursSchema.safeParse({ days: week({ 1: [["9:00", "17:00"]] }) }).success).toBe(false);
    expect(replaceOpeningHoursSchema.parse({ days: week({ 1: [["09:00", "17:00"]] }) }).days).toHaveLength(7);
  });
});

describe("operational settings (E02, SA-RST-04)", () => {
  const valid = { timezone: "Asia/Kolkata", currencyCode: "INR", countryCode: "IN", defaultOrderType: "DINE_IN", autoPrintKot: true } as const;

  it("TC-TZ-001 time zone field accepts Asia/Kolkata and rejects IST and GMT+5:30", () => {
    expect(timeZoneField.safeParse("Asia/Kolkata").success).toBe(true);
    expect(timeZoneField.safeParse("IST").success).toBe(false);
    expect(timeZoneField.safeParse("GMT+5:30").success).toBe(false);
  });

  it("validates ISO 4217 currencies and ISO 3166 countries (normalised to uppercase)", () => {
    expect(isSupportedCurrency("INR") && isSupportedCurrency("USD") && isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("XYZ") || isSupportedCurrency("inr") || isSupportedCurrency("RUPEE")).toBe(false);
    expect(isCountryCode("IN") && isCountryCode("US") && isCountryCode("GB")).toBe(true);
    expect(isCountryCode("UK") || isCountryCode("EU") || isCountryCode("ZZ") || isCountryCode("in")).toBe(false);
    expect(updateOperationalSettingsSchema.parse({ ...valid, currencyCode: "usd", countryCode: "us" })).toMatchObject({ currencyCode: "USD", countryCode: "US" });
  });

  it("TC-REST-009 GSTIN: valid values stored uppercase, malformed rejected, blank clears", () => {
    expect(updateOperationalSettingsSchema.parse({ ...valid, gstin: " 29abcde1234f1z5 " }).gstin).toBe("29ABCDE1234F1Z5");
    for (const bad of ["29ABCDE1234F1Z", "29ABCDE1234F1X5", "ABCDE1234F1Z529", "29ABCDE1234F0Z5"]) {
      expect(updateOperationalSettingsSchema.safeParse({ ...valid, gstin: bad }).success, bad).toBe(false);
    }
    expect(updateOperationalSettingsSchema.parse({ ...valid, gstin: "" }).gstin).toBeNull();
    expect(updateOperationalSettingsSchema.parse({ ...valid }).gstin).toBeUndefined();
  });
});

describe("kitchen section input (E04)", () => {
  it("normalises codes to uppercase and enforces ^[A-Z0-9_]{2,24}$ and name length", () => {
    expect(createKitchenSectionSchema.parse({ name: "Tandoor", code: " tandoor_1 " })).toEqual({ name: "Tandoor", code: "TANDOOR_1" });
    for (const code of ["T", "TAN DOOR", "TAN-DOOR", "X".repeat(25)]) {
      expect(createKitchenSectionSchema.safeParse({ name: "Tandoor", code }).success, code).toBe(false);
    }
    expect(createKitchenSectionSchema.safeParse({ name: "T", code: "TANDOOR" }).success).toBe(false);
  });
});
