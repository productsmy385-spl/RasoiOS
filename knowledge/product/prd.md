---
title: "Product Requirements (Domain Reference)"
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
related_decisions: ["RASOIOS-ADR-002","RASOIOS-ADR-005"]
---

# Product Requirements
> **Canonical source:** [`../implementation/slice-01/prd.md`](../implementation/slice-01/prd.md). This domain file keeps only the durable summary for product requirements. Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


## Durable product commitments

- The product is a multi-tenant restaurant management platform, **sold as a software product/licence**. There are no subscription plans, tiers or recurring tenant billing (ADR-002).
- Each tenant gets an isolated restaurant environment: website, dashboard, staff and roles, menu and daily menu, orders, customers, KOT and kitchen, printing, transactions, reports, social menu, audit and PWA.
- Tenant A must never access Tenant B's private data.
- Money is exact (Decimal/NUMERIC) and order history is snapshotted.
- Nothing in the product shows a state that is not true (no fake printing, publishing, payments or health indicators).

## Requirement ID scheme

`REQ-<AREA>-NNN` with areas PLAT, TENANT, AUTH, RBAC, ADMIN, REST, DASH, WEB, DS, MENU, DMENU, ORDER, CUST, KOT, KITCH, PRINT, AGENT, TXN, RPT, SOC, PWA, TZ, AUDIT, SEC, NFR, OBS, OPS, TEST, FOUND.
v1.0 IDs `PR-001…PR-020` are superseded by these IDs. The sources are cited per requirement in the canonical PRD.
