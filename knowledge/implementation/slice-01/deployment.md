---
title: "SLICE-01 Deployment Plan — Railway"
document_type: "DEPLOYMENT_PLAN"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "DevOps Engineer (UNASSIGNED) — approval: Gopala Krishna"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["architecture.md", "security.md"]
related_documents: ["architecture.md", "../../operations/railway.md", "../../operations/deployment.md", "../../operations/backups.md", "../../operations/monitoring.md", "../../operations/incident-response.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-011"]
---

# SLICE-01 Deployment Plan — Railway

Status of all infrastructure: **not provisioned** at `18941a9` [fact: no Railway config or CI workflow in the repository]. Items marked
[assumption] must be verified against the Railway plan in use by the named task.

## 1. Topology

| Component | Staging | Production | Task |
|---|---|---|---|
| Application service (Next.js, Node LTS) | Railway service `web`, auto-deploy from `main` | Railway service `web`, deployed by release pipeline (tag + approval) | S1-P01-T008, S1-P27-T001 |
| PostgreSQL | Railway PostgreSQL (same major version as CI/local) | Railway PostgreSQL with backups (Q-025) | S1-P02-T001, S1-P27-T001 |
| Maintenance job | Railway cron service running `npm run maintenance` daily [assumption: cron services available on plan] | Same | S1-P26-T005 |
| Domain / TLS | Railway-provided domain | Custom domain per Q-013 with Railway-managed TLS | S1-P27-T001 |
| Identity | Clerk development instance | Clerk production instance | S1-P03-T001, S1-P27-T005 |
| Print agents | Test agent + printer simulator | Restaurant PCs | S1-P17-T009 |

Replica count: 1 by default. Horizontal scaling is safe because rate limits and print leases live in PostgreSQL (ADR-007, ADR-011), and the replica decision is recorded in S1-P27-T001.

## 2. Environment variables

| Variable | Scope | Staging | Production | Secret | Validation |
|---|---|---|---|---|---|
| `DATABASE_URL` | server | Railway reference | Railway reference, `sslmode=require` | Yes | `lib/env.ts` |
| `DATABASE_MIGRATION_URL` | CI/release only | — | Owner/migration role (if roles supported, S1-P27-T002) | Yes | release workflow |
| `CLERK_SECRET_KEY` | server | dev instance | prod instance | Yes | no placeholder |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | dev | prod | No | no placeholder |
| `CLERK_WEBHOOK_SIGNING_SECRET` | server | dev | prod | Yes | required |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` | client | `/sign-in` / `/sign-up` | same | No | fixed values |
| `NEXT_PUBLIC_APP_URL` | client | staging URL | production URL | No | https in production |
| `ALLOWED_IMAGE_HOSTS` | server | comma list | comma list | No | hostnames only |
| `TRUSTED_PROXY_HOPS` | server | `1` [fact: the app trusts exactly this many proxies, `lib/http/request-meta.ts:25`; Railway's edge router is the one hop in front of `web` — confirm against the live deployment in S1-P27-T001] | same | No | integer 1–5 |
| `LOG_LEVEL` | server | `debug` | `info` | No | enum |
| `SUPER_ADMIN_BOOTSTRAP_EMAIL` | seed/CLI | owner email | owner email | No (PII) | email |
| `NODE_ENV` | server | `production` | `production` | No | enum |

No secret is ever committed. `.env` and `.env*.local` are gitignored [fact: `.gitignore`].

## 3. Build and start

| Step | Command |
|---|---|
| Install | `npm ci` |
| Generate client | `npm run prisma:gen` |
| Build | `npm run build` |
| Start | `npm run start` (binds `PORT` provided by Railway) |
| Pre-deploy (staging) | `npm run prisma:deploy` |
| Pre-deploy (production) | Release pipeline: backup → `prisma migrate deploy` with migration credentials → deploy |

## 4. Health checks

| Endpoint | Purpose | Railway usage |
|---|---|---|
| `GET /api/health` (RH-OPS-01) | Liveness: process responds | Optional external uptime monitor |
| `GET /api/ready` (RH-OPS-02) | Readiness: database reachable within 2 s | **Railway health check path**; deploy considered successful only after 200 |

## 5. Migrations

- Only `prisma migrate deploy` runs against staging and production. No manual DDL (`database/migration-strategy.md`).
- Breaking schema changes follow expand → deploy → migrate data → contract, across separate releases.
- Production migrations run **after** a fresh backup/snapshot (SC-BAK-02) and **before** the new application version receives traffic.
- A failed migration stops the release. Recovery follows §8.

## 6. Deployment sequence

```
Pull request ──► CI (lint, typecheck, unit, static, integration, isolation, adversarial, RBAC, e2e smoke, build, audit)
      │ merge
      ▼
main ──► Railway staging deploy (pre-deploy migrate) ──► staging smoke suite (@smoke)
      │ tag vX.Y.Z
      ▼
Release workflow ──► verify CI + staging smoke green ──► manual approval (Project Owner)
      ──► production backup/snapshot ──► prisma migrate deploy (production)
      ──► Railway production deploy (tagged commit) ──► /api/ready healthy
      ──► production smoke suite ──► release record (version, time, evidence)
