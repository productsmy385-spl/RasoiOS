---
title: "Design System (Domain Reference)"
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
related_documents: ["../implementation/slice-01/design.md","../implementation/slice-01/frontend.md"]
related_decisions: []
---

# Design System
> **Canonical source:** [`../implementation/slice-01/design.md`](../implementation/slice-01/design.md). This domain file keeps only the durable summary for tokens (§2–§4), icons (§5), status system (§7), components (§8). Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


One of each: typography, icon, spacing (4 px scale), radius, button (primary/secondary/ghost/destructive/success), form, card, status (icon + label),
colour and motion systems. Static tests enforce no arbitrary spacing, colours or radii (TC-DS-002).
