---
title: "Deploying RASOIOS to Vercel"
document_type: "RUNBOOK"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "PROPOSED"
created: "2026-09-23"
last_updated: "2026-09-23"
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-007", "RASOIOS-ADR-011", "RASOIOS-ADR-012"]
related_documents: ["railway.md", "../implementation/slice-01/deployment.md"]
---

# Deploying RASOIOS to Vercel

> **This contradicts an approved decision.** RASOIOS-ADR-001 (APPROVED, 2026-09-15) selects **Railway** deployment,
> and `railway.json`, `knowledge/operations/railway.md` and `deployment.md` are all written for it. Vercel was
> requested by the Project Owner on 2026-09-23. Nothing here is in effect until ADR-001 is superseded by a new ADR
> recording the change and its consequences — the four in §4 are not cosmetic.

## 1. What Vercel needs that Railway supplied

| Concern | Railway | Vercel |
|---|---|---|
| Prisma Client generation | `railway.json` → `buildCommand: npm run prisma:gen && npm run build` | `postinstall: prisma generate` in `package.json` [fact: added 2026-09-23] — Vercel's default build command is `next build` alone, and it caches `node_modules`, so without this the build fails on a missing client |
| Migrations | `preDeployCommand: npm run prisma:deploy` | **No equivalent.** `prisma migrate deploy` has to run from CI or by hand against the production database *before* the deployment is promoted |
| Database | Railway PostgreSQL over the private network | None. A PostgreSQL instance must exist and be reachable from Vercel's functions over TLS (`sslmode=require`) |
| Health check | `healthcheckPath: /api/ready` | Not part of a Vercel deployment; `/api/ready` still answers and should be used by whatever uptime monitor is chosen |
| Process model | One long-lived Node process | Serverless functions, scaled to zero. See §4 |

## 2. Environment variables

`lib/env.ts` validates these at boot and refuses placeholder values, so a deployment with a missing or dummy entry
fails loudly rather than serving a half-configured app.

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://…?sslmode=require`. On Vercel Postgres (Neon) this must be the **pooled** endpoint — the one Vercel exposes as `POSTGRES_PRISMA_URL`, host `…-pooler.…`. Each serverless invocation opens its own connection, so the unpooled endpoint exhausts `max_connections` under any real load |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk instance key |
| `CLERK_SECRET_KEY` | Yes | Clerk instance secret |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Yes in production | Svix signing secret for `/api/webhooks/clerk` |
| `NEXT_PUBLIC_APP_URL` | Yes | The deployment's own absolute URL, https in production |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` | No | Fixed `/sign-in` and `/sign-up`; the schema accepts nothing else |
| `PUBLIC_ROOT_DOMAIN` | No | Set once tenant sub-domains have a real domain (ADR-012). Unset, only `/r/{slug}` resolves |
| `ALLOWED_IMAGE_HOSTS` | No | Comma-separated hostnames for `next/image` and the URL validators |
| `TRUSTED_PROXY_HOPS` | No | **Re-verify on Vercel — do not copy Railway's `1`.** See §4 |
| `LOG_LEVEL` | No | `info` in production |

## 3. Procedure

1. `vercel login` (interactive; cannot be done from a non-interactive session).
2. `vercel link` in the repository root.
3. Create the database, then run the migrations against its **direct, unpooled** endpoint — Vercel exposes that one as
   `POSTGRES_URL_NON_POOLING`:

   ```bash
   DATABASE_URL='<unpooled url>' npm run prisma:deploy
   ```

   A pooler in transaction mode cannot run the advisory locks and DDL that `prisma migrate deploy` needs, so pointing
   this at the pooled URL fails part-way through. The app itself keeps the pooled URL (§2).
4. Add every variable in §2 to the Vercel project, for Production and Preview.
5. `vercel deploy --prod`.
6. Add the deployment's domain to the Clerk instance's allowed origins, and point the Clerk webhook at
   `https://<domain>/api/webhooks/clerk`.
7. Check `/api/ready` returns ready, then sign in and confirm the console loads a real tenant.

## 4. Consequences to settle before this is the real target

1. **`TRUSTED_PROXY_HOPS`.** The audit trail's client address and the print-agent pairing brute-force limit both trust
   exactly this many `X-Forwarded-For` entries from the right (`lib/http/client-ip.ts`). Railway is one hop; Vercel's
   edge chain is its own and has to be measured against a real request before the value is set. Too high and a caller
   can forge an address and defeat the pairing limit (ADV-015).
2. **The print-agent polling API.** ADR-007 §7 assumes agents poll a long-lived server every 3 s. On serverless that is
   an invocation per agent per 3 s, billed and cold-start-prone; the claim query's `FOR UPDATE SKIP LOCKED` also holds
   a connection for its duration.
3. **Connection pooling.** Serverless functions open a connection each; PostgreSQL will exhaust `max_connections`
   without a pooler (PgBouncer in transaction mode, or a driver-adapter serverless connection). ADR-011's rate limiter
   is in PostgreSQL too, so every limited request needs a connection.
4. **Migrations are no longer part of the deployment.** Railway ran them in `preDeployCommand`. On Vercel a deployment
   can go live against a database that has not been migrated unless step 3 is enforced in CI.
