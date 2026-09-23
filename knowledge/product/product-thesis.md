---
title: "Product Thesis"
document_type: "PRODUCT_THESIS"
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
related_documents: ["../implementation/slice-01/prd.md","scope.md"]
related_decisions: ["RASOIOS-ADR-002"]
---

# Product Thesis

## Problem
Restaurant operators juggle separate tools: website builders for the menu, paper or ad-hoc kitchen tickets, standalone receipt printers, and
spreadsheets for daily sales. Cloud software cannot print directly to a USB/LAN thermal printer behind a restaurant router without a local component.
Many restaurant platforms also gate operational features behind subscription tiers (KB v1.0 thesis, retained).

## Thesis
A single multi-tenant restaurant operating system, sold as a software product/licence, covers the operational loop:
**public menu → order entry → kitchen ticket (screen + thermal print) → payment → reconciliation → reports**. It gives restaurants complete
control without tier friction, provided tenant isolation and money correctness are uncompromising.

## Core operating loop

```
Staff (or diner, if Q-001 approves) ──► Order (server-priced, snapshotted)
                                          │ accepted
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                 Kitchen board (≤5 s)            Cloud print queue ──► Local agent ──► Thermal printer
                          │ ready
                          ▼
                 Served → Payment ledger → Day close → Reports
```

## Commercial model (locked)
Licence sale plus optional commercial services (setup, customisation, additional outlet deployment, hardware, support, maintenance). These services
are **not** SaaS membership plans and are **not** modelled in the software (ADR-002). USER_TENANT is an authorization relationship only.

## Measures of success (proposed, for the Project Owner to confirm)
- First restaurant runs full service (orders, kitchen, printing, payments, day close) on the platform (M14).
- Zero cross-tenant data incidents (release gate G04 and ongoing monitoring).
- Day close variance explained for 100% of days (reconciliation adoption).
