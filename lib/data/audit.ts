import "server-only";
import type { AuditActorType, Prisma } from "@prisma/client";
import type { PlatformContext, TenantContext } from "@/lib/auth/context-types";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/prisma";
import { ForbiddenError } from "@/lib/errors";
import { instantDto } from "./dto";
import { mapErrors } from "./errors";
import { tenantScope } from "./scope";

/**
 * Audit log reads (S1-P23-T002; api.md LD-AUD-01). The trail is append-only and already redacted when it is written
 * (lib/audit/redact.ts), so this module only filters and pages it.
 *
 * Tenant rule: platform rows carry `tenant_id = NULL` and belong to the Super Admin console, so a restaurant can
 * never see them here — `tenantScope` pins every query to the caller's own tenant.
 * Privacy: an actor's IP address is shown truncated to a /24 (or /48 for IPv6), which is enough to recognise "someone
 * else's network" without keeping a precise location in front of staff (SC-AUD-05).
 */
export type AuditEntryDto = {
  id: string;
  createdAt: string;
  actorType: AuditActorType;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  ipPrefix: string | null;
};

export type AuditFilters = {
  action?: string;
  resourceType?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  cursor?: string;
  limit?: number;
};

const AUDIT_SELECT = {
  id: true,
  createdAt: true,
  actorType: true,
  actorRole: true,
  action: true,
  resourceType: true,
  resourceId: true,
  beforeState: true,
  afterState: true,
  reason: true,
  ipAddress: true,
  actor: { select: { fullName: true } },
} satisfies Prisma.AuditLogSelect;

/** `203.0.113.47` → `203.0.113.0/24`; `2001:db8:1:2::1` → `2001:db8:1::/48`. */
export function truncateIp(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(":")) {
    const groups = ip.split(":").filter(Boolean).slice(0, 3);
    return `${groups.join(":")}::/48`;
  }
  const octets = ip.split(".");
  return octets.length === 4 ? `${octets[0]}.${octets[1]}.${octets[2]}.0/24` : null;
}

/** LD-AUD-01 — the caller's own tenant's trail, newest first, with a cursor. */
export async function listTenantAudit(ctx: TenantContext, filters: AuditFilters = {}): Promise<{ items: AuditEntryDto[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const rows = await mapErrors("Audit log", () =>
    db.auditLog.findMany({
      where: tenantScope(ctx, {
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
        ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
        ...(filters.from || filters.to
          ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
          : {}),
      }),
      select: AUDIT_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    }),
  );

  const page = rows.slice(0, limit);
  return {
    items: page.map((row) => ({
      id: row.id,
      createdAt: instantDto(row.createdAt),
      actorType: row.actorType,
      actorName: row.actor?.fullName ?? null,
      actorRole: row.actorRole,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      before: row.beforeState,
      after: row.afterState,
      reason: row.reason,
      ipPrefix: truncateIp(row.ipAddress),
    })),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
  };
}

// ─── Platform trail (S1-P06-T007; api.md LD-ADM-04) ───

/**
 * What the Super Admin console may read (SC-AUD-05): events with no tenant at all, and the lifecycle of a tenant —
 * created, renamed, suspended, reactivated, handed over, and its administrators' invitations. A restaurant's own
 * operational trail (`order.created`, `menu_item.updated`, …) stays inside that restaurant and never appears here.
 *
 * `lib/data/platform-tenants.ts` reads the same clause for the dashboard, so the two views cannot drift apart.
 */
export const PLATFORM_AUDIT_WHERE: Prisma.AuditLogWhereInput = {
  OR: [{ tenantId: null }, { action: { startsWith: "tenant." } }, { action: { startsWith: "tenant_admin." } }, { action: { startsWith: "platform." } }],
};

export type PlatformAuditEntryDto = AuditEntryDto & { tenantId: string | null; tenantName: string | null };

export type PlatformAuditFilters = AuditFilters & { tenantId?: string };

/** Defence in depth: the page guard has already resolved the permission, and this re-checks it before any read. */
function assertPlatformAuditRead(ctx: PlatformContext): void {
  if (ctx?.kind !== "platform" || !hasPermission(ctx, "platform:audit:read")) throw new ForbiddenError();
}

/** LD-ADM-04 — the platform-visible trail, newest first, with a cursor. */
export async function listPlatformAudit(ctx: PlatformContext, filters: PlatformAuditFilters = {}): Promise<{ items: PlatformAuditEntryDto[]; nextCursor: string | null }> {
  assertPlatformAuditRead(ctx);
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const rows = await mapErrors("Audit log", () =>
    // tenant-scope-exempt: SUPER_ADMIN platform trail — platform rows and tenant lifecycle rows only (LD-ADM-04, SC-AUD-05)
    db.auditLog.findMany({
      where: {
        AND: [
          PLATFORM_AUDIT_WHERE,
          {
            ...(filters.action ? { action: filters.action } : {}),
            ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
            ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
            ...(filters.from || filters.to
              ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
              : {}),
          },
        ],
      },
      select: { ...AUDIT_SELECT, tenantId: true, tenant: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    }),
  );

  const page = rows.slice(0, limit);
  return {
    items: page.map((row) => ({
      id: row.id,
      createdAt: instantDto(row.createdAt),
      actorType: row.actorType,
      actorName: row.actor?.fullName ?? null,
      actorRole: row.actorRole,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      before: row.beforeState,
      after: row.afterState,
      reason: row.reason,
      ipPrefix: truncateIp(row.ipAddress),
      tenantId: row.tenantId,
      tenantName: row.tenant?.name ?? null,
    })),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
  };
}

/** The actions and restaurants the platform trail actually contains, so its filters offer only real choices. */
export async function platformAuditFilterOptions(ctx: PlatformContext): Promise<{ actions: string[]; tenants: Array<{ id: string; name: string }> }> {
  assertPlatformAuditRead(ctx);
  const [actions, tenants] = await mapErrors("Audit log", () =>
    Promise.all([
      // tenant-scope-exempt: the distinct platform-visible actions, no tenant data (LD-ADM-04)
      db.auditLog.findMany({ where: PLATFORM_AUDIT_WHERE, select: { action: true }, distinct: ["action"], orderBy: { action: "asc" }, take: 200 }),
      db.tenant.findMany({ select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 500 }),
    ]),
  );
  return { actions: actions.map((row) => row.action), tenants };
}

/** The distinct actions and resource types this tenant actually has, so the filters offer only real choices. */
export async function auditFilterOptions(ctx: TenantContext): Promise<{ actions: string[]; resourceTypes: string[] }> {
  const [actions, resourceTypes] = await mapErrors("Audit log", () =>
    Promise.all([
      db.auditLog.findMany({ where: tenantScope(ctx), select: { action: true }, distinct: ["action"], orderBy: { action: "asc" }, take: 200 }),
      db.auditLog.findMany({ where: tenantScope(ctx), select: { resourceType: true }, distinct: ["resourceType"], orderBy: { resourceType: "asc" }, take: 100 }),
    ]),
  );
  return { actions: actions.map((a) => a.action), resourceTypes: resourceTypes.map((r) => r.resourceType) };
}
