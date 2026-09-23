import { spawnSync } from "node:child_process"; // eslint-disable-line no-restricted-imports -- runs the seed CLI to prove it refuses production
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertSeedAllowed, SeedRefusedError } from "@/prisma/seed-data/guard";
import { seedId } from "@/prisma/seed-data/ids";

// TC-DB-009 — the seed never runs against production (S1-P02-T007, SC-TEN-10).
const local = "postgresql://postgres:postgres@localhost:5432/rasoios_db";

describe("TC-DB-009 seed guard", () => {
  it("refuses NODE_ENV=production even for a local database", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "production", DATABASE_URL: local })).toThrow(SeedRefusedError);
  });

  it("refuses a remote database unless explicitly allowed", () => {
    const remote = "postgresql://u:p@db.example-host.com:5432/app?sslmode=require";
    expect(() => assertSeedAllowed({ NODE_ENV: "development", DATABASE_URL: remote })).toThrow(/SEED_ALLOW_REMOTE/);
    expect(assertSeedAllowed({ NODE_ENV: "development", DATABASE_URL: remote, SEED_ALLOW_REMOTE: "1" })).toEqual({ host: "db.example-host.com" });
  });

  it("refuses when DATABASE_URL is missing or malformed", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "development" })).toThrow(SeedRefusedError);
    expect(() => assertSeedAllowed({ NODE_ENV: "development", DATABASE_URL: "not a url" })).toThrow(SeedRefusedError);
  });

  it("allows a local development database", () => {
    expect(assertSeedAllowed({ NODE_ENV: "development", DATABASE_URL: local })).toEqual({ host: "localhost" });
  });

  it("exits non-zero from the CLI when NODE_ENV=production, before connecting", () => {
    const root = path.resolve(__dirname, "../..");
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"), "prisma/seed.ts"], {
      cwd: root,
      env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "postgresql://u:p@unreachable.invalid:5432/x" },
      encoding: "utf8",
      timeout: 60_000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing to seed: NODE_ENV=production");
  }, 60_000);
});

describe("deterministic seed ids", () => {
  it("are stable RFC 4122 v5 UUIDs", () => {
    expect(seedId("a:tenant")).toBe(seedId("a:tenant"));
    expect(seedId("a:tenant")).not.toBe(seedId("b:tenant"));
    expect(seedId("a:tenant")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
