---
title: "Business Rules (Domain Reference)"
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
related_documents: ["../implementation/slice-01/prd.md"]
related_decisions: ["RASOIOS-ADR-010"]
---

# Business Rules
> **Canonical source:** [`../implementation/slice-01/prd.md`](../implementation/slice-01/prd.md). This domain file keeps only the durable summary for business rules (§7, IDs BR-*). Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


## Rules that must never be broken

1. Money is `NUMERIC`/Decimal and always calculated on the server (BR-MONEY-01…04).
2. Order items snapshot names, prices, tax rates and add-ons at order time (BR-ORD-08).
3. Tenant context comes only from the server; USER_TENANT is authorization, not a subscription (BR-TEN-01).
4. Only an agent acknowledgement marks a print job PRINTED (BR-PRINT-01).
5. Audit records are never updated or deleted (BR-AUD-01).
6. No "published" social state exists without a real integration (BR-SOC-03).

v1.0 rule IDs (`BR-MONEY-01`, `BR-MONEY-02`, `BR-ORD-01`) are superseded by the numbered set in the canonical PRD. The v1.0 cancellation rule
(NEW/ACCEPTED only) was widened by Q-008 (answered B on 2026-09-22): TENANT_ADMIN and MANAGER may also cancel PREPARING/READY orders with a reason (BR-ORD-05).
