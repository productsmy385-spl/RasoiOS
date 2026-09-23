import { readFileSync } from "node:fs";
import path from "node:path";
import type { TenantRole } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { asPlatformAdmin, asSeedUser, seedOnce } from "./helpers/actors";
import { ENDPOINT_REGISTRY, type Probe } from "./rbac/endpoint-registry";

// TC-RBAC-101…150 — for every permission row of security.md §3.3, each of the six roles is allowed or denied at a
// real endpoint (S1-P05-T002, SC-RBAC-01). TC-RBAC-014 — a row without an endpoint fails once its owning task is done.
type Cell = "allow" | "deny" | "restricted";
type Row = { row: number; permission: string; allow: Record<"SUPER_ADMIN" | TenantRole, Cell>; test: string };

const root = path.resolve(__dirname, "../..");
const MATRIX: Row[] = JSON.parse(readFileSync(path.join(root, "tests/fixtures/rbac-matrix.json"), "utf8"));
const ROLES = ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"] as const;

/** Codes and redirects that mean "stopped by authorization"; anything past the guard means "allowed". */
const DENIED_CODES = new Set(["FORBIDDEN", "NO_ACTIVE_MEMBERSHIP"]);
const PAST_GUARD_CODES = new Set(["NOT_FOUND", "VALIDATION_ERROR"]);
const DENIED_REDIRECTS = [/^\/account\/forbidden/, /^\/account\/no-access/];

function classify(result: unknown): "allowed" | "denied" | string {
  const value = result as { redirect?: string; notFound?: true; ok?: boolean; error?: { code: string } } | null;
  if (value && typeof value.redirect === "string") {
    return DENIED_REDIRECTS.some((re) => re.test(value.redirect!)) ? "denied" : `unexpected redirect ${value.redirect}`;
  }
  if (value && value.notFound) return "allowed";
  if (value && typeof value.ok === "boolean") {
    if (value.ok) return "allowed";
    if (DENIED_CODES.has(value.error!.code)) return "denied";
    if (PAST_GUARD_CODES.has(value.error!.code)) return "allowed";
    return `unexpected error ${value.error!.code}`;
  }
  return "allowed"; // a rendered Server Component
}

async function actAs(role: (typeof ROLES)[number]): Promise<void> {
  if (role === "SUPER_ADMIN") await asPlatformAdmin();
  else await asSeedUser("A", role);
}

function taskStatus(taskId: string): string {
  const tasks = readFileSync(path.join(root, "knowledge/implementation/slice-01/tasks.md"), "utf8");
  const row = tasks.split("\n").find((line) => line.includes(`| ${taskId} |`));
  if (!row) throw new Error(`Task ${taskId} not found in tasks.md`);
  const cells = row.split("|").map((c) => c.trim());
  return cells[cells.length - 2];
}

beforeAll(seedOnce, 120_000);

describe("TC-RBAC-014 matrix ↔ endpoint registry", () => {
  it("every matrix row has a registry entry and every entry is a matrix row", () => {
    expect(MATRIX.map((r) => r.permission).sort()).toEqual(Object.keys(ENDPOINT_REGISTRY).sort());
    expect(MATRIX.map((r) => r.permission).sort()).toEqual([...PERMISSIONS].sort());
  });

  it("a row without an endpoint is only allowed while its owning task is unfinished", () => {
    const overdue = Object.entries(ENDPOINT_REGISTRY)
      .filter(([, entry]) => "todo" in entry)
      .map(([permission, entry]) => ({ permission, task: (entry as { todo: string }).todo }))
      .filter(({ task }) => taskStatus(task) === "COMPLETED");
    expect(overdue, "owning task is COMPLETED — add a probe for this row to tests/integration/rbac/endpoint-registry.ts").toEqual([]);
  });
});

describe("TC-RBAC-101…150 per-permission allow/deny at real endpoints", () => {
  for (const row of MATRIX) {
    const entry = ENDPOINT_REGISTRY[row.permission as keyof typeof ENDPOINT_REGISTRY];
    if (!entry || "todo" in entry) {
      it.todo(`${row.test} ${row.permission} — endpoint built by ${entry ? entry.todo : "unmapped"}`);
      continue;
    }
    const probe = entry as Probe;
    it(`${row.test} ${row.permission} via ${probe.endpoint}`, async () => {
      const outcomes: Record<string, string> = {};
      const expected: Record<string, string> = {};
      for (const role of ROLES) {
        await actAs(role);
        outcomes[role] = classify(await probe.invoke());
        expected[role] = row.allow[role] === "deny" ? "denied" : "allowed";
      }
      expect(outcomes).toEqual(expected);
    });
  }
});
