---
title: "Deployment Policy"
document_type: "PROCESS"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: []
related_documents: ["../implementation/slice-01/deployment.md"]
related_decisions: []
---

# Deployment Policy
> **Canonical source:** [`../implementation/slice-01/deployment.md`](../implementation/slice-01/deployment.md). This domain file keeps only the durable summary for deployment procedures. Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


- Production deploys only through the release pipeline: CI green → staging smoke green → Project Owner approval → backup → migrate → deploy → smoke.
- Every merge to `main` deploys to staging.
- First run in a new environment: `npm run platform:grant-super-admin -- --email <owner email> --confirm` (S1-P06-T008).

## Public website hosting (S1-P09-T011, RASOIOS-ADR-012) [fact]

`PUBLIC_ROOT_DOMAIN` is an **optional** environment variable validated in `lib/env.ts:PUBLIC_ROOT_DOMAIN`. It is a bare
domain (`rasoios.com`) and turns on the canonical per-restaurant address `<slug>.<domain>`.

- **Unset** (the default, and the current state of every environment): the console, `/r/{slug}` and `<slug>.localhost`
  all work, and no canonical link to a sub-domain is emitted. Nothing fails.
- **Set:** the environment needs a `*.<domain>` DNS record and a **wildcard TLS certificate** before the variable is
  set, otherwise tenant hosts cannot be reached. Choosing the production domain is S1-P27-T001 (Project Owner).
- The console, the platform admin and authentication stay on the apex host; a request to them on a tenant host is
  redirected there (`middleware.ts`). Tenant slugs are validated against the reserved host labels in
  `lib/tenancy/hostnames.ts`, so no restaurant can take `www`, `app`, `admin`, `api`, `mail`, … .

## Continuous integration (S1-P01-T006)

Workflow: `.github/workflows/ci.yml`. It runs on every pull request and on pushes to `main`, using Node 24 (`.nvmrc`).

| Job | What it runs | Required status check on `main` |
|---|---|---|
| `lint` | `npm run lint` (ESLint, zero warnings) | Yes |
| `typecheck` | `npm run typecheck` | Yes |
| `unit` | `npm run test:unit` | Yes |
| `static` | `npm run test:static` (repository rule tests) | Yes |
| `integration` | PostgreSQL 16 service → `prisma migrate deploy` (once migrations exist) → seed (once present) → `npm run test:integration` | Yes |
| `e2e` | Playwright desktop/tablet/mobile against `next build && next start` | Yes |
| `build` | `npm run build` | Yes |
| `audit` | `npm audit --audit-level=high` | Yes |

Isolation, adversarial and RBAC matrix suites run inside `integration`. They become separately named required checks when their suites exist (S1-P04-T009, S1-P05-T002, S1-P24-T008).

**Repository secrets** (Clerk *development* instance only; never production keys in CI): `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

**Branch protection to configure on GitHub** (repository settings, done by the repository owner):
- require a pull request before merging;
- require the eight status checks above to pass;
- require branches to be up to date before merging;
- disallow force pushes and deletions on `main`.

**Dependency overrides** (`package.json` `overrides`, 2026-09-15). These keep the high-severity audit gate green without major framework upgrades:

| Override | Reason | Revisit when |
|---|---|---|
| `next` → `postcss@8.5.28` | Next 15.5.25 pins `postcss@8.4.31` (GHSA-qx2v-qp2m-jg93 and related, high); the upstream fix is Next 16 (major) | Next.js upgrade decision |
| `@prisma/config` → `deepmerge-ts@8.0.2` | Prisma 6.19.3 pins `deepmerge-ts@7.1.5` (stack exhaustion, high); the upstream fix is Prisma 7+ (major) | Prisma upgrade decision |

Remaining moderate advisories (Vitest `@vitest/mocker` path traversal, fixed only in Vitest 5) do not fail the gate and are tracked for the next test-tooling upgrade.
