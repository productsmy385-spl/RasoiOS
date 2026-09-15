import { describe, it, expect } from "vitest";
import { hasPermission, ROLE_PERMISSIONS, Role, Permission } from "@/lib/auth/permissions";

describe("Role-Based Access Control (RBAC) Permissions Matrix", () => {
  it("SUPER_ADMIN must have platform level management permissions", () => {
    expect(hasPermission("SUPER_ADMIN", "tenant:create")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "tenant:manage_all")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "audit:view")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "order:create")).toBe(false);
  });

  it("TENANT_ADMIN must have complete restaurant administration permissions", () => {
    expect(hasPermission("TENANT_ADMIN", "tenant:manage_own")).toBe(true);
    expect(hasPermission("TENANT_ADMIN", "staff:manage")).toBe(true);
    expect(hasPermission("TENANT_ADMIN", "menu:manage")).toBe(true);
    expect(hasPermission("TENANT_ADMIN", "refund:process")).toBe(true);
    expect(hasPermission("TENANT_ADMIN", "tenant:create")).toBe(false);
  });

  it("MANAGER must have operational permissions but not own tenant administrative reconfigurations", () => {
    expect(hasPermission("MANAGER", "menu:manage")).toBe(true);
    expect(hasPermission("MANAGER", "staff:manage")).toBe(true);
    expect(hasPermission("MANAGER", "order:create")).toBe(true);
    expect(hasPermission("MANAGER", "tenant:manage_own")).toBe(false);
  });

  it("CASHIER must be allowed to create orders and process payments only", () => {
    expect(hasPermission("CASHIER", "order:create")).toBe(true);
    expect(hasPermission("CASHIER", "payment:process")).toBe(true);
    expect(hasPermission("CASHIER", "refund:process")).toBe(false);
    expect(hasPermission("CASHIER", "menu:manage")).toBe(false);
  });

  it("KITCHEN role must be strictly limited to order status updates and queue viewing", () => {
    expect(hasPermission("KITCHEN", "kitchen:view_queue")).toBe(true);
    expect(hasPermission("KITCHEN", "order:update_status")).toBe(true);
    expect(hasPermission("KITCHEN", "order:create")).toBe(false);
    expect(hasPermission("KITCHEN", "payment:process")).toBe(false);
  });

  it("WAITER role must be able to create orders and update status", () => {
    expect(hasPermission("WAITER", "order:create")).toBe(true);
    expect(hasPermission("WAITER", "order:update_status")).toBe(true);
    expect(hasPermission("WAITER", "payment:process")).toBe(false);
  });
});
