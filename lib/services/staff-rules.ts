/**
 * Staff management rules (S1-P05-T003, security.md §3.3 rows 15–17, SC-RBAC-04/05). Enforced in services,
 * independent of the UI:
 * - TENANT_ADMIN may assign any tenant role; MANAGER may invite, change or deactivate only CASHIER, WAITER and
 *   KITCHEN members and may assign only those roles.
 * - Nobody changes their own role or deactivates themselves.
 * - A tenant with activated members always keeps at least one ACTIVE TENANT_ADMIN (INV-07). The check locks the
 *   tenant's ACTIVE TENANT_ADMIN memberships (`SELECT … FOR UPDATE`), so two concurrent demotions cannot both pass.
 */
import type { Prisma, TenantRole } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { ConflictError, ForbiddenError } from "@/lib/errors";

const ALL_ROLES: readonly TenantRole[] = ["TENANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"];
const MANAGER_ASSIGNABLE: readonly TenantRole[] = ["CASHIER", "KITCHEN", "WAITER"];

/** Roles the actor may give to someone (for invitations and role changes, and the role select options). */
export function assignableRoles(actorRole: TenantRole): readonly TenantRole[] {
  if (actorRole === "TENANT_ADMIN") return ALL_ROLES;
  if (actorRole === "MANAGER") return MANAGER_ASSIGNABLE;
  return [];
}

/** Whether the actor may manage (change role, deactivate, revoke invite of) a member who currently has `targetRole`. */
export function canManageMembership(actorRole: TenantRole, targetRole: TenantRole): boolean {
  return assignableRoles(actorRole).includes(targetRole);
}

export function assertCanAssignRole(ctx: Pick<TenantContext, "role">, role: TenantRole): void {
  if (!assignableRoles(ctx.role).includes(role)) throw new ForbiddenError("You can't assign this role.");
}

export function assertCanManage(ctx: Pick<TenantContext, "role">, targetRole: TenantRole): void {
  if (!canManageMembership(ctx.role, targetRole)) throw new ForbiddenError("You can't manage this staff member.");
}

export function assertNotSelf(ctx: Pick<TenantContext, "userId">, targetUserId: string): void {
  if (ctx.userId === targetUserId) throw new ConflictError("You can't change your own role or deactivate yourself.", "SELF_CHANGE_NOT_ALLOWED");
}

/**
 * Call inside the transaction that demotes or deactivates `membershipId`, before the update. Locks the tenant's
 * ACTIVE TENANT_ADMIN memberships and refuses if this change would leave none.
 */
export async function assertNotLastTenantAdmin(
  tx: Prisma.TransactionClient,
  tenantId: string,
  membershipId: string,
  change: { nextRole: TenantRole } | { deactivate: true },
): Promise<void> {
  if ("nextRole" in change && change.nextRole === "TENANT_ADMIN") return;
  const admins = await tx.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM user_tenants
    WHERE tenant_id = ${tenantId}::uuid AND role = 'TENANT_ADMIN' AND status = 'ACTIVE'
    ORDER BY id
    FOR UPDATE`;
  const isAdmin = admins.some((a) => a.id === membershipId);
  if (isAdmin && admins.length <= 1) {
    throw new ConflictError("A restaurant must keep at least one active Tenant Admin.", "LAST_TENANT_ADMIN");
  }
}
