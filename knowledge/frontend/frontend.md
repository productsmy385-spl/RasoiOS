---
title: "Frontend (Domain Reference)"
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
related_decisions: ["RASOIOS-ADR-009"]
---

# Frontend
> **Canonical source:** [`../implementation/slice-01/frontend.md`](../implementation/slice-01/frontend.md). This domain file keeps only the durable summary for frontend architecture. Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


Principles FE-01…FE-09 (canonical §1): Server Components by default; UI checks are UX only; no fake data; all states designed; money from decimal strings;
restaurant-timezone display; no new UI framework without an ADR; no tenant identity in client storage; polling per ADR-009.
