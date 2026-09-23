---
title: "Integration Tests"
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
