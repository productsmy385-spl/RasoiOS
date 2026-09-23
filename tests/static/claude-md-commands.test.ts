import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// TC-FOUND-001 — every command documented in CLAUDE.md exists in package.json (S1-P01-T002).
const root = path.resolve(__dirname, "../..");

function documentedScripts(): string[] {
  const claude = readFileSync(path.join(root, "CLAUDE.md"), "utf8");
  const section = claude.split("## Development Commands")[1] ?? "";
  const block = section.match(/```bash\n([\s\S]*?)```/)?.[1] ?? "";
  return [...block.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]);
}

describe("TC-FOUND-001 CLAUDE.md commands", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const scripts = documentedScripts();

  it("finds the documented command list", () => {
    expect(scripts.length).toBeGreaterThan(5);
  });

  it.each(scripts)("package.json defines `%s`", (name) => {
    expect(pkg.scripts[name], `missing npm script "${name}"`).toBeTruthy();
  });
});
