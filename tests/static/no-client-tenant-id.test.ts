import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// TC-TENANT-006 — no exported Server Action, Route Handler or input schema accepts a tenant identifier
// (S1-P04-T007, SC-TEN-01, ADR-006 §3).
const root = path.resolve(__dirname, "../..");
const FORBIDDEN_NAMES = /^(tenantId|requestedTenantId|tenant_id|tenant)$/;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");

const serverEntryFiles = walk(path.join(root, "app")).filter((f) => {
  const code = readFileSync(f, "utf8");
  return /route\.ts$/.test(f) || /^\s*["']use server["']/m.test(code);
});
const schemaFiles = walk(path.join(root, "lib/validation"));

function findings(file: string, mode: "entry" | "schema"): string[] {
  const code = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const line = (n: ts.Node) => source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1;
  const visit = (node: ts.Node) => {
    if (mode === "entry" && ts.isParameter(node)) {
      const names: string[] = [];
      const collect = (b: ts.BindingName) => {
        if (ts.isIdentifier(b)) names.push(b.text);
        else for (const el of b.elements) if (!ts.isOmittedExpression(el)) collect(el.name);
      };
      collect(node.name);
      for (const n of names) if (FORBIDDEN_NAMES.test(n)) out.push(`${rel(file)}:${line(node)} parameter "${n}"`);
    }
    if (ts.isPropertySignature(node) || ts.isPropertyAssignment(node)) {
      const name = node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) ? node.name.text : "";
      // In input schemas and input types, a tenant key means the client could send one.
      if (FORBIDDEN_NAMES.test(name) && (mode === "schema" || ts.isPropertySignature(node))) out.push(`${rel(file)}:${line(node)} field "${name}"`);
    }
    if (mode === "entry" && ts.isIdentifier(node) && node.text === "requestedTenantId") out.push(`${rel(file)}:${line(node)} requestedTenantId`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...new Set(out)];
}

describe("TC-TENANT-006 no client-supplied tenant identifiers", () => {
  it("scans the server entry points", () => {
    expect(serverEntryFiles.length).toBeGreaterThan(10);
  });

  it("no Server Action or Route Handler has a tenant parameter or input field", () => {
    expect(serverEntryFiles.flatMap((f) => findings(f, "entry"))).toEqual([]);
  });

  it("no input schema in lib/validation declares a tenant field", () => {
    expect(schemaFiles.flatMap((f) => findings(f, "schema"))).toEqual([]);
  });
});
