import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { analyzeTenantScope, importsPrismaClient } from "./lib/tenant-scope-analyzer";

// TC-TENANT-002 — unscoped tenant queries and direct Prisma imports fail CI before review (S1-P02-T006, SC-TEN-03).
const root = path.resolve(__dirname, "../..");

/** Tenant-owned models = every Prisma model with a `tenantId` field (derived from the DMMF, so new models are covered). */
const tenantDelegates = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === "tenantId"))
    .map((m) => m.name[0].toLowerCase() + m.name.slice(1)),
);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");
const appFiles = ["app", "lib", "components"].flatMap((d) => sourceFiles(path.join(root, d)));

/** Paths allowed to import the Prisma client (ADR-008). */
const ALLOWED_PRISMA_PATHS = [/^lib\/data\//, /^lib\/db\//, /^prisma\//, /^tests\//, /^scripts\//];

/**
 * BASELINE — files that import Prisma directly at the schema-v2 retrofit (baseline-audit BA-07…BA-13), mirroring the
 * ESLint baseline exception list. Each leaves this list when its retrofit/rebuild task moves it onto lib/data
 * (S1-P04-T007, S1-P04-T008 and feature phases). This list may only shrink.
 */
const KNOWN_BASELINE_PRISMA_IMPORTERS = [
  // `lib/services/printing.ts` left this list with S1-P16 (rebuilt on lib/data/printing.ts, 2026-09-23).
  // Rebuilt on lib/data in S1-P20 (social); its queries are already tenant-scoped.
  "lib/services/social.ts",
];

/**
 * BASELINE — unscoped tenant queries per file (count), all in baseline files above. Fixed by S1-P04-T007/T008 and the
 * feature rebuilds. This map may only shrink: a new violation, or a fix without updating this map, fails the test.
 */
const KNOWN_BASELINE_VIOLATIONS: Record<string, number> = {
  // Zero since the S1-P04-T007 retrofit (2026-09-22): every tenant query in app/ and lib/ is scoped.
};

const analyze = (code: string, file = "lib/data/fixture.ts") => analyzeTenantScope(file, code, tenantDelegates);

describe("TC-TENANT-002 analyzer fixtures", () => {
  it("derives tenant-owned delegates from the Prisma schema", () => {
    for (const model of ["order", "orderItem", "menuItem", "printJob", "auditLog", "userTenant", "tenantCounter"]) {
      expect(tenantDelegates.has(model), model).toBe(true);
    }
    for (const global of ["tenant", "user", "rateLimitBucket"]) {
      expect(tenantDelegates.has(global), global).toBe(false);
    }
  });

  it("fails an unscoped findUnique by id", () => {
    const violations = analyze(`export async function f(id: string) { return db.order.findUnique({ where: { id } }); }`);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ call: "order.findUnique", line: 1 });
  });

  it("fails unscoped updates, deletes, lists, counts and calls without a where", () => {
    const code = [
      `await tx.menuItem.update({ where: { id }, data });`,
      `await tx.printJob.updateMany({ where: { status: "PENDING" }, data });`,
      `await db.customer.deleteMany({ where: { email } });`,
      `await db.kotTicket.findMany();`,
      `await db.order.count({ select: { _all: true } });`,
      `await db.order.findFirst({ where });`,
      `await db.order.findMany(args);`,
    ].join("\n");
    expect(analyze(code).map((v) => v.call)).toEqual([
      "menuItem.update",
      "printJob.updateMany",
      "customer.deleteMany",
      "kotTicket.findMany",
      "order.count",
      "order.findFirst",
      "order.findMany",
    ]);
  });

  it("passes every accepted scoping form", () => {
    const code = [
      `await db.order.findFirst({ where: { id, tenantId: ctx.tenantId } });`,
      `await db.order.findUnique({ where: { tenantId_id: { tenantId: ctx.tenantId, id } } });`,
      `await db.order.findUnique({ where: tenantKey(ctx, id) });`,
      `await tx.order.updateMany({ where: tenantScope(ctx, { id, version }), data });`,
      `await tx.order.findMany({ where: { ...tenantScope(ctx), status: "NEW" } });`,
      `await db.tenant.findUnique({ where: { id } }); // TENANT is the root, not tenant-owned`,
      `await db.user.findUnique({ where: { id } });`,
      `await tx.orderItem.create({ data: { tenantId: ctx.tenantId, orderId } });`,
    ].join("\n");
    expect(analyze(code)).toEqual([]);
  });

  it("accepts an exemption only with a written justification", () => {
    const justified = `// tenant-scope-exempt: platform report aggregates across tenants for SUPER_ADMIN\nawait db.order.count();`;
    const unjustified = `// tenant-scope-exempt:\nawait db.order.count();`;
    expect(analyze(justified)).toEqual([]);
    expect(analyze(unjustified)).toHaveLength(1);
  });
});

describe("TC-TENANT-002 repository scan", () => {
  it("finds no unscoped tenant query in lib/data", () => {
    const dataFiles = appFiles.filter((f) => rel(f).startsWith("lib/data/"));
    expect(dataFiles.length).toBeGreaterThan(0);
    const violations = dataFiles.flatMap((f) => analyze(readFileSync(f, "utf8"), rel(f)));
    expect(violations.map((v) => `${v.file}:${v.line} ${v.call} — ${v.reason}`)).toEqual([]);
  });

  it("baseline unscoped queries only shrink (tracked until the P04 retrofit)", () => {
    const actual: Record<string, number> = {};
    for (const file of appFiles) {
      if (rel(file).startsWith("lib/data/")) continue;
      const count = analyze(readFileSync(file, "utf8"), rel(file)).length;
      if (count > 0) actual[rel(file)] = count;
    }
    const grown = Object.entries(actual).filter(([file, n]) => n > (KNOWN_BASELINE_VIOLATIONS[file] ?? 0));
    expect(grown, "new unscoped tenant queries — scope them with tenantScope()/tenantKey()").toEqual([]);
    expect(actual, "a baseline violation was fixed — lower KNOWN_BASELINE_VIOLATIONS").toEqual(KNOWN_BASELINE_VIOLATIONS);
  });

  it("only lib/data, lib/db, prisma, tests, scripts and the tracked baseline import the Prisma client", () => {
    const importers = appFiles
      .filter((f) => importsPrismaClient(rel(f), readFileSync(f, "utf8")))
      .map(rel)
      .filter((file) => !ALLOWED_PRISMA_PATHS.some((re) => re.test(file)))
      .sort();
    expect(importers).toEqual([...KNOWN_BASELINE_PRISMA_IMPORTERS].sort());
  });
});
