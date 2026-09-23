import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// S1-P01-T008 / S1-P01-T009 — Railway config-as-code and local PostgreSQL stay aligned with CI and contain no secrets.
const root = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const railway = JSON.parse(read("railway.json")) as {
  build: { builder: string; buildCommand: string };
  deploy: { startCommand: string; healthcheckPath: string; preDeployCommand?: string[] };
};
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
const compose = read("docker-compose.yml");
const ci = read(".github/workflows/ci.yml");

const SECRET_LIKE = /(sk_(test|live)_|whsec_|pk_live_|postgres(ql)?:\/\/[^\s"]*:[^\s"@]+@(?!localhost|127\.0\.0\.1))/;

describe("Railway configuration", () => {
  it("generates the Prisma client before building", () => {
    expect(railway.build.buildCommand).toMatch(/prisma:gen.*&&.*npm run build/);
  });

  it("applies committed migrations before each deploy (S1-P02-T003)", () => {
    expect(railway.deploy.preDeployCommand).toEqual(["npm run prisma:deploy"]);
    expect(pkg.scripts["prisma:deploy"]).toBe("prisma migrate deploy");
  });

  it("uses npm scripts that exist", () => {
    for (const command of [railway.build.buildCommand, railway.deploy.startCommand, ...(railway.deploy.preDeployCommand ?? [])]) {
      for (const [, name] of command.matchAll(/npm run ([\w:-]+)/g)) {
        expect(pkg.scripts[name], `missing npm script "${name}"`).toBeTruthy();
      }
    }
  });

  it("defines a health check path", () => {
    expect(railway.deploy.healthcheckPath).toMatch(/^\//);
  });

  it("contains no secret values", () => {
    expect(read("railway.json")).not.toMatch(SECRET_LIKE);
  });
});

describe("Local PostgreSQL (docker-compose.yml)", () => {
  it("uses the same PostgreSQL major version as CI", () => {
    const composeMajor = compose.match(/image: postgres:(\d+)/)?.[1];
    const ciMajor = ci.match(/image: postgres:(\d+)/)?.[1];
    expect(composeMajor).toBeDefined();
    expect(composeMajor).toBe(ciMajor);
  });

  it("binds only to the loopback interface", () => {
    expect(compose).toMatch(/"127\.0\.0\.1:5432:5432"/);
  });

  it("matches the database name in .env.example", () => {
    const db = read(".env.example").match(/^DATABASE_URL="postgresql:\/\/[^/]+\/(\w+)/m)?.[1];
    expect(compose).toContain(`POSTGRES_DB: ${db}`);
  });
});