```

## 7. Logging

- Structured JSON logs to stdout, collected by Railway (`operations/monitoring.md` has the schema and event catalogue).
- Retention: per Railway plan [assumption: verify in S1-P27-T001]. Security events are searchable by `event` field.
- Logs never contain OTPs, tokens, secrets or unmasked PII (SC-LOG-02).

## 8. Rollback

| Situation | Action |
|---|---|
| Application defect, no schema change | Railway rollback to previous successful deployment; verify `/api/ready` and smoke suite |
| Application defect after additive migration | Roll back the application (previous version compatible with additive schema by expand–contract rule) |
| Migration failed midway | Stop release; inspect `_prisma_migrations`; forward-fix migration if safe; otherwise restore the pre-migration backup (§9) and redeploy the previous version |
| Data corruption | Suspend affected tenant(s) (incident runbook), restore to an isolated database, reconcile, then decide on restore |

Rollback is rehearsed on staging before launch (S1-P27-T007) and targets ≤ 15 minutes for application rollback.

## 9. Backups and restore

- Automated backups per the Railway plan: frequency, retention and point-in-time capability to be confirmed (Q-025, S1-P27-T006).
- Additional pre-release snapshot/backup before every production migration.
- Restore drill: restore the latest production backup into an isolated database, run the row-count checks and application smoke tests against it, then record the measured RPO/RTO.
- The v1.0 claim "WAL archiving, RPO < 1 hour" is **unverified** and must not be relied on until the drill confirms it.

## 10. Secrets rotation

| Secret | Rotation procedure | Drill |
|---|---|---|
| Clerk secret key | Create new key in Clerk → update Railway variable → redeploy → revoke old key | S1-P28-T003 |
| Clerk webhook signing secret | Roll secret in Clerk → update variable → verify delivery | S1-P28-T003 |
| Database password | Rotate in Railway → update references → redeploy → verify `/api/ready` | S1-P28-T003 |
| Print agent token | Revoke agent in `/restaurant/printing` → pair again with new code | S1-P28-T003 |

## 11. Production smoke tests

`@smoke` Playwright suite (TC-QA-006) against the dedicated smoke tenant:
1. `/api/health` and `/api/ready` return 200.
2. The smoke tenant's public page renders.
3. Sign-in with the smoke staff account (Clerk testing token).
4. Dashboard loads.
5. Create an order, then cancel it with reason `smoke-test`.
6. The printing console loads.

The suite takes under 5 minutes and never touches real tenants.

## 11a. Clerk instance configuration (S1-P03-T001, DEP-CHK-04 / DEP-CHK-06)

Set in the Clerk dashboard for **both** the development and the production instance:

| Setting | Required value | Development instance, observed 2026-09-22 |
|---|---|---|
| User & authentication → Email | Email address on; sign in with **Email verification code** | Email code on ✅ |
| Password | **Off** | **On — must be turned off** ❌ |
| Social connections (Google etc.) | **All off** | **Google on — must be turned off** ❌ |
| Phone, username, passkey, web3, magic link | Off | Off ✅ |
| Restrictions → Sign-up mode | **Restricted** (invitations only) | **Public — must be set to Restricted** ❌ |
| Sessions → Maximum lifetime | 12 hours (Q-029) | Not visible via public API — check in dashboard |
| Sessions → Inactivity timeout | 2 hours (Q-029) | Not visible via public API — check in dashboard |
| Paths | Sign-in `/sign-in`, sign-up `/sign-up` | Set via `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` |
| Allowed redirect origins | `http://localhost:3000`, staging URL, production URL | Add staging/production when Railway exists |
| Webhooks | Endpoint `<app>/api/webhooks/clerk`, events `user.updated`, `user.deleted`; copy signing secret to `CLERK_WEBHOOK_SIGNING_SECRET` | Not configured |

Observation method: the instance's public Frontend API `GET /v1/environment` (the same configuration any browser receives on `/sign-in`).
The application enforces invite-only access regardless of these settings: an uninvited Clerk account gets no local user and no data
(TC-AUTH-006). The settings above remove the password and Google paths entirely.

## 12. Deployment checklist (evidence recorded per release gate)

| ID | Check | Evidence source | Task |
|---|---|---|---|
| DEP-CHK-01 | No secrets in repository or history; all secrets in Railway variables | Secret scan output | S1-P27-T004, S1-P24-T006 |
| DEP-CHK-02 | Dependency alerts and secret scanning enabled on GitHub repository | Repository settings screenshot | S1-P24-T006 |
| DEP-CHK-03 | Database connections use TLS; non-TLS refused | Connection test output | S1-P27-T002 |
| DEP-CHK-04 | Clerk instances allow only email code sign-in; sign-up restricted | Clerk configuration export/screenshots | S1-P03-T001, S1-P27-T005 |
| DEP-CHK-05 | Session cookies HttpOnly, Secure, SameSite=Lax on production domain | Browser devtools capture | S1-P27-T005 |
| DEP-CHK-06 | Session lifetime/inactivity configured per Q-029 | Clerk settings | S1-P27-T005 |
| DEP-CHK-07 | Runtime DB credentials lack DDL (or documented infeasibility) | Role test output | S1-P27-T002 |
| DEP-CHK-08 | Backup restore drill completed with measured RPO/RTO | Drill record | S1-P27-T006 |
| DEP-CHK-09 | Pre-migration backup step present and executed in release pipeline | Release workflow logs | S1-P27-T003 |
| DEP-CHK-10 | Database monitoring: slow query events and metrics thresholds configured | Monitoring notes | S1-P26-T008 |
| DEP-CHK-11 | Railway services, domain, TLS and `/api/ready` health check configured | Railway settings | S1-P27-T001 |
| DEP-CHK-12 | Secret rotation drill completed | Drill record | S1-P28-T003 |
| DEP-CHK-13 | Rollback rehearsal completed within target | Rehearsal record | S1-P27-T007 |
