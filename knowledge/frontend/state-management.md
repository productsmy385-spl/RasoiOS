---
title: "State Management"
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
related_documents: ["../implementation/slice-01/frontend.md","../decisions/RASOIOS-ADR-009.md"]
related_decisions: ["RASOIOS-ADR-009"]
---

# State Management

| State kind | Approach |
|---|---|
| Server data (initial) | Server Components call guarded loaders (`LD-*`) |
| Mutations | Server Actions (`SA-*`) with React 19 `useActionState`; shared Zod schemas; `ActionResult` responses |
| Live boards (orders, kitchen, printing, dashboard) | `usePolling` against GET route handlers with `since` cursor, visibility pause, stale banner (ADR-009) |
| Form state | Local component state; unsaved-changes guard on long forms |
| URL state | Filters, tabs and pagination in search params (`FilterBar`) |
| Idempotency | `useIdempotencyKey` per submit attempt for orders and payments |
| Persistent client storage | Allowed only for: kitchen section filter, table density, unsent order draft (cleared on submit). **Never** tenant ids, roles, tokens or customer data (FE-08). |
| Capabilities | From session context (`LD-AUTH-01`); used only to shape UI |
