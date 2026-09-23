// Builds the agent into one self-contained CommonJS file for Node >= 22 (S1-P17-T002/T009), plus SHA256SUMS for the
// release artifacts. esbuild resolves from the repository root's node_modules; `@/` maps to the repository root so
// the agent bundles the exact PrintDocument schema and text rules the server uses (lib/print/*).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outfile = path.join(here, "dist", "rasoios-print-agent.cjs");

await build({
  entryPoints: [path.join(here, "src", "main.ts")],
  outfile,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  alias: { "@": root },
  banner: { js: "#!/usr/bin/env node" },
  legalComments: "none",
  logLevel: "info",
});

const sum = createHash("sha256").update(readFileSync(outfile)).digest("hex");
writeFileSync(path.join(here, "dist", "SHA256SUMS"), `${sum}  rasoios-print-agent.cjs\n`);
console.log(`sha256 ${sum}`);
