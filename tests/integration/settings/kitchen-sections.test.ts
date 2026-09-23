import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  archiveKitchenSectionAction,
  createKitchenSectionAction,
  reorderKitchenSectionsAction,
  updateKitchenSectionAction,
} from "@/app/restaurant/settings/sections-actions";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf, expectSameNotFound, RANDOM_UUID } from "../orders/helpers";

// S1-P07-T003 — SA-KSEC-01…04: `kitchen_section:manage` first, tenant from context only, unique code per tenant,
// archive refused while the section is in use, reorder covers exactly the active set, everything audited.
const db = testDb();
const A = () => tenantIdOf("A");
const created: string[] = [];

beforeAll(seedOnce, 120_000);

afterEach(async () => {
  if (created.length > 0) {
    await db.kitchenSection.deleteMany({ where: { id: { in: created.splice(0) } } });
  }
  // Put the seeded sections back to their original order and active state.
  const sections = await db.kitchenSection.findMany({ where: { tenantId: A() }, orderBy: { code: "asc" } });
  await Promise.all(sections.map((s, i) => db.kitchenSection.update({ where: { id: s.id }, data: { sortOrder: i, archivedAt: null } })));
});

async function newSection(name: string, code: string) {
  const section = dataOf(await invokeAction(createKitchenSectionAction, { name, code }));
  created.push(section.id);
  return section;
}

describe("SA-KSEC-01 create", () => {
  it("TC-KOT-007 creates a section for this tenant, rejects a duplicate code, and audits", async () => {
    const { userId } = await asSeedUser("A", "TENANT_ADMIN");
    const section = await newSection("Dessert Counter", "DESSERT");
    expect(section).toMatchObject({ name: "Dessert Counter", code: "DESSERT" });

    const row = await db.kitchenSection.findUniqueOrThrow({ where: { id: section.id } });
    expect(row).toMatchObject({ tenantId: A(), archivedAt: null });

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "kitchen_section.created", resourceId: section.id } });
    expect(audit).toMatchObject({ tenantId: A(), actorUserId: userId, actorRole: "TENANT_ADMIN" });

    // Same code again → 422; Tenant B may use the same code because uniqueness is per tenant.
    expect(errorOf(await invokeAction(createKitchenSectionAction, { name: "Another", code: "DESSERT" })).code).toBe("CODE_TAKEN");
    await asSeedUser("B", "TENANT_ADMIN");
    const b = dataOf(await invokeAction(createKitchenSectionAction, { name: "Dessert", code: "DESSERT" }));
    created.push(b.id);
    expect((await db.kitchenSection.findUniqueOrThrow({ where: { id: b.id } })).tenantId).toBe(tenantIdOf("B"));
  });

  it("validates the input and refuses a tenantId in the body", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    for (const [input, field] of [
      [{ name: "", code: "X1" }, "name"],
      [{ name: "Grill", code: "" }, "code"],
      [{ name: "Grill", code: "lower case!" }, "code"],
    ] as const) {
      const error = errorOf(await invokeAction(createKitchenSectionAction, input as never));
      expect(error.code, field).toBe("VALIDATION_ERROR");
      expect(Object.keys(error.fieldErrors ?? {}), field).toContain(field);
    }
    expect(errorOf(await invokeAction(createKitchenSectionAction, { name: "Grill", code: "GRILL2", tenantId: tenantIdOf("B") } as never)).code).toBe("VALIDATION_ERROR");
  });

  it("TC-RBAC-113 only TENANT_ADMIN may manage sections (security.md §3.3 row 13)", async () => {
    for (const role of ["MANAGER", "CASHIER", "KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      expect(errorOf(await invokeAction(createKitchenSectionAction, { name: "Nope", code: "NOPE" })).code, role).toBe("FORBIDDEN");
    }
    expect(await db.kitchenSection.count({ where: { tenantId: A(), code: "NOPE" } })).toBe(0);
    await asSeedUser("A", "TENANT_ADMIN");
    expect((await newSection("Pastry", "PASTRY")).code).toBe("PASTRY");
  });
});

describe("SA-KSEC-02 / SA-KSEC-03 update and archive", () => {
  it("renames a section, archives an unused one, and refuses to archive one still in use", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const section = await newSection("Cold Station", "COLD");
    expect(dataOf(await invokeAction(updateKitchenSectionAction, { sectionId: section.id, name: "Cold Kitchen" })).name).toBe("Cold Kitchen");

    const archived = dataOf(await invokeAction(archiveKitchenSectionAction, { sectionId: section.id }));
    expect(archived.archivedAt).toBeTruthy();
    expect((await db.kitchenSection.findUniqueOrThrow({ where: { id: section.id } })).archivedAt).toBeInstanceOf(Date);

    // A section used by menu items cannot be archived.
    const inUse = await db.kitchenSection.findFirstOrThrow({ where: { tenantId: A(), code: "MAIN" } });
    expect(await db.menuItem.count({ where: { tenantId: A(), kitchenSectionId: inUse.id } })).toBeGreaterThan(0);
    expect(errorOf(await invokeAction(archiveKitchenSectionAction, { sectionId: inUse.id })).code).toBe("SECTION_IN_USE");
    expect((await db.kitchenSection.findUniqueOrThrow({ where: { id: inUse.id } })).archivedAt).toBeNull();
  });

  it("TI-019 another tenant's section id answers exactly like a random UUID and changes nothing", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const foreign = await db.kitchenSection.findFirstOrThrow({ where: { tenantId: tenantIdOf("B") } });
    const before = await db.kitchenSection.findUniqueOrThrow({ where: { id: foreign.id } });

    for (const call of [
      (id: string) => invokeAction(updateKitchenSectionAction, { sectionId: id, name: "Hijacked" }),
      (id: string) => invokeAction(archiveKitchenSectionAction, { sectionId: id }),
    ]) {
      expectSameNotFound(await call(foreign.id), await call(RANDOM_UUID));
    }
    expect(await db.kitchenSection.findUniqueOrThrow({ where: { id: foreign.id } })).toEqual(before);
  });
});

describe("SA-KSEC-04 reorder", () => {
  it("applies a new order for the active set only and rejects a foreign or incomplete list", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const active = await db.kitchenSection.findMany({ where: { tenantId: A(), archivedAt: null }, orderBy: { sortOrder: "asc" } });
    expect(active.length).toBeGreaterThan(1);

    const reversed = [...active].reverse().map((s) => s.id);
    const result = dataOf(await invokeAction(reorderKitchenSectionsAction, { orderedIds: reversed }));
    expect(result.map((s) => s.id)).toEqual(reversed);
    const rows = await db.kitchenSection.findMany({ where: { id: { in: reversed } }, orderBy: { sortOrder: "asc" } });
    expect(rows.map((r) => r.id)).toEqual(reversed);

    // An incomplete list, an unknown id and a Tenant B id are all refused.
    expect(errorOf(await invokeAction(reorderKitchenSectionsAction, { orderedIds: reversed.slice(1) })).code).toMatch(/VALIDATION_ERROR|NOT_FOUND|CONFLICT/);
    const foreign = await db.kitchenSection.findFirstOrThrow({ where: { tenantId: tenantIdOf("B") } });
    expect(errorOf(await invokeAction(reorderKitchenSectionsAction, { orderedIds: [...reversed.slice(1), foreign.id] })).code).toMatch(/VALIDATION_ERROR|NOT_FOUND|CONFLICT/);
    expect(errorOf(await invokeAction(reorderKitchenSectionsAction, { orderedIds: [randomUUID()] })).code).toMatch(/VALIDATION_ERROR|NOT_FOUND|CONFLICT/);
  });
});
