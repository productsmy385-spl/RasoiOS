import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// S1-P03-T002 acceptance — no code path disables authentication based on the contents of the Clerk key (BA-04),
// and the root layout always renders ClerkProvider.
const root = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const files = [...["app", "components", "lib"].flatMap((d) => sourceFiles(path.join(root, d))), path.join(root, "middleware.ts")];

describe("authentication fails closed", () => {
  it("never inspects the Clerk key to decide whether to authenticate", () => {
    const offenders = files.filter((file) => {
      const code = readFileSync(file, "utf8");
      return (
        /isRealClerkKey/.test(code) ||
        /CLERK_PUBLISHABLE_KEY[\s\S]{0,200}\.includes\(\s*["'](placeholder|example)/.test(code) ||
        /rawKey\.includes/.test(code)
      );
    });
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });

  it("always runs clerkMiddleware and never returns a bypass middleware", () => {
    const middleware = readFileSync(path.join(root, "middleware.ts"), "utf8");
    expect(middleware).toMatch(/export default clerkMiddleware\(/);
    expect(middleware).not.toMatch(/NextResponse\.next\(\);\s*\}\s*;?\s*$/m);
  });

  it("always wraps the app in ClerkProvider", () => {
    const layout = readFileSync(path.join(root, "app/layout.tsx"), "utf8");
    expect(layout).toContain("<ClerkProvider");
    expect(layout.match(/<html/g)?.length).toBe(1);
  });
});
