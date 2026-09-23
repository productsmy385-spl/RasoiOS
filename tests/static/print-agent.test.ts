import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_VERSION } from "@/print-agent/src/version";

/**
 * TC-AGENT-006 and the S1-P17-T010 review checks that can be automated: the agent never runs a shell or a child
 * process, never disables TLS verification, never opens a listening socket, and never evaluates code.
 */
const root = path.resolve(__dirname, "..", "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|mjs|js)$/.test(name) ? [full] : [];
  });
}

const agentFiles = sources(path.join(root, "print-agent", "src"));

describe("TC-AGENT-006 no shell or process execution in the agent", () => {
  it("has sources to check", () => {
    expect(agentFiles.length).toBeGreaterThan(5);
  });

  for (const pattern of [/child_process/, /\bexec(File)?(Sync)?\s*\(/, /\bspawn(Sync)?\s*\(/, /\beval\s*\(/, /new\s+Function\s*\(/, /\bfork\s*\(/]) {
    it(`no ${pattern}`, () => {
      const offenders = agentFiles.filter((file) => pattern.test(readFileSync(file, "utf8")));
      expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
    });
  }
});

describe("S1-P17-T010 automated review checks", () => {
  it("never disables TLS certificate verification", () => {
    const offenders = agentFiles.filter((file) => /rejectUnauthorized|NODE_TLS_REJECT_UNAUTHORIZED/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("opens no listening socket (the agent only connects out)", () => {
    const offenders = agentFiles.filter((file) => /createServer|\.listen\s*\(/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("follows no redirects with the bearer token", () => {
    expect(readFileSync(path.join(root, "print-agent", "src", "api.ts"), "utf8")).toContain('redirect: "error"');
  });

  it("the reported version matches the package", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "print-agent", "package.json"), "utf8")) as { version: string };
    expect(AGENT_VERSION).toBe(pkg.version);
  });
});
