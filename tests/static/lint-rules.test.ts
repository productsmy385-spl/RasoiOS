import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// TC-FOUND-002 — banned constructs fail lint (S1-P01-T003). The full-repository `npm run lint` runs in CI.
const root = path.resolve(__dirname, "../..");
const eslint = new ESLint({ cwd: root });

async function messagesFor(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  return result.messages.map((m) => `${m.ruleId}: ${m.message}`);
}

describe("TC-FOUND-002 security and money lint rules", () => {
  it("rejects dangerouslySetInnerHTML", async () => {
    const msgs = await messagesFor(
      "export function X({ html }: { html: string }) { return <div dangerouslySetInnerHTML={{ __html: html }} />; }\n",
      "components/__lint_fixture__.tsx",
    );
    expect(msgs.some((m) => m.includes("dangerouslySetInnerHTML is banned"))).toBe(true);
  }, 60_000);

  it("rejects unsafe raw SQL", async () => {
    const msgs = await messagesFor(
      "declare const db: { $queryRawUnsafe(q: string): Promise<unknown> };\nexport const run = (q: string) => db.$queryRawUnsafe(q);\n",
      "lib/data/__lint_fixture__.ts",
    );
    expect(msgs.some((m) => m.includes("Unsafe raw SQL is banned"))).toBe(true);
  }, 60_000);

  it("rejects parseFloat and Decimal#toNumber for money", async () => {
    const msgs = await messagesFor(
      "declare const price: { toNumber(): number };\nexport const a = parseFloat(\"1.10\");\nexport const b = price.toNumber();\n",
      "lib/services/__lint_fixture__.ts",
    );
    expect(msgs.some((m) => m.includes("parseFloat is banned"))).toBe(true);
    expect(msgs.some((m) => m.includes("toNumber() is banned"))).toBe(true);
  }, 60_000);

  it("rejects Prisma imports outside lib/data and child_process everywhere", async () => {
    const appMsgs = await messagesFor(
      'import { prisma } from "@/lib/db/prisma";\nexport const p = prisma;\n',
      "app/__lint_fixture__/page.tsx",
    );
    expect(appMsgs.some((m) => m.includes("only through lib/data"))).toBe(true);

    const dataMsgs = await messagesFor(
      'import { prisma } from "@/lib/db/prisma";\nexport const p = prisma;\n',
      "lib/data/__lint_fixture__.ts",
    );
    expect(dataMsgs.some((m) => m.includes("only through lib/data"))).toBe(false);

    const shellMsgs = await messagesFor(
      'import { exec } from "node:child_process";\nexport const e = exec;\n',
      "lib/data/__lint_fixture__.ts",
    );
    expect(shellMsgs.some((m) => m.includes("No shell execution"))).toBe(true);
  }, 60_000);
});
