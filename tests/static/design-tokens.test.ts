import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// TC-DS-002 — design-token ratchet (S1-P08-T011, design.md §4.1). Arbitrary spacing, hex colours, arbitrary radii and
// text below 12 px in class names are design drift. The baseline count may only go down; it must reach zero by
// S1-P25-T011. When a rebuild removes violations, regenerate with UPDATE_DESIGN_BASELINE=1 and review the diff.
const root = path.resolve(__dirname, "../..");

/** Documented exceptions (design.md §4.2 containers). */
const ALLOWED = new Set(["max-w-[1440px]", "max-w-[1280px]", "max-w-[1200px]", "max-w-[440px]", "w-[264px]"]);

const RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: "arbitrary spacing", pattern: /\b-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|inset|top|bottom|left|right)-\[[^\]]+\]/g },
  { name: "hex colour", pattern: /\b(?:bg|text|border|from|to|via|ring|fill|stroke|shadow|outline|divide|placeholder|decoration|accent|caret)(?:-[a-z]+)?-\[#[0-9A-Fa-f]{3,8}\]/g },
  { name: "arbitrary radius", pattern: /\brounded(?:-[trblse]{1,2})?-\[[^\]]+\]/g },
  { name: "text below 12px", pattern: /\btext-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/g },
];

/** Violations at the time the ratchet was introduced (2026-09-22, after the S1-P04-T007 retrofit). */
const BASELINE_FILE = path.join(root, "tests/fixtures/design-token-baseline.json");
const BASELINE: Record<string, number> = existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, "utf8")) : {};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(tsx|ts)$/.test(name) ? [full] : [];
  });
}

function count(): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(RULES.map((r) => [r.name, 0]));
  for (const file of ["app", "components"].flatMap((d) => walk(path.join(root, d)))) {
    const code = readFileSync(file, "utf8");
    for (const rule of RULES) {
      for (const match of code.match(rule.pattern) ?? []) if (!ALLOWED.has(match)) totals[rule.name]++;
    }
  }
  return totals;
}

describe("TC-DS-002 design-token ratchet", () => {
  const current = count();

  it("arbitrary values never increase", () => {
    if (process.env.UPDATE_DESIGN_BASELINE === "1") {
      writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}
`);
      return;
    }
    for (const rule of RULES) {
      expect(current[rule.name], `${rule.name}: ${current[rule.name]} > baseline ${BASELINE[rule.name]} — use design tokens instead`).toBeLessThanOrEqual(BASELINE[rule.name]);
    }
  });

  it("new design-system code (components/ui, components/states, components/account) has no violations", () => {
    const strict = ["components/ui", "components/states", "components/account"].flatMap((d) => {
      try {
        return walk(path.join(root, d));
      } catch {
        return [];
      }
    });
    const offenders = strict.flatMap((file) => {
      const code = readFileSync(file, "utf8");
      return RULES.flatMap((rule) => (code.match(rule.pattern) ?? []).filter((m) => !ALLOWED.has(m)).map((m) => `${path.relative(root, file)}: ${m}`));
    });
    // Baseline primitives (button, badge, card, input, select, dialog) are rebuilt in S1-P08-T004–T006.
    const legacy = /components[\\/]ui[\\/](button|badge|card|input|select|dialog)\.tsx/;
    expect(offenders.filter((o) => !legacy.test(o))).toEqual([]);
  });
});
