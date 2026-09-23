---
title: "Data Dictionary (Domain Reference)"
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
related_documents: ["../implementation/slice-01/data-model.md"]
related_decisions: ["RASOIOS-ADR-010"]
---

# Data Dictionary
> **Canonical source:** [`../implementation/slice-01/data-model.md`](../implementation/slice-01/data-model.md). This domain file keeps only the durable summary for field-level definitions. Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


The v1.0 field names `totalAmount` and `priceSnapshot` are replaced by `total_amount` (with subtotal/tax/discount columns) and `unit_price_snapshot` (with line amounts)
in the v2 model. Layer naming: `tenant_id` (column) = `tenantId` (TypeScript), per data-model §1.1.
