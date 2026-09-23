import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ZodEffects, ZodObject, ZodPipeline, type ZodTypeAny } from "zod";

// TC-SEC-001 — every object schema exported from lib/validation/** is strict: it rejects an extra `tenantId` key and
// any unknown key (S1-P04-T006, SC-VAL-01, SC-TEN-01). New schema files are picked up automatically.
const root = path.resolve(__dirname, "../..");
const dir = path.join(root, "lib/validation");

function walk(d: string): string[] {
  return readdirSync(d).flatMap((name) => {
    const full = path.join(d, name);
    return statSync(full).isDirectory() ? walk(full) : /\.ts$/.test(name) ? [full] : [];
  });
}

/** The ZodObject inside refinements/transforms/pipes, if the schema is an object schema at all. */
function objectOf(schema: ZodTypeAny): ZodObject<never> | null {
  if (schema instanceof ZodObject) return schema as ZodObject<never>;
  if (schema instanceof ZodEffects) return objectOf(schema.innerType());
  if (schema instanceof ZodPipeline) return objectOf(schema._def.in);
  return null;
}

async function exportedObjectSchemas(): Promise<Array<{ name: string; schema: ZodTypeAny; object: ZodObject<never> }>> {
  const found = [];
  for (const file of walk(dir)) {
    const mod = (await import(file)) as Record<string, unknown>;
    for (const [exportName, value] of Object.entries(mod)) {
      if (!value || typeof value !== "object" || !("safeParse" in (value as object))) continue;
      const object = objectOf(value as ZodTypeAny);
      if (object) found.push({ name: `${path.relative(root, file)}#${exportName}`, schema: value as ZodTypeAny, object });
    }
  }
  return found;
}

describe("TC-SEC-001 strict input schemas", () => {
  it("every exported object schema is .strict()", async () => {
    const schemas = await exportedObjectSchemas();
    const loose = schemas.filter((s) => s.object._def.unknownKeys !== "strict").map((s) => s.name);
    expect(loose).toEqual([]);
  });

  it("every exported object schema rejects an extra tenantId key and an unknown key", async () => {
    for (const { name, schema } of await exportedObjectSchemas()) {
      for (const extra of [{ tenantId: "11111111-1111-4111-8111-111111111111" }, { unexpectedField: 1 }]) {
        const result = schema.safeParse(extra);
        expect(result.success, name).toBe(false);
        const codes = result.success ? [] : result.error.issues.map((i) => i.code);
        expect(codes, `${name} must report unrecognized_keys for ${Object.keys(extra)[0]}`).toContain("unrecognized_keys");
      }
    }
  });
});
