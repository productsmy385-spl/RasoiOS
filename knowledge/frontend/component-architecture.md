---
title: "Component Architecture (Domain Reference)"
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
related_documents: ["../implementation/slice-01/frontend.md","../implementation/slice-01/design.md"]
related_decisions: []
---

# Component Architecture
> **Canonical source:** [`../implementation/slice-01/frontend.md`](../implementation/slice-01/frontend.md). This domain file keeps only the durable summary for component inventory (§6). Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


Locations: `components/ui` (primitives, no data access) · `components/layout` (shells) · `components/states` (loading/empty/error/forbidden/not-found) ·
`components/domain/<area>` (feature components) · `lib/ui` (hooks and formatters). Components never import server-only modules.
