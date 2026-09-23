---
title: "Migration Strategy"
document_type: "PROCESS"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.1"
created: "2026-09-15"
last_updated: "2026-09-22"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: []
related_documents: ["../implementation/slice-01/deployment.md","../implementation/slice-01/data-model.md","database.md"]
related_decisions: ["RASOIOS-ADR-008"]
---

# Migration Strategy

Runbook for S1-P02-T009. The local and CI steps below were run on 2026-09-22 [fact: TC-DB-001, TC-DB-010]. Staging and production steps take
effect when those environments exist (S1-P01-T008, S1-P27-T003).

| Environment | Command | Rules |
|---|---|---|
| Local | `npm run db:local`, then `npm run prisma:migrate` (`prisma migrate dev`) | Create migrations; never edit a migration that has left your machine; commit `migration.sql` |
| Tests | Vitest global setup applies `prisma migrate deploy` to a run-scoped template database, copied per worker (`tests/integration/setup`) | Migrations are the only way test schemas are built |
| CI | `integration` job: `prisma migrate deploy` on an empty database → `prisma migrate diff --from-url … --to-schema-datamodel … --exit-code` → seed → tests | Any drift fails the build |
| Staging | Railway pre-deploy `npm run prisma:deploy` (`railway.json`) | Automatic on `main` |
| Production | Release pipeline: backup → `prisma migrate deploy` (migration credentials) → deploy | Manual approval; no manual DDL |

## Creating a migration (local)

1. Start the database: `npm run db:local` (or `docker compose up -d postgres`).
2. Edit `prisma/schema.prisma`.
3. Generate without applying: `npx prisma migrate dev --create-only --name <change>`.
4. If the change needs something Prisma cannot express (partial or expression unique index, `NULLS NOT DISTINCT`, CHECK, trigger),
   append hand-written SQL to the new `migration.sql` with a comment naming the data-model rule.
   - If the same index is also declared in the schema (to keep `migrate diff` empty), recreate it in SQL under the **same name**
     (`DROP INDEX …; CREATE UNIQUE INDEX … NULLS NOT DISTINCT`), as `0001_init` does for `kot_tickets_order_section_round_key`.
   - A partial or expression index must **not** be declared in the schema; Prisma ignores indexes it cannot model in the diff only if
     they are not declared. After adding one, run the drift check (step 6) to confirm.
5. Apply: `npx prisma migrate dev`.
6. Drift check: `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code` must print
   `No difference detected` (exit 0).
7. Add a negative test for every new constraint. `tests/integration/db/constraints.test.ts` fails if a CHECK exists without a case.
8. `npm run test:integration`.

## Rules

- **Never edit a migration after it has been applied outside your own machine** (CI artefacts excepted). Prisma records a checksum and
  `migrate deploy` refuses a changed migration. `0001_init` was amended on 2026-09-22, before any shared environment existed, to add
  the `line_subtotal` formula CHECK and the `audit_logs` TRUNCATE guard. That is the only permitted case.
- **No manual DDL** on staging or production. Every change is a committed migration.
- **Additive changes** (new table, nullable column, column with default, new index): one release.
- **Renames and drops:** expand → deploy code that handles both shapes → backfill → contract in a later release.
- **Roll forward, not back.** A failed migration is fixed by a new migration. Restoring the pre-deploy backup is the last resort
  (decision tree in S1-P27-T007).
- **Seeds are for development and test only.** `prisma/seed.ts` refuses `NODE_ENV=production` and any non-local database unless
  `SEED_ALLOW_REMOTE=1` (TC-DB-009).
- **Data migrations** are idempotent SQL inside the migration where possible, tested on a restored copy of production before release.

## Useful commands

| Purpose | Command |
|---|---|
| Status | `npx prisma migrate status` |
| Drift (database vs schema) | `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code` |
| Drift (migrations vs schema, needs an empty scratch database) | `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <scratch url> --exit-code` |
| Seed | `npm run db:seed` (idempotent; a second run inserts 0 rows) |
