# Security Architecture & Tenant Isolation

## 1. Server-Side Tenant Isolation Strategy

### Threat Model: Cross-Tenant Data Leakage & Unauthorized Access
A malicious user belonging to `Tenant A` attempts to access or mutate resources belonging to `Tenant B` by manipulating URLs, query parameters, hidden form fields, or API payloads.

### Defense Mechanism
1. **Zero Client Trust**: `tenantId` parameter passed in HTTP request bodies or query strings is ignored for authorization.
2. **Context Derivation**: `getTenantContext()` inspects the validated Clerk session JWT, resolves the user's `UserTenant` mapping in PostgreSQL, and yields a tamper-proof context:
   ```ts
   interface TenantContext {
     userId: string;
     tenantId: string;
     role: Role;
     permissions: Permission[];
   }
   ```
3. **Query Scoping**: Every database query must incorporate `where: { tenantId: context.tenantId }`. Mutative operations verify that target entity `tenantId === context.tenantId` before performing updates or deletes.

---

## 2. Authentication Bounds (Clerk Email OTP)
- Passwordless authentication powered by Clerk Email OTP.
- OTP values, secret tokens, and session credentials must NEVER be logged or persisted in application logs.
- Inactive or suspended users (`User.status !== 'ACTIVE'`) or suspended tenants (`Tenant.status !== 'ACTIVE'`) are immediately denied access with HTTP 403 Forbidden.

---

## 3. Threat Mitigations & Hardening
- **IDOR**: Prevented by server-side tenant scoping on every DB lookup.
- **XSS**: Inputs sanitized with Zod schemas; output escaped by React server components.
- **SQL Injection**: Handled by Prisma parameterized queries.
- **Audit Logging**: Append-only `AuditLog` records actor, action, tenant, resource ID, IP address, and timestamp.
