# Role-Based Access Control (RBAC) Specification

## 1. System Roles
The platform defines 6 distinct roles:

1. `SUPER_ADMIN`: Platform owner. Can manage platform tenants, activate/suspend tenants, and inspect platform-level audit logs. Cannot modify tenant menu or POS transactions unless acting within platform governance.
2. `TENANT_ADMIN`: Restaurant owner / administrator. Full administrative access within their assigned tenant (menu, staff, settings, financial reports, orders, KOT, social).
3. `MANAGER`: Operational manager within tenant. Can manage daily menus, orders, refunds, staff schedules, and view operational reports.
4. `CASHIER`: POS & cashier operator. Can create orders, take payments, handle cash drawer, view order status.
5. `KITCHEN`: Kitchen & preparation staff. Focused access to Kitchen / KOT Display System (KDS), updating order state to `PREPARING` or `READY`.
6. `WAITER`: Floor staff. Can take orders, view table status, update order statuses.

---

## 2. Permission Matrix

| Permission Code | SUPER_ADMIN | TENANT_ADMIN | MANAGER | CASHIER | KITCHEN | WAITER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `tenant:create` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `tenant:manage_all` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `tenant:manage_own` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `staff:manage` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `menu:manage` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `order:create` | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `order:update_status`| ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `payment:process` | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `refund:process` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `kitchen:view_queue` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reports:view` | ✅ (all) | ✅ (own) | ✅ (own) | ❌ | ❌ | ❌ |
| `audit:view` | ✅ (all) | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
