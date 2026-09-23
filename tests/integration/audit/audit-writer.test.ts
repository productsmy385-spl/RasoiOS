import { beforeAll, describe, expect, it } from "vitest";
import { audit } from "@/lib/audit/write";
import type { AgentContext, PlatformContext, SystemContext, TenantContext } from "@/lib/auth/context-types";
import { testDb } from "../setup/db";
import { seedOnce, seeded, tenantIdOf } from "../helpers/actors";

// TC-AUDIT-002 — the audit row commits or rolls back with the business change (S1-P04-T010, SC-AUD-02).
const db = testDb();
beforeAll(seedOnce, 120_000);

const tenantCtx = (): TenantContext => ({
  kind: "tenant",
  requestId: "req-audit-1",
  userId: seeded("A", "user:MANAGER"),
  membershipId: seeded("A", "membership:MANAGER"),
  tenantId: tenantIdOf("A"),
  role: "MANAGER",
  permissions: new Set(),
  restaurant: { id: seeded("A", "restaurant"), timezone: "Asia/Kolkata", currencyCode: "INR" },
});

describe("TC-AUDIT-002 transactional audit writer", () => {
  it("writes nothing when the business transaction rolls back", async () => {
    const before = await db.auditLog.count();
    await expect(
      db.$transaction(async (tx) => {
        await tx.menuCategory.update({ where: { tenantId_id: { tenantId: tenantIdOf("A"), id: seeded("A", "category:mains") } }, data: { description: "rolled back" } });
        await audit(tx, tenantCtx(), { action: "menu_category.updated", resourceType: "menu_category", resourceId: seeded("A", "category:mains"), after: { description: "rolled back" } });
        throw new Error("simulated failure after audit");
      }),
    ).rejects.toThrow("simulated failure after audit");
    expect(await db.auditLog.count()).toBe(before);
    expect((await db.menuCategory.findUniqueOrThrow({ where: { id: seeded("A", "category:mains") } })).description).not.toBe("rolled back");
  });

  it("writes exactly one row, with actor and tenant from the context, when it commits", async () => {
    const before = await db.auditLog.count();
    await db.$transaction(async (tx) => {
      await audit(tx, tenantCtx(), {
        action: "customer.updated",
        resourceType: "customer",
        resourceId: seeded("A", "customer:sam"),
        before: { phoneE164: "+919900000001" },
        after: { phoneE164: "+919900000009" },
        reason: "Customer asked",
      });
    });
    expect(await db.auditLog.count()).toBe(before + 1);
    const row = await db.auditLog.findFirstOrThrow({ where: { action: "customer.updated", requestId: "req-audit-1" } });
    expect(row).toMatchObject({ tenantId: tenantIdOf("A"), actorType: "USER", actorUserId: seeded("A", "user:MANAGER"), actorRole: "MANAGER", reason: "Customer asked" });
    expect(row.beforeState).toEqual({ phoneE164: "+91********01" });
    expect(row.afterState).toEqual({ phoneE164: "+91********09" });
  });

  it("records agent, platform and system actors correctly", async () => {
    const agent: AgentContext = { kind: "agent", requestId: "req-agent", agentId: seeded("A", "agent:active"), tenantId: tenantIdOf("A"), printerIds: [] };
    const platform: PlatformContext = { kind: "platform", requestId: "req-platform", userId: seeded("A", "user:TENANT_ADMIN"), permissions: new Set() };
    const system: SystemContext = { kind: "system", requestId: "req-system", job: "maintenance" };
    await db.$transaction(async (tx) => {
      await audit(tx, agent, { action: "print_job.failed", resourceType: "print_job", resourceId: null });
      await audit(tx, platform, { action: "tenant.suspended", resourceType: "tenant", resourceId: tenantIdOf("B"), tenantId: tenantIdOf("B") });
      await audit(tx, system, { action: "print_job.failed", resourceType: "print_job" });
    });
    expect(await db.auditLog.findFirstOrThrow({ where: { requestId: "req-agent" } })).toMatchObject({ actorType: "PRINT_AGENT", actorAgentId: seeded("A", "agent:active"), tenantId: tenantIdOf("A") });
    expect(await db.auditLog.findFirstOrThrow({ where: { requestId: "req-platform" } })).toMatchObject({ actorType: "USER", actorRole: "SUPER_ADMIN", tenantId: tenantIdOf("B") });
    expect(await db.auditLog.findFirstOrThrow({ where: { requestId: "req-system" } })).toMatchObject({ actorType: "SYSTEM", tenantId: null });
  });
});
