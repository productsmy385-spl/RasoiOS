import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { PrintJobStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { LEASE_MS, PRINT_JOB_TRANSITIONS, RETRY_BASE_MS, assertTransition, backoffMs, canTransition, nextAttemptAt, outcomeOfFailure } from "@/lib/print/state-machine";
import { connectionAddressIssue, isPrivateIpv4, isPrivateLanAddress, isValidPort } from "@/lib/validation/printing";

/**
 * TC-PRINT-002 (job state machine), TC-PRINT-006 (PRINTED is written in one place only) and TC-PRINT-007 (LAN address
 * validation) — the queue rules that do not need a database (S1-P16-T001/T004/T005).
 */
const root = path.resolve(__dirname, "../..");

describe("TC-PRINT-002 print job state machine", () => {
  it("allows exactly the transitions in architecture.md §6.3", () => {
    expect(PRINT_JOB_TRANSITIONS).toEqual({
      PENDING: ["PROCESSING", "FAILED"],
      PROCESSING: ["PRINTED", "PENDING", "FAILED"],
      PRINTED: [],
      FAILED: ["PENDING"],
    });
  });

  it("refuses everything else, including any way back out of PRINTED", () => {
    const all = Object.values(PrintJobStatus);
    const allowed = new Set(all.flatMap((from) => PRINT_JOB_TRANSITIONS[from].map((to) => `${from}->${to}`)));
    for (const from of all) {
      for (const to of all) {
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(allowed.has(`${from}->${to}`));
      }
    }
    expect(canTransition("PENDING", "PRINTED"), "a job may never skip the agent's acknowledgement").toBe(false);
    expect(canTransition("PRINTED", "PENDING")).toBe(false);
    expect(canTransition("FAILED", "PRINTED")).toBe(false);
    expect(() => assertTransition("PRINTED", "PENDING")).toThrowError(expect.objectContaining({ code: "INVALID_TRANSITION", statusCode: 409 }));
    expect(() => assertTransition("PENDING", "PROCESSING")).not.toThrow();
  });

  it("backs off 10 s, 20 s, 40 s and leases for 60 s (ADR-007 §3–4)", () => {
    expect(RETRY_BASE_MS).toBe(10_000);
    expect(LEASE_MS).toBe(60_000);
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([10_000, 20_000, 40_000, 80_000]);
    const at = new Date("2026-09-15T08:30:00.000Z");
    expect(nextAttemptAt(at, 1).toISOString()).toBe("2026-09-15T08:30:10.000Z");
    expect(nextAttemptAt(at, 2).toISOString()).toBe("2026-09-15T08:30:20.000Z");
  });

  it("retries a failure while attempts remain and gives up at the limit", () => {
    const at = new Date("2026-09-15T08:30:00.000Z");
    expect(outcomeOfFailure(1, 3, at)).toEqual({ status: "PENDING", nextAttemptAt: new Date("2026-09-15T08:30:10.000Z") });
    expect(outcomeOfFailure(2, 3, at)).toEqual({ status: "PENDING", nextAttemptAt: new Date("2026-09-15T08:30:20.000Z") });
    expect(outcomeOfFailure(3, 3, at)).toEqual({ status: "FAILED", nextAttemptAt: null });
    expect(outcomeOfFailure(4, 3, at)).toEqual({ status: "FAILED", nextAttemptAt: null });
  });
});

describe("TC-PRINT-006 PRINTED is written in exactly one place", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }

  it("no code outside lib/data/printing.ts#ackJob assigns the PRINTED status", () => {
    const files = ["app", "lib", "components"].flatMap((dir) => sourceFiles(path.join(root, dir)));
    // An assignment looks like `status: PrintJobStatus.PRINTED` or `status: "PRINTED"` — reading or comparing is fine.
    const assignment = /status:\s*(PrintJobStatus\.PRINTED|["']PRINTED["'])/;
    const offenders = files
      .filter((file) => assignment.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file).split(path.sep).join("/"));
    expect(offenders).toEqual(["lib/data/printing.ts"]);

    // …and inside that file, every occurrence is within ackJob.
    const source = readFileSync(path.join(root, "lib/data/printing.ts"), "utf8");
    const start = source.indexOf("export async function ackJob");
    const end = source.indexOf("// ─── Manual retry");
    expect(start, "ackJob is still the acknowledging function").toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const global = new RegExp(assignment.source, "g");
    const inFile = source.match(global) ?? [];
    const inAckJob = source.slice(start, end).match(new RegExp(assignment.source, "g")) ?? [];
    expect(inFile.length).toBeGreaterThan(0);
    expect(inAckJob.length, "every PRINTED assignment lives inside ackJob").toBe(inFile.length);
  });
});

describe("TC-PRINT-007 printer address validation (SC-PRINT-06)", () => {
  it("accepts private IPv4 addresses with or without a port", () => {
    for (const address of ["192.168.1.50:9100", "10.0.0.7", "172.16.4.9:9100", "172.31.255.254", "10.255.255.255:1", "192.168.0.1:65535"]) {
      expect(isPrivateLanAddress(address), address).toBe(true);
    }
  });

  it("rejects public addresses, loopback, link-local and host names", () => {
    for (const address of [
      "8.8.8.8",
      "1.1.1.1:9100",
      "172.32.0.1",
      "172.15.0.1",
      "169.254.1.1",
      "127.0.0.1:9100",
      "0.0.0.0",
      "localhost",
      "localhost:9100",
      "printer.local",
      "attacker.example.com",
      "192.168.1.50.evil.com",
      "http://192.168.1.50:9100",
      "192.168.1.50:9100/print",
      "192.168.01.50",
      "192.168.1",
      "192.168.1.256",
      "::1",
      "192.168.1.50:9100:9100",
    ]) {
      expect(isPrivateLanAddress(address), address).toBe(false);
    }
  });

  it("rejects ports outside 1–65535", () => {
    expect(isValidPort("1")).toBe(true);
    expect(isValidPort("65535")).toBe(true);
    for (const port of ["0", "65536", "99999", "-1", "91 00", "", "9100a"]) expect(isValidPort(port), port).toBe(false);
    expect(isPrivateLanAddress("192.168.1.50:0")).toBe(false);
    expect(isPrivateLanAddress("192.168.1.50:65536")).toBe(false);
  });

  it("checks the address against the connection type it belongs to", () => {
    expect(connectionAddressIssue("LAN", "192.168.1.50:9100")).toBeNull();
    expect(connectionAddressIssue("LAN", "8.8.8.8")).toMatch(/private LAN address/);
    expect(connectionAddressIssue("USB", "USB001")).toBeNull();
    expect(connectionAddressIssue("USB", "Star TSP100 (copy 1)")).toBeNull();
    expect(connectionAddressIssue("USB", "rm -rf /; USB001")).toMatch(/USB device/);
    expect(connectionAddressIssue("USB", "USB\u001B001")).toMatch(/USB device/);
  });

  it("classifies raw IPv4 literals", () => {
    expect(isPrivateIpv4("10.0.0.1")).toBe(true);
    expect(isPrivateIpv4("172.16.0.1")).toBe(true);
    expect(isPrivateIpv4("172.31.0.1")).toBe(true);
    expect(isPrivateIpv4("172.15.0.1")).toBe(false);
    expect(isPrivateIpv4("11.0.0.1")).toBe(false);
  });
});
