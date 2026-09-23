---
title: "RASOIOS-ADR-014: Render as the Deployment Target"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "1.0"
created: "2026-09-23"
last_updated: "2026-09-23"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-23"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["RASOIOS-ADR-001"]
related_documents: ["../operations/render.md", "../operations/railway.md", "../operations/vercel.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-007", "RASOIOS-ADR-011", "RASOIOS-ADR-012"]
---

# RASOIOS-ADR-014: Render as the Deployment Target

- **ID:** RASOIOS-ADR-014
- **Date:** 2026-09-23
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** PROPOSED — requested by the Project Owner on 2026-09-23; awaiting approval. On approval it supersedes
  the "Railway deployment" clause of RASOIOS-ADR-001 only; the rest of ADR-001's stack is unchanged.

## Context

ADR-001 (2026-09-15) chose Railway. No Railway project was ever provisioned (`railway.md`, S1-P01-T008 blocked on
owner approval). On 2026-09-23 the Project Owner asked for a Vercel runbook (`vercel.md`) and then for a Render
deployment. Vercel's serverless model conflicts with ADR-007's 3-second agent polling and needs a connection pooler;
Render does not.

## Decision

Deploy the web app and PostgreSQL 16 on Render from the Blueprint `render.yaml`: one `starter` web service running
`next start`, migrations in the pre-deploy command, health check `/api/ready`. `railway.json` stays in the repository
until this ADR is approved, so either target remains deployable.

## Consequences

- Same process model as Railway: long-lived Node process, no cold starts, polling and the PostgreSQL rate limiter
  unchanged.
- `DATABASE_URL` must carry `sslmode=require`: `lib/env.ts` exempts only `*.railway.internal` hosts.
- `TRUSTED_PROXY_HOPS` has to be re-measured on Render before it is set (ADV-015).
- The Free plan is unsuitable (idle spin-down, no pre-deploy step); cost is at least the `starter` web plan plus a
  paid database.
- Operations detail: `knowledge/operations/render.md`.
