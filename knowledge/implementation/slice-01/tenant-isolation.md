---
title: "SLICE-01 Tenant Isolation Architecture"
document_type: "TENANT_ISOLATION"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Security Engineer (UNASSIGNED) — approval: Gopala Krishna"
planned_start: "Not scheduled — execution-order plan"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["RASOIOS-ADR-003", "RASOIOS-ADR-006", "RASOIOS-ADR-007", "RASOIOS-ADR-008"]
related_documents: ["security.md", "data-model.md", "tenant-isolation-tests.md", "threat-model.md", "api.md"]
related_decisions: ["RASOIOS-ADR-003", "RASOIOS-ADR-006", "RASOIOS-ADR-007", "RASOIOS-ADR-008", "RASOIOS-ADR-009"]
---

# SLICE-01 Tenant Isolation Architecture

**The boundary:** a tenant user, print agent or public visitor can read or change only rows whose
`tenant_id` equals a tenant identifier the **server** derived for that request. A tenant identifier supplied by
the client is never an input to that derivation.

## 1. Never-trusted sources

The following are never used to choose or authorise a tenant: `tenantId` or any tenant field in the **URL path, query string,
request body, form data, headers, cookies set by client code, localStorage/sessionStorage, hidden inputs, React
client state, or print-agent payloads**. Zod schemas for every action, handler and loader are `.strict()`. A
`tenantId` key in input is an unknown key and returns 422 (SC-TEN-01, ADV-001).

Two identifiers look tenant-related but are **not authorization inputs**:

| Identifier | Where | Why it is safe |
|---|---|---|
| `slug` | Public URL `/r/[slug]` | Selects which **public** projection to show. It grants nothing, and public data is by definition public (SC-PUB-01). |
| `rasoi_active_membership` cookie | Staff browser | Holds a `USER_TENANT.id` **preference**. Re-validated each request against the signed-in user's ACTIVE memberships; if it doesn't match, it's ignored (ADR-006 §3). |
| `tenantId` in `/admin/tenants/[tenantId]` | Platform console | Authorised by `USER.platform_role = SUPER_ADMIN` (`platform:tenant:read`), not by tenant membership. It exposes tenant metadata only (SC-RBAC-07). |

## 2. Resolution chain

```mermaid
flowchart TD
    A[Request] --> B{Public route?}
    B -- "/r/[slug]" --> P[Public loader: tenant by slug, status ACTIVE, website_published] --> PP[Public projection only]
    B -- "/api/v1/print-agent/*" --> AG[Bearer token → SHA-256 → PRINT_AGENT ACTIVE] --> AC[AgentContext{tenantId from agent row, agentId}]
    B -- protected --> C[Clerk session valid?]
    C -- no --> U[401 / redirect /sign-in]
    C -- yes --> D[USER by clerk_user_id, status ACTIVE]
    D -- missing/inactive --> NA[/account/no-access/]
    D --> E{Route family}
    E -- /admin --> F{platform_role = SUPER_ADMIN?}
    F -- no --> X403[403]
    F -- yes --> PC[PlatformContext{userId}]
    E -- /restaurant, /api/v1 --> G[Memberships: USER_TENANT ACTIVE ∧ TENANT ACTIVE]
    G -- none active, some suspended --> SUS[/account/suspended/]
    G -- none --> NA
    G -- one --> TC[TenantContext]
    G -- many --> H{active cookie ∈ memberships?}
    H -- no --> SEL[/account/select-tenant/]
    H -- yes --> TC
    TC --> R[requirePermission(role)] --> S[lib/data/* WHERE tenant_id = ctx.tenantId]
```

### 2.1 Context types (server-only, `lib/auth/context.ts`)

