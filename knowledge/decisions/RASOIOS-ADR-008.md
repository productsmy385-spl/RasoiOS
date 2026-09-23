---
title: "RASOIOS-ADR-008: Tenant-Scoped Data Access Layer and Database-Enforced Tenant Integrity"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "APPROVED"
version: "1.1"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["RASOIOS-ADR-003", "RASOIOS-ADR-006"]
related_documents: ["../implementation/slice-01/tenant-isolation.md", "../implementation/slice-01/data-model.md", "../implementation/slice-01/architecture.md"]
related_decisions: ["RASOIOS-ADR-003", "RASOIOS-ADR-006"]
---

# RASOIOS-ADR-008: Tenant-Scoped Data Access Layer and Database-Enforced Tenant Integrity

- **ID:** RASOIOS-ADR-008
- **Date:** 2026-09-15
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-15, Gopala Krishna (Project Owner), decision gate S1-P01-T010.

## Context

ADR-003 requires every tenant query to be scoped by the server-derived tenant. The baseline
does this by convention: some code loads by ID and then calls `assertTenantOwnership`
(`app/restaurant/menu/items-actions.ts:90-93`). Other code forgets entirely (`BA-02`). Child
tables (`order_items`, `daily_menu_items`) have no `tenant_id`, and single-column foreign keys
let a row reference another tenant's parent (`BA-25`). Cross-tenant loads return 403 while
missing rows return 404, which tells a caller whether an ID exists.

## Problem

Convention-only scoping fails silently the first time someone writes
`prisma.order.findUnique({ where: { id } })`. The database gives no second line of defence.

## Decision

1. **Single access boundary.** Tenant-owned models are read and written only through
   `lib/data/<domain>.ts` functions whose first parameter is `TenantContext` (or `AgentContext`
   for print agents). Every generated query includes `tenant_id = ctx.tenantId` in its `WHERE`
   clause (or relies on a composite unique `(tenant_id, id)`). Server actions, route handlers and
   loaders call services, services call `lib/data`, and nothing else imports the Prisma client
   for tenant-owned models.
2. **Guard in CI.** A Vitest static-analysis test (`tests/static/tenant-scope.test.ts`) fails the build if:
   (a) `@/lib/db/prisma` is imported outside `lib/data/**`, `lib/db/**`, `prisma/seed.ts`, `tests/**`; or
   (b) a `lib/data` function for a tenant-owned model calls `findUnique`, `update`, `delete` or `upsert`
   with a `where` lacking `tenantId`. All `lib/data` and `lib/services` modules import `server-only`.
3. **Not found = forbidden.** Looking up a resource ID that does not exist **or** belongs to
   another tenant returns the same `NotFoundError` (HTTP 404 / `notFound()`), with the same body and
   comparable timing (a single scoped query). No existence oracle.
4. **Database-enforced integrity.**
   - Every tenant-owned table has `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT`,
     including child tables (`order_items`, `order_item_addons`, `daily_menu_items`, `kot_items`,
     `menu_item_variants`, `menu_item_addons`, `restaurant_hours`).
   - Every parent referenced by a child declares `UNIQUE (tenant_id, id)`. Children reference it with a
     **composite foreign key** `(tenant_id, parent_id) → parent(tenant_id, id)`, so a child row cannot
     point at another tenant's parent.
   - Tenants are never hard-deleted (suspension only), so `RESTRICT` never blocks normal operations.
5. **Public reads.** Public website loaders resolve tenant by slug through
   `lib/data/public.ts`, which returns explicit field projections only (no `include` of whole rows).
6. **PostgreSQL Row-Level Security** is not adopted in SLICE-01 and is recorded in Future Scope as defence in depth.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| PostgreSQL RLS with `SET LOCAL app.tenant_id` | Needs every Prisma call wrapped in an interactive transaction with the setting applied, which clashes with connection pooling. It adds a second policy language to test. Kept as Future Scope. |
| Prisma client extension that auto-injects `tenantId` | Implicit magic, easy to bypass with `$queryRaw`, and hard to audit; explicit functions plus a CI guard are clearer |
| Schema-per-tenant or database-per-tenant | Operational cost (migrations × tenants) is out of proportion for this product |
| Keep `assertTenantOwnership` after unscoped load | Leaks existence (403 vs 404) and is easy to forget |

## Consequences

- Services and actions are refactored to call `lib/data`.
- Composite keys make Prisma relations slightly more verbose (`@relation(fields: [tenantId, orderId], references: [tenantId, id])`).
- Cross-tenant tests assert 404, not 403.

## Security impact

Closes BA-02 and BA-25. Mitigates T-001 (cross-tenant access) and T-002 (IDOR) at two layers.
Failure mode: a bug in one `lib/data` function is still possible, and is caught by the static guard plus
tenant isolation tests TI-001…TI-060.

## Database impact

All tenant-owned tables gain or keep `tenant_id`; composite uniques and composite FKs as listed in `data-model.md`.

## Migration impact

Folded into `0001_init` (no production data — Q-017). If data is later found to exist, S1-P02-T003 adds a
backfill step: set child `tenant_id` from the parent, then add constraints.

## Related documents

`implementation/slice-01/tenant-isolation.md`, `data-model.md` §2, `tenant-isolation-tests.md`.
