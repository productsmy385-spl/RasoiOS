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

// RASOIOS-ADR-014 — Render Blueprint. No YAML parser is a dependency, so single-line keys are read by pattern.
describe("Render configuration (render.yaml)", () => {
  const render = read("render.yaml");
  const field = (key: string) => render.match(new RegExp(`^\\s+${key}:\\s*(.+?)\\s*(#.*)?$`, "m"))?.[1];

  it("generates the Prisma client before building", () => {
    expect(field("buildCommand")).toMatch(/prisma:gen.*&&.*npm run build/);
  });

  it("applies committed migrations before each deploy", () => {
    expect(field("preDeployCommand")).toBe("npm run prisma:deploy");
  });

  it("uses npm scripts that exist", () => {
    for (const key of ["buildCommand", "preDeployCommand", "startCommand"]) {
      for (const [, name] of (field(key) ?? "").matchAll(/npm run ([\w:-]+)/g)) {
        expect(pkg.scripts[name], `missing npm script "${name}"`).toBeTruthy();
      }
    }
  });

  it("health-checks the readiness route, like Railway", () => {
    expect(field("healthCheckPath")).toBe(railway.deploy.healthcheckPath);
  });

  it("uses the same PostgreSQL major version as CI", () => {
    expect(field("postgresMajorVersion")).toBe(`"${ci.match(/image: postgres:(\d+)/)?.[1]}"`);
  });

  it("does not guess a trusted proxy hop count", () => {
    expect(render).not.toMatch(/key:\s*TRUSTED_PROXY_HOPS/);
  });

  it("contains no secret values and keeps every secret out of the file", () => {
    expect(render).not.toMatch(SECRET_LIKE);
    for (const key of ["DATABASE_URL", "CLERK_SECRET_KEY", "CLERK_WEBHOOK_SIGNING_SECRET"]) {
      expect(render).toMatch(new RegExp(`key: ${key}\\n\\s+sync: false`));
    }
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
