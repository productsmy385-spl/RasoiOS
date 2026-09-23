---
title: "RASOIOS-ADR-012: Tenant Subdomain Routing for Public Restaurant Websites"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "APPROVED"
version: "1.0"
created: "2026-09-23"
last_updated: "2026-09-23"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-23"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["RASOIOS-ADR-003", "RASOIOS-ADR-006"]
related_documents: ["../implementation/slice-01/api.md", "../implementation/slice-01/frontend.md", "../implementation/slice-01/security.md", "../operations/deployment.md"]
related_decisions: ["RASOIOS-ADR-003", "RASOIOS-ADR-006", "RASOIOS-ADR-013"]
---

# RASOIOS-ADR-012: Tenant Subdomain Routing for Public Restaurant Websites

- **ID:** RASOIOS-ADR-012
- **Date:** 2026-09-23
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-23, Gopala Krishna (Project Owner). Answers Q-013, which was OPEN since 2026-09-15.

## Context

Every tenant is one restaurant (Q-002) with a unique `TENANT.slug`. Until now the public site was served from the
path `/r/[slug]` [fact: `app/r/[slug]/page.tsx`] and Q-013 (hostname strategy) was open. The Project Owner requires
each restaurant to have its own address — `akshaypatra-devarapalli.<platform-domain>` in production and
`akshaypatra-devarapalli.localhost:3000` in development — created by the Super Admin when the tenant is provisioned,
with no per-restaurant deployment: one application, one database, many tenants (ADR-003).

## Problem

Resolve the tenant from the request host, server-side, without trusting anything the browser supplies, while keeping
the console on the apex host and without blocking development on DNS.

## Decision

1. **One app, host-resolved public tenant.** `middleware.ts` classifies every request by host:
   - apex host (`PUBLIC_ROOT_DOMAIN`, `localhost`, Railway's generated host) → console and platform routes as today;
   - `<slug>.<PUBLIC_ROOT_DOMAIN>` (and `<slug>.localhost` in development) → the public website of that slug.
   The resolved slug is passed to the app through an internal request header set by the middleware and re-validated
   server-side; it is never read from a client-supplied header at the edge. `www` and reserved labels
   (`app`, `admin`, `api`, `www`, `static`, `assets`, `mail`, plus the full reserved list in `lib/tenancy/hostnames.ts`)
   are never tenant slugs.
2. **The path form stays.** `/r/[slug]` keeps working on the apex host for previews, QR links and environments with
   no wildcard DNS. Both forms render the same page from the same loader; the subdomain form is canonical, so the
   path form emits `<link rel="canonical">` to the subdomain when `PUBLIC_ROOT_DOMAIN` is configured.
3. **Configuration, not code, carries the domain.** `PUBLIC_ROOT_DOMAIN` (e.g. `rasoios.com`) is an environment
   variable validated in `lib/env.ts`. When it is unset, only the path form and `*.localhost` work — the app still
   runs. The production domain is chosen later (owner, S1-P27-T001); nothing hard-codes a domain.
4. **A tenant slug is immutable after provisioning.** The Super Admin sets it when creating the tenant; changing it
   would break printed QR codes and links, so it is not editable in SLICE-01 (a rename is a platform operation with a
   redirect, Future Scope).
5. **Isolation is unchanged.** The host only selects *which published restaurant is shown*. It never grants access to
   tenant data: the public loader returns only published, public fields (LD-PUB-01 projection), and every authenticated
   route continues to resolve the tenant from the session membership (ADR-003, ADR-006). A signed-in user visiting a
   tenant subdomain sees that restaurant's public site, not another tenant's console.
6. **Authentication stays on the apex host.** Sign-in, the console and the platform admin are served only from the
   apex host; a request to `/restaurant/*`, `/admin/*` or `/sign-in` on a tenant subdomain redirects to the same path
   on the apex host. This keeps one Clerk domain, one session cookie and no cross-subdomain session sharing.
7. **Unknown or suspended tenants.** An unknown slug, an unpublished website or a suspended tenant renders the
   public 404 page — the same response in all three cases, so the host cannot be used to enumerate tenants.

## Consequences

- Production needs a wildcard DNS record (`*.<domain>`) and a wildcard TLS certificate; recorded as a deployment
  prerequisite in `operations/deployment.md` (S1-P27-T001).
- Development needs no host file entries: browsers resolve `*.localhost` to 127.0.0.1.
- E2E tests exercise both forms; `tests/e2e` uses `<slug>.localhost:<port>`.
- Rate limiting for public pages keys on the resolved tenant, not the host string (ADR-011).

## Alternatives considered

- **Path only (status quo).** Simplest, but every restaurant shares one brand's address; rejected by the owner.
- **Custom domains per restaurant.** Needed eventually for restaurants that own a domain; deferred to Future Scope
  because it adds certificate issuance and domain-verification flows.
- **Separate deployment per tenant.** Contradicts ADR-003 and multiplies operational cost.