```ts
// Illustrative contract — implementation in S1-P04-T001
type TenantContext = {
  kind: "tenant";
  requestId: string;
  userId: string;          // USER.id
  membershipId: string;    // USER_TENANT.id
  tenantId: string;        // from USER_TENANT.tenant_id (DB), never from input
  role: TenantRole;        // from USER_TENANT.role (DB)
  permissions: ReadonlySet<Permission>;
  restaurant: { id: string; timezone: string; currencyCode: string };
};
type PlatformContext = { kind: "platform"; requestId: string; userId: string; permissions: ReadonlySet<Permission> };
type AgentContext    = { kind: "agent"; requestId: string; agentId: string; tenantId: string; printerIds: string[] };
```

`getTenantContext()` is wrapped in React `cache()`, so it resolves once per request. It reads PostgreSQL every
request, so role, membership and suspension changes apply on the next request (ADR-006 §4).

## 3. Layer responsibilities

| Layer | Location | Must | Must not |
|---|---|---|---|
| Middleware | `middleware.ts` | Reject requests without a Clerk session on protected routes; attach `x-request-id` | Resolve tenant, check permissions, or be the only check |
| Loader / Server Action / Route Handler | `app/**` | Call `requireTenant(permission)` / `requirePlatform(permission)` / `requireAgent()` **first**; validate input with strict Zod | Import Prisma; accept tenant parameters; return raw DB rows |
| Service | `lib/services/**` | Enforce business rules, state machines, money rules; open DB transactions; write audit | Take `tenantId` as a loose string from callers (takes `TenantContext`) |
| Data access | `lib/data/**` | Put `tenant_id = ctx.tenantId` in **every** tenant-owned query; return DTO projections; map miss → `NotFoundError` | Use `findUnique({ where: { id } })` or `update({ where: { id } })` without tenant |
| Database | PostgreSQL | Composite FKs `(tenant_id, parent_id)`; `UNIQUE (tenant_id, id)`; CHECKs; audit trigger | Rely on application code alone |

### 3.1 Canonical patterns

```ts
// READ by id — one scoped query; miss and cross-tenant are indistinguishable
export async function getOrder(ctx: TenantContext, orderId: string) {
  const row = await db.order.findFirst({ where: { id: orderId, tenantId: ctx.tenantId }, select: orderDetailSelect(ctx.role) });
  if (!row) throw new NotFoundError("Order not found");
  return toOrderDetailDto(row);
}

// UPDATE by id — tenant + optimistic version in WHERE; count 0 → 404/409
const res = await tx.order.updateMany({
  where: { id: orderId, tenantId: ctx.tenantId, version: expectedVersion },
  data: { status: next, version: { increment: 1 } },
});
if (res.count === 0) throw await notFoundOrConflict(tx, ctx, orderId);

// CREATE child — tenant_id always from ctx; composite FK rejects a foreign parent even if a bug passes one
await tx.orderItem.create({ data: { tenantId: ctx.tenantId, orderId, /* … */ } });
```

`notFoundOrConflict` re-queries **with the tenant filter**. It returns 409 only if the row exists in the caller's tenant (version
mismatch), otherwise 404.

## 4. Isolation by surface

