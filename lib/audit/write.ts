import "server-only";
import type { Prisma } from "@prisma/client";
import type { RequestContext } from "@/lib/auth/context-types";
import { requestMeta } from "@/lib/http/request-meta";
import type { AuditAction } from "./actions";
import { redactAuditState } from "./redact";

/**
 * Transactional audit writer (S1-P04-T010, SC-AUD-02). Call it with the *transaction client* of the business change,
 * so the change and its audit row commit or roll back together (TC-AUDIT-002). The actor and tenant come from the
 * server-side context, never from input.
 */
export type AuditEntry = {
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  /** Platform actions about a specific tenant (e.g. tenant.suspended) — only honoured for platform/system contexts. */
  tenantId?: string | null;
};

export async function audit(tx: Prisma.TransactionClient, ctx: RequestContext, entry: AuditEntry): Promise<void> {
  // Who asked, from where: only believed as far as TRUSTED_PROXY_HOPS proves it (S1-P23-T003, SC-LOG-01).
  const { ipAddress, userAgent } = await requestMeta();
  const base = {
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    beforeState: (redactAuditState(entry.before) ?? undefined) as Prisma.InputJsonValue | undefined,
    afterState: (redactAuditState(entry.after) ?? undefined) as Prisma.InputJsonValue | undefined,
    reason: entry.reason ? entry.reason.slice(0, 500) : null,
    requestId: ctx.requestId.slice(0, 64),
    ipAddress,
    userAgent,
  };

  switch (ctx.kind) {
    case "tenant":
      await tx.auditLog.create({ data: { ...base, tenantId: ctx.tenantId, actorType: "USER", actorUserId: ctx.userId, actorRole: ctx.role } });
      return;
    case "agent":
      await tx.auditLog.create({ data: { ...base, tenantId: ctx.tenantId, actorType: "PRINT_AGENT", actorAgentId: ctx.agentId } });
      return;
    case "platform":
      await tx.auditLog.create({ data: { ...base, tenantId: entry.tenantId ?? null, actorType: "USER", actorUserId: ctx.userId, actorRole: "SUPER_ADMIN" } });
      return;
    case "system":
      await tx.auditLog.create({ data: { ...base, tenantId: entry.tenantId ?? null, actorType: "SYSTEM" } });
      return;
  }
}
