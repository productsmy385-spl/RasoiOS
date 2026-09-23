import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  businessDateFor,
  fixedClock,
  isOpenAt,
  isValidTimeZone,
  nextChange,
  now,
  overrideClock,
  parseIsoDate,
  toIsoDate,
  utcRangeForBusinessDates,
  zonedTimeToUtc,
  type Shift,
} from "@/lib/time";
import { formatBusinessDate, formatInZone } from "@/lib/ui/format";

// TC-TZ-001, TC-TZ-002, TC-TZ-004 — restaurant-local dates, ranges and opening hours (S1-P02-T011, ADR-010 §5).
// Every scenario runs under three different process time zones: results must not depend on the server's TZ.
const PROCESS_ZONES = ["UTC", "Asia/Kolkata", "America/Los_Angeles"];
const originalTz = process.env.TZ;
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

function underEachProcessZone(title: string, body: () => void) {
  for (const zone of PROCESS_ZONES) {
    it(`${title} (process TZ=${zone})`, () => {
      process.env.TZ = zone;
      // Node applies a changed TZ immediately; the January offset proves which zone is active.
      expect(new Date("2026-01-15T00:00:00Z").getTimezoneOffset()).toBe({ UTC: 0, "Asia/Kolkata": -330, "America/Los_Angeles": 480 }[zone]);
      body();
    });
  }
}

describe("TC-TZ-001 isValidTimeZone", () => {
  it("accepts IANA names including links such as Asia/Kolkata", () => {
    for (const tz of ["Asia/Kolkata", "Asia/Calcutta", "America/New_York", "Europe/London", "America/Argentina/Buenos_Aires", "UTC", "Etc/GMT-5"]) {
      expect(isValidTimeZone(tz), tz).toBe(true);
    }
  });

  it("rejects abbreviations, offsets and garbage", () => {
    for (const tz of ["IST", "GMT+5:30", "+05:30", "UTC+05:30", "Asia/Nowhere", "", "Asia/Kolkata ", "asia kolkata", null, 5]) {
      expect(isValidTimeZone(tz), String(tz)).toBe(false);
    }
  });
});

describe("business dates", () => {
  underEachProcessZone("uses the restaurant's calendar date, not the server's", () => {
    const instant = new Date("2026-09-15T19:00:00Z"); // 00:30 on 16 Sep in Kolkata, 15:00 on 15 Sep in New York
    expect(toIsoDate(businessDateFor(instant, "Asia/Kolkata"))).toBe("2026-09-16");
    expect(toIsoDate(businessDateFor(instant, "America/New_York"))).toBe("2026-09-15");
  });

  it("parses only real YYYY-MM-DD dates", () => {
    expect(toIsoDate(parseIsoDate("2024-02-29"))).toBe("2024-02-29");
    for (const bad of ["2026-02-29", "2026-13-01", "2026-9-1", "20260901"]) expect(() => parseIsoDate(bad), bad).toThrow(RangeError);
  });
});

