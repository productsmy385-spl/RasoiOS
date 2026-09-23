---
title: "Database"
document_type: "REFERENCE"
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
related_documents: ["../implementation/slice-01/data-model.md","../implementation/slice-01/erd.md","migration-strategy.md"]
related_decisions: ["RASOIOS-ADR-008","RASOIOS-ADR-010"]
---

# Database
> **Canonical sources:** fields and constraints in [`data-model.md`](../implementation/slice-01/data-model.md), relationships in [`erd.md`](../implementation/slice-01/erd.md).

## Invariants (summary)
- PostgreSQL via Prisma. Every tenant-owned table has `tenant_id` with composite foreign keys `(tenant_id, parent_id)`, so cross-tenant references are impossible (ADR-008).
- Money `NUMERIC(12,2)`, rates `NUMERIC(5,2)`. Timestamps `TIMESTAMPTZ` (UTC). Business dates `DATE` in the restaurant timezone (ADR-010).
- Financial and historical rows are never hard-deleted. Audit logs are immutable (trigger).
- No plan, tier, subscription or billing columns (ADR-002).

## Environment facts
| Item | Value | Status |
|---|---|---|
| PostgreSQL major version | **16** everywhere: local embedded `PostgreSQL 16.14, compiled by Visual C++ build 1944, 64-bit` (`server_version_num` 160014, UTF8) [fact: `SELECT version()` 2026-09-15]; `docker-compose.yml` and CI `postgres:16` [fact]; staging/production Railway PostgreSQL to be created at major 16 (S1-P01-T008, S1-P27-T001) | Local + CI verified; Railway pending |
| `UNIQUE NULLS NOT DISTINCT` support | Verified on 16.14: duplicate `(1, NULL)` insert rejected [fact: TC-DB-008 `tests/integration/db/feature-probe.test.ts`] | Verified |
| `gen_random_uuid()` | Built in (PostgreSQL ≥ 13), verified [fact: TC-DB-008] | Verified |
| Role creation privileges | Local superuser (`rolcreaterole`, `rolsuper` true); Railway managed role privileges checked in S1-P27-T002 | Local only |
| Local development database | `npm run db:local` — `embedded-postgres` 16.14.0-beta.17 (MIT, single maintainer leinelissen; 100 MB Windows binary package; chosen 2026-09-15 by the Project Owner because the development machine has neither Docker nor PostgreSQL). Dev dependency only; never used in CI or production | In use |
| Runtime vs migration roles | Not yet documented — S1-P27-T002 | — |
| Report query plans | Not yet documented — S1-P19-T005 | — |

## Baseline
At commit `18941a9` the schema had 15 models and **no migrations** [fact: no `prisma/migrations`]. The v2 schema is introduced as migration `0001_init` (S1-P02-T003).
