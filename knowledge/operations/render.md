---
title: "Deploying RASOIOS to Render"
document_type: "RUNBOOK"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "PROPOSED"
created: "2026-09-23"
last_updated: "2026-09-23"
related_decisions: ["RASOIOS-ADR-014", "RASOIOS-ADR-001", "RASOIOS-ADR-007", "RASOIOS-ADR-011", "RASOIOS-ADR-012"]
related_documents: ["railway.md", "vercel.md", "../implementation/slice-01/deployment.md"]
---

# Deploying RASOIOS to Render

> Proposed in RASOIOS-ADR-014 (2026-09-23), which would supersede the Railway part of RASOIOS-ADR-001. Until
> ADR-014 is approved, `railway.json` and `railway.md` remain the recorded target.

Render runs one long-lived Node process per instance, like Railway, so the print-agent polling (ADR-007) and the
PostgreSQL rate limiter (ADR-011) behave as designed. The Blueprint is [`render.yaml`](../../render.yaml)
[fact]; `tests/static/deploy-config.test.ts` keeps it aligned with `package.json`, `railway.json` and CI.

## 1. What the Blueprint creates

| Resource | Setting | Why |
|---|---|---|
| `rasoios-web` web service | Plan `starter`, region `singapore`, branch `main`, auto-deploy | Free spins down when idle and cannot run a pre-deploy command |
| Build | `npm ci && npm run prisma:gen && npm run build` | npm 11 `allow-scripts` can skip the Prisma `postinstall` |
| Pre-deploy | `npm run prisma:deploy` | Migrations run before the new version takes traffic, as on Railway |
| Start | `npm run start` — `next start` binds Render's `PORT` | — |
| Health check | `/api/ready` | Checks the database is reachable, not just the process |
| `rasoios-db` | PostgreSQL 16, plan `basic-256mb`, `singapore` | Same major version as CI and `docker-compose.yml` |

## 2. Environment variables

`lib/env.ts` validates these at boot and refuses placeholders. Secrets are `sync: false` in the Blueprint, so Render
asks for them when the Blueprint is applied; nothing secret is committed.

| Variable | Value |
|---|---|
| `DATABASE_URL` | `rasoios-db` → **Internal Database URL** + `?sslmode=require`. In production `lib/env.ts:71` rejects a URL without `sslmode` unless the host is `*.railway.internal`; Render's internal host is `dpg-…` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk instance keys |
| `CLERK_WEBHOOK_SIGNING_SECRET` | `whsec_…` from the Clerk webhook |
| `NEXT_PUBLIC_APP_URL` | `https://rasoios-web.onrender.com` (https is enforced in production) |
| `ALLOWED_IMAGE_HOSTS` | Comma-separated hostnames, may be empty |
| `NODE_ENV`, `LOG_LEVEL` | Set by the Blueprint: `production`, `info` |
| `TRUSTED_PROXY_HOPS` | **Unset** until measured — §4 |
| `PUBLIC_ROOT_DOMAIN` | Only with the wildcard domain — §4 |

Whether Render's internal endpoint accepts TLS is not yet verified [assumption]. If the first deploy fails to connect
with `sslmode=require`, use the **External Database URL** (TLS is required there) and record the outcome here.

## 3. Procedure

1. Push `render.yaml` to `main`.
2. Sign in at dashboard.render.com and connect the GitHub repository (interactive; cannot be done from here).
3. **New → Blueprint**, pick the repository. Render reads `render.yaml` and lists `rasoios-web` and `rasoios-db`.
4. Enter the `sync: false` values. `DATABASE_URL` needs the database first: if Render will not create it before
   asking, enter a temporary value, let the database finish provisioning, then set the real URL (§2) and redeploy.
5. The first deploy runs `prisma migrate deploy` in the pre-deploy step, then health-checks `/api/ready`.
6. In Clerk: add the `onrender.com` domain to allowed origins and point the webhook at
   `https://rasoios-web.onrender.com/api/webhooks/clerk`.
7. Create the first super admin: in the service **Shell**, `npm run platform:grant-super-admin`.
8. Check `/api/ready`, sign in, confirm the admin console and one tenant console load.

## 4. Open items

1. **`TRUSTED_PROXY_HOPS`.** The audit trail's client address and the print-agent pairing limit trust this many
   `X-Forwarded-For` entries from the right (`lib/http/client-ip.ts`). Render's proxy chain has not been measured; too
   high a value lets a caller forge an address (ADV-015). Unset, no address is recorded. Measure against a real
   request, then set it.
2. **Tenant subdomains (ADR-012).** Add `*.<domain>` and `<domain>` as custom domains on `rasoios-web`, then set
   `PUBLIC_ROOT_DOMAIN` and change `NEXT_PUBLIC_APP_URL` to the custom domain.
3. **Database network access.** The database accepts external connections with its password. Once the app is known
   to work over the internal URL, restrict the external IP allow list to nothing.
4. **Backups.** Render's plan-level point-in-time recovery has not been reviewed against `backups.md`.
