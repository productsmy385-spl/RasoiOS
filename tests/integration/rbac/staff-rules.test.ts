import type { TenantRole } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { assertCanAssignRole, assertCanManage, assertNotLastTenantAdmin, assertNotSelf, assignableRoles } from "@/lib/services/staff-rules";
import { createMembership, createTenant, createUser } from "../../factories";
import { disconnectTestDb, resetDatabase, testDb } from "../setup/db";

// TC-RBAC-010 / TC-RBAC-012 — staff role rules and the last-TENANT_ADMIN invariant (S1-P05-T003, INV-07).
const db = testDb();
afterAll(disconnectTestDb);
beforeEach(() => resetDatabase(db));

const ctx = (role: TenantRole, userId = "u-actor") => ({ role, userId });

describe("TC-RBAC-010 role assignment rules", () => {
  it("MANAGER may assign only CASHIER, KITCHEN and WAITER; TENANT_ADMIN may assign any tenant role", () => {
    expect(assignableRoles("MANAGER")).toEqual(["CASHIER", "KITCHEN", "WAITER"]);
    expect(assignableRoles("TENANT_ADMIN")).toEqual(["TENANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"]);
    expect(assignableRoles("CASHIER")).toEqual([]);
    expect(() => assertCanAssignRole(ctx("MANAGER"), "MANAGER")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertCanAssignRole(ctx("MANAGER"), "TENANT_ADMIN")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertCanAssignRole(ctx("MANAGER"), "WAITER")).not.toThrow();
    expect(() => assertCanAssignRole(ctx("TENANT_ADMIN"), "TENANT_ADMIN")).not.toThrow();
  });

  it("MANAGER cannot manage another MANAGER or a TENANT_ADMIN", () => {
    expect(() => assertCanManage(ctx("MANAGER"), "MANAGER")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertCanManage(ctx("MANAGER"), "TENANT_ADMIN")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertCanManage(ctx("MANAGER"), "KITCHEN")).not.toThrow();
    expect(() => assertCanManage(ctx("TENANT_ADMIN"), "MANAGER")).not.toThrow();
  });

  it("nobody changes their own role or deactivates themselves", () => {
    expect(() => assertNotSelf(ctx("TENANT_ADMIN", "same"), "same")).toThrow(expect.objectContaining({ code: "SELF_CHANGE_NOT_ALLOWED" }));
    expect(() => assertNotSelf(ctx("TENANT_ADMIN", "a"), "b")).not.toThrow();
  });
});

async function tenantWithAdmins(count: number) {
  const { tenant } = await createTenant(db);
  const memberships = [];
  for (let i = 0; i < count; i++) memberships.push(await createMembership(db, tenant.id, (await createUser(db)).id, "TENANT_ADMIN"));
  return { tenant, memberships };
}

/** What a staff service does: rule check and demotion in one transaction. */
function demote(tenantId: string, membershipId: string) {
  return db.$transaction(async (tx) => {
    await assertNotLastTenantAdmin(tx, tenantId, membershipId, { nextRole: "MANAGER" });
    await tx.userTenant.update({ where: { tenantId_id: { tenantId, id: membershipId } }, data: { role: "MANAGER" } });
  });
}

describe("TC-RBAC-012 at least one active TENANT_ADMIN", () => {
  it("refuses to demote or deactivate the only TENANT_ADMIN", async () => {
    const { tenant, memberships } = await tenantWithAdmins(1);
    await expect(demote(tenant.id, memberships[0].id)).rejects.toMatchObject({ code: "LAST_TENANT_ADMIN" });
    await expect(
      db.$transaction((tx) => assertNotLastTenantAdmin(tx, tenant.id, memberships[0].id, { deactivate: true })),
    ).rejects.toMatchObject({ code: "LAST_TENANT_ADMIN" });
  });

  it("allows demoting one of two admins, and changes to non-admins freely", async () => {
    const { tenant, memberships } = await tenantWithAdmins(2);
    await demote(tenant.id, memberships[0].id);
    const cashier = await createMembership(db, tenant.id, (await createUser(db)).id, "CASHIER");
    await db.$transaction((tx) => assertNotLastTenantAdmin(tx, tenant.id, cashier.id, { deactivate: true }));
  });

  it("concurrent demotion of the last two TENANT_ADMINs leaves at least one", async () => {
    for (let round = 0; round < 5; round++) {
      await resetDatabase(db);
      const { tenant, memberships } = await tenantWithAdmins(2);
      const results = await Promise.allSettled([demote(tenant.id, memberships[0].id), demote(tenant.id, memberships[1].id)]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
      expect(rejected.reason).toMatchObject({ code: "LAST_TENANT_ADMIN" });
      expect(await db.userTenant.count({ where: { tenantId: tenant.id, role: "TENANT_ADMIN", status: "ACTIVE" } })).toBe(1);
    }
  });
});