| Surface | Mechanism | Controls | Tests |
|---|---|---|---|
| **Authenticated identity** | Clerk session → USER by `clerk_user_id`; invited-email linking only | SC-AUTH-04, SC-AUTH-06 | TC-AUTH-005, ADV-021 |
| **Membership** | Only `USER_TENANT.status = ACTIVE` ∧ `TENANT.status = ACTIVE` count | SC-TEN-06 | TC-AUTH-008, TI-059 |
| **Role** | Read from `USER_TENANT.role` each request | SC-RBAC-03 | ADV-005, ADV-006 |
| **Permission** | `requirePermission` before resource load | SC-RBAC-01 | TC-RBAC-101…150 |
| **Resource ownership** | Scoped queries; composite FKs; 404 on miss | SC-TEN-02, SC-TEN-04, SC-TEN-05 | TI-001…TI-040, TC-DB-004 |
| **Service/repository scoping** | `lib/data` only; static guard | SC-TEN-02, SC-TEN-03 | TC-TENANT-002 |
| **API scoping** | No tenant params; strict schemas; tenant from context | SC-TEN-01 | ADV-001, ADV-003 |
| **Background work** | SLICE-01 has **no job runner** (by design: scheduling is read-time, ADR-009 polling, print via agent). Deferred work inside a request (KOT generation, print-job enqueue) runs in the **same DB transaction with the same `TenantContext`**. Maintenance tasks (rate-limit bucket cleanup) touch non-tenant tables only. Any future job runner must carry `tenantId` in the job record and re-resolve context from it. | SC-TEN-02 | TC-KOT-001, TC-PRINT-001 |
| **Print jobs** | Job `tenant_id` = creating context; agent tenant from token; claim filters `tenant_id` and agent's printers; ack checks agent + claim token | SC-TEN-07, SC-PRINT-01…05 | TI-041…TI-046, ADV-012, ADV-013 |
| **Cache** | Authenticated responses `Cache-Control: no-store`; no `unstable_cache`/`fetch` cache for tenant data; public pages use `revalidate` keyed by slug with public projection only; `revalidatePath` after public-affecting mutations | SC-TEN-09, SC-HDR-03 | TC-SEC-006, ADV-026 |
| **Files** (Q-009) | Storage key prefix `tenants/{tenantId}/…` derived server-side; `MEDIA_ASSET.tenant_id`; signed URLs generated only after scoped lookup | SC-FILE-02 | TI-058 |
| **Reports** | Every aggregate query in `lib/data/reports.ts` has `tenant_id = ctx.tenantId`; date ranges converted from restaurant timezone; no platform-wide financial aggregation exists | SC-TEN-08 | TI-047, TI-048, TC-RPT-006 |
| **Exports** | No export endpoint in SLICE-01 (Q-014). If approved, it must stream from the same scoped report functions and be audited. | — | TI-049 (asserts no export route exists / 404) |
| **Audit log** | Tenant users read `tenant_id = ctx.tenantId`; SUPER_ADMIN reads platform rows plus tenant lifecycle rows only | SC-AUD-05 | TI-050, TI-051 |
| **Public websites** | Tenant by slug with `status = ACTIVE ∧ website_published`; explicit projection (no staff, customers, transactions, audit, settings, internal flags) | SC-PUB-01…03 | TC-WEB-002…005, ADV-025 |
| **Social cards / OG images** | Rendered from the public projection only; no authenticated data in images | SC-PUB-01 | TC-SOC-004 |
| **Logs** | Logs carry `tenant_id` for correlation; log access is operator-only (Railway), not tenant-facing | SC-LOG-01 | TC-OBS-001 |
| **Super Admin** | `PlatformContext` cannot call tenant services (type system: tenant services require `TenantContext`) | SC-RBAC-03, SC-RBAC-07 | TC-ADMIN-006, ADV-006 |

## 5. Error semantics

| Situation | Page result | API/action result | Leaks existence? |
|---|---|---|---|
| No session | redirect `/sign-in` | 401 `UNAUTHENTICATED` | n/a |
| Session but no active membership | `/account/no-access` | 403 `NO_ACTIVE_MEMBERSHIP` | no |
| Tenant suspended | `/account/suspended` | 403 `TENANT_SUSPENDED` | no (own tenant) |
| Lacks permission | `forbidden` state (403 page) | 403 `FORBIDDEN` — checked **before** loading the resource | no |
| Resource missing **or** in another tenant | `notFound()` (404 page) | 404 `NOT_FOUND` | no |
| Version conflict in own tenant | inline "This order changed — refreshed" | 409 `CONFLICT` | own tenant only |

## 6. Verification

- `tenant-isolation-tests.md`: 62 cross-tenant scenarios (TI) and 30 adversarial scenarios (ADV). They run in CI against a real
  PostgreSQL database seeded with Tenant A and Tenant B (SC-TEN-10).
- Static guard `tests/static/tenant-scope.test.ts` (TC-TENANT-002).
- Release gate G04 in `acceptance.md`: 100% of TI and ADV tests pass. There are no skipped isolation tests.
