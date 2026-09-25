---
title: "Integration Tests"
document_type: "REFERENCE"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.1"
created: "2026-09-15"
last_updated: "2026-09-25"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: []
related_documents: ["../implementation/slice-01/testing.md"]
related_decisions: ["RASOIOS-ADR-008"]
---

# Integration Tests

| Aspect | Approach |
|---|---|
| Runner | Vitest project `integration` (`npm run test:integration`) |
| Database | Real PostgreSQL (same major as staging); per-worker database; `prisma migrate deploy`; seed fixtures (S1-P02-T008) |
| Identity | Stub only Clerk `auth()` at the boundary via actor helpers `asUser`, `asPlatformAdmin`, `asAgent`, `asAnonymous` (S1-P04-T009) |
| External HTTP | Clerk Backend API and storage stubbed at the HTTP boundary |
| Time | Injectable clock for business-date and lease tests |
| Isolation | Per-test transaction rollback or truncate; deterministic UUIDs |
| Scope | Services, loaders, Server Actions, Route Handlers, constraints, triggers, audit, rate limits, print queue concurrency |
| Not allowed | Mocking Prisma or services in integration tests |

## A new table with constraints needs a fixture row, in the right fixture

TC-DB-004 and TC-DB-005 are *coverage* tests: they read the composite foreign keys and CHECK constraints out of
`pg_constraint` and fail when one has no case, rather than passing quietly over a constraint nobody proved. So a
migration that adds either also has to add the case **and** a row to push against, or CI goes red on the next push.
[fact: `prisma/migrations/0004_media_assets` added five CHECKs with no cases; `main` was red from `a994ac4` until
`e1658a9`, and `0003_printer_discovery_theme_preference` did the same to TC-DB-004 earlier.]

There are two unrelated fixture builders with similar shapes, and picking the wrong one produces a passing coverage
count with failing cases — the UPDATE matches no row, so nothing is rejected and nothing errors:

- `createFullTenant` in `tests/factories/index.ts` — used by TC-DB-004 and the wider suite.
- `buildFixture`, defined **locally** at the top of `tests/integration/db/constraints.test.ts` — used by TC-DB-005
  only. Editing `tests/factories` for a CHECK case, or `prisma/seed-data/build.ts` for either, changes nothing.
