import { describe, it, expect } from "vitest";
import {
  resolveTenantContext,
  requirePermission,
  assertTenantOwnership,
  AuthenticatedUserSession,
} from "@/lib/auth/tenant-context";
import {
  UnauthorizedError,
  TenantAccessDeniedError,
  TenantSuspendedError,
} from "@/lib/errors";

describe("Tenant Context Resolution & Isolation Security Tests", () => {
  const mockActiveSession: AuthenticatedUserSession = {
    userId: "usr_1001",
    clerkId: "clerk_1001",
    email: "admin@tajrestaurant.com",
    isUserActive: true,
    userTenants: [
      {
        tenantId: "tenant_taj_001",
        role: "TENANT_ADMIN",
        isTenantActive: true,
        isUserTenantActive: true,
      },
      {
        tenantId: "tenant_taj_002",
        role: "MANAGER",
        isTenantActive: true,
        isUserTenantActive: true,
      },
    ],
  };

  it("should resolve valid TenantContext for authorized membership", () => {
    const context = resolveTenantContext(mockActiveSession, "tenant_taj_001");
    expect(context.userId).toBe("usr_1001");
    expect(context.tenantId).toBe("tenant_taj_001");
    expect(context.role).toBe("TENANT_ADMIN");
    expect(context.permissions).toContain("menu:manage");
  });

  it("should throw UnauthorizedError when session is missing or unauthenticated", () => {
    expect(() => resolveTenantContext(null)).toThrow(UnauthorizedError);
  });

  it("should reject cross-tenant access attempt to tenant user does not belong to", () => {
    expect(() =>
      resolveTenantContext(mockActiveSession, "tenant_OTHER_RESTAURANT_999")
    ).toThrow(TenantAccessDeniedError);
  });

  it("should reject access if tenant is suspended", () => {
    const sessionWithSuspendedTenant: AuthenticatedUserSession = {
      ...mockActiveSession,
      userTenants: [
        {
          tenantId: "tenant_suspended_888",
          role: "TENANT_ADMIN",
          isTenantActive: false,
          isUserTenantActive: true,
        },
      ],
    };

    expect(() =>
      resolveTenantContext(sessionWithSuspendedTenant, "tenant_suspended_888")
    ).toThrow(TenantSuspendedError);
  });

  it("assertTenantOwnership must throw error if resource belongs to different tenant", () => {
    const context = resolveTenantContext(mockActiveSession, "tenant_taj_001");

    const validOrder = { id: "ord_1", tenantId: "tenant_taj_001", total: 50 };
    const invalidOrder = { id: "ord_2", tenantId: "tenant_taj_002", total: 100 };

    expect(assertTenantOwnership(context, validOrder)).toEqual(validOrder);
    expect(() => assertTenantOwnership(context, invalidOrder)).toThrow(
      TenantAccessDeniedError
    );
  });
});
