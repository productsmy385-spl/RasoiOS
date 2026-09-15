export type Role =
  | "SUPER_ADMIN"
  | "TENANT_ADMIN"
  | "MANAGER"
  | "CASHIER"
  | "KITCHEN"
  | "WAITER";

export type Permission =
  | "tenant:create"
  | "tenant:manage_all"
  | "tenant:manage_own"
  | "staff:manage"
  | "menu:manage"
  | "order:create"
  | "order:update_status"
  | "payment:process"
  | "refund:process"
  | "kitchen:view_queue"
  | "reports:view"
  | "audit:view";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "tenant:create",
    "tenant:manage_all",
    "reports:view",
    "audit:view",
  ],
  TENANT_ADMIN: [
    "tenant:manage_own",
    "staff:manage",
    "menu:manage",
    "order:create",
    "order:update_status",
    "payment:process",
    "refund:process",
    "kitchen:view_queue",
    "reports:view",
    "audit:view",
  ],
  MANAGER: [
    "staff:manage",
    "menu:manage",
    "order:create",
    "order:update_status",
    "payment:process",
    "refund:process",
    "kitchen:view_queue",
    "reports:view",
  ],
  CASHIER: [
    "order:create",
    "order:update_status",
    "payment:process",
    "kitchen:view_queue",
  ],
  KITCHEN: [
    "order:update_status",
    "kitchen:view_queue",
  ],
  WAITER: [
    "order:create",
    "order:update_status",
    "kitchen:view_queue",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
