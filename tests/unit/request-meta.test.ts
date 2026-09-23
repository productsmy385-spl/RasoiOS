import { describe, expect, it } from "vitest";
import { clientIpFrom, isIpAddress } from "@/lib/http/request-meta";

// TC-AUDIT-007 (unit half) — `X-Forwarded-For` is client-writable, so an address is only recorded as far as the
// configured number of our own proxies proves it (S1-P23-T003, SC-LOG-01).
describe("TC-AUDIT-007 forwarded-for trust", () => {
  it("records nothing when no proxy is trusted, whatever the client sends", () => {
    expect(clientIpFrom("203.0.113.9", 0)).toBeNull();
    expect(clientIpFrom("1.2.3.4, 203.0.113.9", 0)).toBeNull();
    expect(clientIpFrom(null, 2)).toBeNull();
  });

  it("with one trusted proxy, takes the right-most entry and ignores anything the client prepended", () => {
    expect(clientIpFrom("203.0.113.9", 1)).toBe("203.0.113.9");
    // The client claimed to be 9.9.9.9; our proxy appended what it actually saw.
    expect(clientIpFrom("9.9.9.9, 203.0.113.9", 1)).toBe("203.0.113.9");
    expect(clientIpFrom("evil, 9.9.9.9, 203.0.113.9", 1)).toBe("203.0.113.9");
  });

  it("with two trusted proxies, steps back one entry per proxy", () => {
    expect(clientIpFrom("203.0.113.9, 10.0.0.1", 2)).toBe("203.0.113.9");
    expect(clientIpFrom("9.9.9.9, 203.0.113.9, 10.0.0.1", 2)).toBe("203.0.113.9");
    // Fewer entries than hops means the chain cannot prove an address.
    expect(clientIpFrom("10.0.0.1", 2)).toBeNull();
  });

  it("refuses anything that is not an address", () => {
    expect(clientIpFrom("not-an-ip", 1)).toBeNull();
    expect(clientIpFrom("999.1.1.1", 1)).toBeNull();
    expect(clientIpFrom("<script>alert(1)</script>", 1)).toBeNull();
    expect(isIpAddress("2001:db8::1")).toBe(true);
    expect(isIpAddress("[2001:db8::1]:443")).toBe(true);
    expect(isIpAddress("203.0.113.9:8080")).toBe(true);
    expect(isIpAddress("example.com")).toBe(false);
  });
});
