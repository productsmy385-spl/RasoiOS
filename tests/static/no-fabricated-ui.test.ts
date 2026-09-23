import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// TC-FOUND-007 — the UI must not show fabricated status, health or security claims,
// hard-coded demo tenants, or actions that pretend to do work that is not implemented (S1-P01-T007).
const root = path.resolve(__dirname, "../..");
const SCANNED_DIRS = ["app", "components"];

const FORBIDDEN: { marker: string; reason: string }[] = [
  { marker: "demo-tenant-id", reason: "hard-coded demo tenant fallback (BA-28)" },
  { marker: "/r/demo", reason: "link to a restaurant that does not exist" },
  { marker: "System Operational", reason: "fabricated health indicator (BA-30)" },
  { marker: "Agent API Status", reason: "fabricated agent status (BA-30)" },
  { marker: "100% Operational", reason: "fabricated platform health (BA-30)" },
  { marker: "Live Instance", reason: "fabricated environment badge" },
  { marker: "Tenant Isolated", reason: "unverified security claim" },
  { marker: "RBAC Active", reason: "unverified security claim" },
  { marker: "Strict DB Isolation", reason: "unverified security claim" },
  { marker: "Foundation Active", reason: "fabricated status badge" },
  { marker: "— Operational", reason: "fabricated platform status in the footer" },
  { marker: "Tenant Context Protected", reason: "unverified security claim in the footer" },
  { marker: "Platform Governance Mode", reason: "decorative claim in the admin header" },
  { marker: "Publish Now", reason: "social publishing is not integrated (BA-29)" },
  { marker: "SocialPostStatus.PUBLISHED", reason: "client-side assignment of PUBLISHED without a real integration (BA-29)" },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const files = SCANNED_DIRS.flatMap((dir) => sourceFiles(path.join(root, dir)));

describe("TC-FOUND-007 no fabricated UI", () => {
  it("scans the application source", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(FORBIDDEN)("does not contain `$marker` ($reason)", ({ marker }) => {
    const offenders = files
      .filter((file) => readFileSync(file, "utf8").includes(marker))
      .map((file) => path.relative(root, file));
    expect(offenders).toEqual([]);
  });
});