describe("TC-TZ-004 utcRangeForBusinessDates", () => {
  underEachProcessZone("covers Asia/Kolkata (no DST, +05:30)", () => {
    const { start, end } = utcRangeForBusinessDates("2026-09-15", "2026-09-15", "Asia/Kolkata");
    expect(start.toISOString()).toBe("2026-09-14T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-15T18:30:00.000Z");
  });

  underEachProcessZone("covers a multi-day America/New_York range", () => {
    const { start, end } = utcRangeForBusinessDates("2026-09-01", "2026-09-30", "America/New_York");
    expect(start.toISOString()).toBe("2026-09-01T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-01T04:00:00.000Z");
  });

  underEachProcessZone("makes the New York DST start day 23 hours long", () => {
    const { start, end } = utcRangeForBusinessDates("2026-03-08", "2026-03-08", "America/New_York");
    expect(start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(23 * 3_600_000);
  });

  underEachProcessZone("makes the New York DST end day 25 hours long", () => {
    const { start, end } = utcRangeForBusinessDates("2026-11-01", "2026-11-01", "America/New_York");
    expect(end.getTime() - start.getTime()).toBe(25 * 3_600_000);
  });

  underEachProcessZone("handles Europe/London DST start and end", () => {
    const spring = utcRangeForBusinessDates("2026-03-29", "2026-03-29", "Europe/London");
    expect(spring.start.toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(spring.end.toISOString()).toBe("2026-03-29T23:00:00.000Z");
    const autumn = utcRangeForBusinessDates("2026-10-25", "2026-10-25", "Europe/London");
    expect(autumn.end.getTime() - autumn.start.getTime()).toBe(25 * 3_600_000);
  });

  it("rejects an inverted range", () => {
    expect(() => utcRangeForBusinessDates("2026-09-16", "2026-09-15", "UTC")).toThrow(RangeError);
  });

  it("resolves DST gaps forward by the gap length and overlaps to the earlier instant", () => {
    // 02:30 does not exist in New York on 8 Mar 2026 → 03:30 EDT = 07:30Z (Temporal "compatible" disambiguation).
    expect(zonedTimeToUtc({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, "America/New_York").toISOString()).toBe("2026-03-08T07:30:00.000Z");
    // 01:30 happens twice on 1 Nov 2026 → the earlier (EDT) instant.
    expect(zonedTimeToUtc({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, "America/New_York").toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });
});

// Spice Route style hours: split lunch/dinner shifts, Friday dinner closes after midnight, Monday closed.
const HOURS: Shift[] = [
  { dayOfWeek: 1, isClosed: true, opensAt: null, closesAt: null },
  ...[2, 3, 4].flatMap((d) => [
    { dayOfWeek: d, isClosed: false, opensAt: "12:00", closesAt: "15:30" },
    { dayOfWeek: d, isClosed: false, opensAt: "19:00", closesAt: "23:30" },
  ]),
  { dayOfWeek: 5, isClosed: false, opensAt: "12:00", closesAt: "15:30" },
  { dayOfWeek: 5, isClosed: false, opensAt: "19:00", closesAt: "01:00" },
  { dayOfWeek: 6, isClosed: false, opensAt: "12:00", closesAt: "23:00" },
  { dayOfWeek: 7, isClosed: false, opensAt: "12:00", closesAt: "23:00" },
];
const KOLKATA = "Asia/Kolkata";
const at = (localIso: string) => {
  const [date, time] = localIso.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return zonedTimeToUtc({ year, month, day, hour, minute }, KOLKATA);
};

describe("TC-TZ-002 isOpenAt and nextChange", () => {
  // 2026-09-15 is a Tuesday; 2026-09-18 a Friday; 2026-09-21 a Monday.
  underEachProcessZone("handles split shifts", () => {
    expect(isOpenAt(HOURS, at("2026-09-15T13:00"), KOLKATA)).toBe(true);
    expect(isOpenAt(HOURS, at("2026-09-15T15:30"), KOLKATA)).toBe(false); // closing time is exclusive
    expect(isOpenAt(HOURS, at("2026-09-15T17:00"), KOLKATA)).toBe(false); // between shifts
    expect(isOpenAt(HOURS, at("2026-09-15T19:00"), KOLKATA)).toBe(true);
  });

  underEachProcessZone("handles an overnight shift into the next day", () => {
    expect(isOpenAt(HOURS, at("2026-09-18T23:45"), KOLKATA)).toBe(true); // Friday night
    expect(isOpenAt(HOURS, at("2026-09-19T00:30"), KOLKATA)).toBe(true); // still Friday's shift, Saturday 00:30
    expect(isOpenAt(HOURS, at("2026-09-19T01:00"), KOLKATA)).toBe(false);
    expect(isOpenAt(HOURS, at("2026-09-16T00:30"), KOLKATA)).toBe(false); // Tuesday's shift is not overnight
  });

  underEachProcessZone("keeps closed days closed", () => {
    expect(isOpenAt(HOURS, at("2026-09-21T13:00"), KOLKATA)).toBe(false);
    expect(isOpenAt([], at("2026-09-21T13:00"), KOLKATA)).toBe(false);
  });

  it("finds the next opening or closing", () => {
    expect(nextChange(HOURS, at("2026-09-15T13:00"), KOLKATA)).toEqual({ at: at("2026-09-15T15:30"), opens: false });
    expect(nextChange(HOURS, at("2026-09-15T16:00"), KOLKATA)).toEqual({ at: at("2026-09-15T19:00"), opens: true });
    expect(nextChange(HOURS, at("2026-09-18T23:00"), KOLKATA)).toEqual({ at: at("2026-09-19T01:00"), opens: false });
    // Sunday night after closing → Monday is closed → opens Tuesday noon.
    expect(nextChange(HOURS, at("2026-09-20T23:30"), KOLKATA)).toEqual({ at: at("2026-09-22T12:00"), opens: true });
    expect(nextChange([], at("2026-09-20T23:30"), KOLKATA)).toBeNull();
  });

  it("treats back-to-back shifts as one open period", () => {
    const continuous: Shift[] = [
      { dayOfWeek: 2, isClosed: false, opensAt: "10:00", closesAt: "14:00" },
      { dayOfWeek: 2, isClosed: false, opensAt: "14:00", closesAt: "22:00" },
    ];
    expect(nextChange(continuous, at("2026-09-15T11:00"), KOLKATA)).toEqual({ at: at("2026-09-15T22:00"), opens: false });
  });
});

describe("display formatting in the restaurant time zone", () => {
  underEachProcessZone("formats an instant in the restaurant's zone", () => {
    expect(formatInZone("2026-09-15T18:30:00Z", KOLKATA, "time", "en-GB")).toBe("00:00");
    expect(formatInZone("2026-09-15T18:30:00Z", "America/New_York", "time", "en-GB")).toBe("14:30");
    expect(formatInZone(new Date("2026-09-15T18:30:00Z"), KOLKATA, "date", "en-GB")).toBe("16 Sept 2026");
  });

  it("formats business dates without shifting them", () => {
    expect(formatBusinessDate("2026-09-15", "en-GB")).toBe("15 Sept 2026");
    expect(() => formatBusinessDate("15/09/2026")).toThrow(RangeError);
    expect(() => formatInZone("not a date", KOLKATA, "time")).toThrow(RangeError);
  });
});

describe("injectable clock", () => {
  let restore: () => void;
  beforeAll(() => {
    restore = overrideClock(fixedClock("2026-09-15T18:25:00Z"));
  });
  afterAll(() => restore());

  it("lets tests pin 'now' at a boundary", () => {
    expect(now().toISOString()).toBe("2026-09-15T18:25:00.000Z");
    expect(toIsoDate(businessDateFor(now(), KOLKATA))).toBe("2026-09-15"); // 23:55 in Kolkata
  });
});
