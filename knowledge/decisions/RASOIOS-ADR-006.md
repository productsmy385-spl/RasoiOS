---
title: "RASOIOS-ADR-006: Identity, Platform Role, Invite-Only Membership and Active Tenant Resolution"
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
dependencies: ["RASOIOS-ADR-003"]
related_documents: ["../implementation/slice-01/security.md", "../implementation/slice-01/tenant-isolation.md", "../implementation/slice-01/data-model.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-003", "RASOIOS-ADR-008"]
---

# RASOIOS-ADR-006: Identity, Platform Role, Invite-Only Membership and Active Tenant Resolution

- **ID:** RASOIOS-ADR-006
- **Date:** 2026-09-15
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-15, Gopala Krishna (Project Owner), decision gate S1-P01-T010.

## Context

ADR-003 (APPROVED, 2026-09-15) requires tenant context to be derived server-side from the
Clerk session mapped to `UserTenant`. The baseline code (`baseline-audit.md` BA-04…BA-08):

- models `SUPER_ADMIN` as a tenant membership role (`prisma/schema.prisma:27`);
- takes a client-supplied `requestedTenantId` argument on every server action and otherwise
  uses the first membership found (`lib/auth/tenant-context.ts:47-49`);
- creates a local `User` for any Clerk account (`lib/auth/clerk.ts:22-41`), while `/sign-up` is public;
- disables authentication when the Clerk key looks like a placeholder (`middleware.ts:15-30`).

## Problem

1. Platform authority (`SUPER_ADMIN`) should not depend on belonging to any tenant.
2. Tenant selection must be deterministic and must not come from action arguments.
3. A product sold per restaurant needs controlled onboarding, so anyone on the internet
   should not be able to create an account.
4. Authentication must fail closed.

## Decision

1. **Platform role on USER.** `USER.platform_role` ∈ {`NONE`, `SUPER_ADMIN`}.
   `USER_TENANT.role` ∈ {`TENANT_ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`, `WAITER`}.
   SUPER_ADMIN stays one of the product's six roles (CLAUDE.md §Authorization). It is
   stored at platform level and grants only `platform:*` permissions (see `security.md` §3).
2. **Invite-only access.** The Clerk instance runs with public sign-up restricted, and access
   comes from Clerk invitations. An invitation creates a local `USER` (email, `clerk_user_id = NULL`)
   and a `USER_TENANT` with status `INVITED`. On first sign-in the resolver links
   `clerk_user_id` by the Clerk-verified primary email (Email OTP proves control of that
   address), then activates the membership. A Clerk user with no matching invited or active
   `USER` gets no local row and is sent to `/account/no-access`.
3. **Active tenant resolution, per request, server-side only.**
   - Load the user's memberships where `USER_TENANT.status = ACTIVE` and `TENANT.status = ACTIVE`.
   - Exactly one → that tenant.
   - More than one → read the `rasoi_active_membership` cookie (httpOnly, Secure,
     SameSite=Lax, value = `USER_TENANT.id`), then re-validate it against the loaded
     memberships. If it is missing or invalid, redirect to `/account/select-tenant`.
   - The cookie records a preference and is never treated as authorization. It is set only by
     `SA-AUTH-01 switchActiveTenantAction` after a membership check.
   - Server actions, route handlers and loaders **do not accept a tenant identifier
     parameter**. Any `tenantId` in input is rejected by schema validation.
4. **Fresh authorization data.** Roles, membership status, user status and tenant status are
   read from PostgreSQL on every request (memoised per request with React `cache()`), never
   from JWT claims. Suspension or role change takes effect on the next request.
5. **Fail closed.** Missing or placeholder Clerk keys cause a startup error in every
   environment. The dev bypass in `middleware.ts` and `app/layout.tsx` is removed. Tests mock
   the session resolver, not the middleware.
6. **Infrastructure errors are not treated as unauthenticated.** Database or Clerk errors while
   resolving a session return HTTP 503 or the error boundary, and are logged with a request ID.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Keep SUPER_ADMIN as a membership in a "platform tenant" | Couples platform authority to tenant rows; a bug in tenant scoping could grant platform power |
| Clerk Organizations as the tenant model | Duplicates TENANT/USER_TENANT and moves authorization data outside PostgreSQL, contrary to ADR-003 |
| Roles in Clerk session claims | Stale until token refresh; suspension would not be immediate |
| Tenant in URL path (`/t/[tenantId]/…`) | Puts a tenant identifier in the URL, which the brief forbids trusting; still needs server validation, so it adds nothing |
| Open self-sign-up with pending approval | Adds an approval workflow nobody requested; invites are simpler |

## Consequences

- Every existing server action signature changes (removing `requestedTenantId`).
- Adds `/account/no-access`, `/account/select-tenant` and `/account/suspended` routes.
- Staff onboarding depends on Clerk invitations (no separate email provider in SLICE-01).
- A person can belong to several tenants with one identity.

## Security impact

Closes BA-04, BA-05, BA-07 and BA-08. Removes a class of confused-deputy bugs where a client
steers which tenant a request runs under. The email-linking rule relies on Clerk verifying
email ownership (Email OTP). Linking is restricted to `INVITED` users whose email matches
exactly after normalisation (trim and lowercase).

## Database impact

`USER`: add `platform_role`, make `clerk_user_id` nullable+unique, add `last_sign_in_at`.
`USER_TENANT`: role enum without SUPER_ADMIN; status adds `INVITED`; add `invited_by_user_id`,
`invited_at`, `accepted_at`, `clerk_invitation_id`, `deactivated_at`. See `data-model.md`.

## Migration impact

No production data exists (`prisma/migrations/` absent — Q-017 confirms). The change is folded into the
initial migration baseline `0001_init` (S1-P02-T003). A seed script creates the first SUPER_ADMIN from an
environment-provided email (S1-P02-T007).

## Related documents

`implementation/slice-01/security.md` §2–3, `tenant-isolation.md` §2, `data-model.md` (USER, USER_TENANT).
