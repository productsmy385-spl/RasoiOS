/**
 * Static tenant-scope analyzer (S1-P02-T006, SC-TEN-03). Uses the TypeScript compiler API — no type checking needed.
 *
 * Flags a Prisma call on a tenant-owned model delegate (e.g. `db.order.findUnique(…)`, `tx.menuItem.updateMany(…)`)
 * whose `where` does not visibly scope by tenant. Accepted forms:
 *   where: { tenantId: …, … }            where: { tenantId_id: { … } }
 *   where: tenantScope(ctx, …)           where: tenantKey(ctx, id)        where: { ...tenantScope(ctx), … }
 * A call can be exempted only with a justification comment on the line above it: `// tenant-scope-exempt: <why>`.
 */
import ts from "typescript";

export const SCOPED_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
  "count",
  "aggregate",
  "groupBy",
]);

const SCOPE_HELPERS = new Set(["tenantScope", "tenantKey"]);
const SCOPE_KEYS = new Set(["tenantId", "tenantId_id"]);
const EXEMPT_MARKER = /tenant-scope-exempt:\s*\S+/;

export type ScopeViolation = { file: string; line: number; call: string; reason: string };

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

function isScopeHelperCall(node: ts.Expression): boolean {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && SCOPE_HELPERS.has(node.expression.text);
}

function whereIsScoped(where: ts.Expression): boolean {
  if (isScopeHelperCall(where)) return true;
  if (ts.isParenthesizedExpression(where)) return whereIsScoped(where.expression);
  if (!ts.isObjectLiteralExpression(where)) return false;
  return where.properties.some((p) => {
    if (ts.isSpreadAssignment(p)) return isScopeHelperCall(p.expression);
    if ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name) {
      const name = propertyName(p.name);
      return name !== undefined && SCOPE_KEYS.has(name);
    }
    return false;
  });
}

function hasExemption(source: ts.SourceFile, node: ts.Node): boolean {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  const lines = source.text.split(/\r?\n/);
  for (let i = line - 1; i >= Math.max(0, line - 3); i--) {
    const text = lines[i]?.trim() ?? "";
    if (EXEMPT_MARKER.test(text)) return true;
    if (text && !text.startsWith("//") && !text.startsWith("*") && !text.startsWith("/*")) break;
  }
  return false;
}

export function analyzeTenantScope(file: string, code: string, tenantDelegates: ReadonlySet<string>): ScopeViolation[] {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const violations: ScopeViolation[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const receiver = node.expression.expression;
      if (SCOPED_OPERATIONS.has(method) && ts.isPropertyAccessExpression(receiver) && tenantDelegates.has(receiver.name.text)) {
        const call = `${receiver.name.text}.${method}`;
        const report = (reason: string) => {
          if (!hasExemption(source, node)) {
            violations.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, call, reason });
          }
        };
        const [args] = node.arguments;
        if (!args) {
          report("no arguments, so no tenant filter");
        } else if (!ts.isObjectLiteralExpression(args)) {
          report("arguments are not an object literal, so the tenant filter cannot be verified");
        } else {
          const whereProp = args.properties.find(
            (p): p is ts.PropertyAssignment | ts.ShorthandPropertyAssignment =>
              (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && propertyName(p.name) === "where",
          );
          if (!whereProp) report("no `where`, so the query spans every tenant");
          else if (ts.isShorthandPropertyAssignment(whereProp)) report("`where` is a variable; the tenant filter cannot be verified");
          else if (!whereIsScoped(whereProp.initializer)) report("`where` has no tenantId / tenantId_id / tenantScope()");
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

/** Module specifiers that give direct database access. */
export const PRISMA_CLIENT_MODULES = ["@/lib/db/prisma"];

export function importsPrismaClient(file: string, code: string): boolean {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  return source.statements.some(
    (s) => ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && PRISMA_CLIENT_MODULES.includes(s.moduleSpecifier.text),
  );
}
