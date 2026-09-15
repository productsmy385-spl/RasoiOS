import { Role, Permission, hasPermission, ROLE_PERMISSIONS } from "./permissions";
import { TenantAccessDeniedError, TenantSuspendedError, UnauthorizedError } from "@/lib/errors";

export interface TenantContext {
  userId: string;
  clerkId: string;
  email: string;
  tenantId: string;
  role: Role;
  permissions: Permission[];
}

export interface AuthenticatedUserSession {
  userId: string;
  clerkId: string;
  email: string;
  isUserActive: boolean;
  userTenants: Array<{
    tenantId: string;
    role: Role;
    isTenantActive: boolean;
    isUserTenantActive: boolean;
  }>;
}

/**
 * Server-side resolution of TenantContext for protected business operations.
 * NEVER TRUSTS client-provided tenantId from body, query string, or header.
 * Validates session user, active status, membership in target tenant, and active tenant status.
 */
export function resolveTenantContext(
  session: AuthenticatedUserSession | null,
  requestedTenantId?: string
): TenantContext {
  if (!session || !session.userId) {
    throw new UnauthorizedError("Authentication required: Valid session not found");
  }

  if (!session.isUserActive) {
    throw new TenantAccessDeniedError("User account is inactive or suspended");
  }

  if (!session.userTenants || session.userTenants.length === 0) {
    throw new TenantAccessDeniedError("User is not associated with any active tenant");
  }

  // If requestedTenantId is supplied by server router (e.g. from validated domain routing), check membership.
  // Otherwise, default to first active tenant membership.
  const targetTenantId = requestedTenantId || session.userTenants[0].tenantId;

  const membership = session.userTenants.find(
    (ut) => ut.tenantId === targetTenantId
  );

  if (!membership) {
    throw new TenantAccessDeniedError(
      `Cross-tenant access violation: User does not belong to tenant ${targetTenantId}`
    );
  }

  if (!membership.isUserTenantActive) {
    throw new TenantAccessDeniedError("User membership in this tenant is inactive");
  }

  if (!membership.isTenantActive) {
    throw new TenantSuspendedError(`Tenant ${targetTenantId} is suspended`);
  }

  return {
    userId: session.userId,
    clerkId: session.clerkId,
    email: session.email,
    tenantId: targetTenantId,
    role: membership.role,
    permissions: ROLE_PERMISSIONS[membership.role] || [],
  };
}

/**
 * Asserts that the given context possesses the requested permission.
 */
export function requirePermission(context: TenantContext, permission: Permission): void {
  if (!hasPermission(context.role, permission)) {
    throw new TenantAccessDeniedError(
      `Permission denied: Role ${context.role} lacks permission ${permission}`
    );
  }
}

/**
 * Helper to ensure a target entity's tenantId strictly matches the context tenantId.
 */
export function assertTenantOwnership<T extends { tenantId: string }>(
  context: TenantContext,
  entity: T | null | undefined,
  resourceName = "Resource"
): T {
  if (!entity) {
    throw new TenantAccessDeniedError(`${resourceName} not found`);
  }
  if (entity.tenantId !== context.tenantId) {
    throw new TenantAccessDeniedError(
      `Cross-tenant access violation: ${resourceName} belongs to another tenant`
    );
  }
  return entity;
}
