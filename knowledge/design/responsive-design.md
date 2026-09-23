---
title: "Responsive Design (Domain Reference)"
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
related_documents: ["../implementation/slice-01/design.md"]
related_decisions: []
---

# Responsive Design
> **Canonical source:** [`../implementation/slice-01/design.md`](../implementation/slice-01/design.md). This domain file keeps only the durable summary for breakpoints and layouts (§4.2, §6). Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


Breakpoints: base < 640 · sm ≥ 640 · md ≥ 768 · lg ≥ 1024 · xl ≥ 1280. Test viewports: 360, 390, 768, 1024, 1280, 1440.
Touch targets ≥ 44 px on mobile (v1.0 retained) and ≥ 48 px in kitchen/POS. Tables become cards below 768 px. The page body never scrolls horizontally.
