---
title: "ERD (Domain Reference)"
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
related_documents: ["../implementation/slice-01/erd.md"]
related_decisions: ["RASOIOS-ADR-008"]
---

# Entity Relationship Diagram
> **Canonical source:** [`../implementation/slice-01/erd.md`](../implementation/slice-01/erd.md). This domain file keeps only the durable summary for entity relationships. Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


27 entities (plus MEDIA_ASSET if Q-009 approves): TENANT, RESTAURANT, RESTAURANT_HOURS, KITCHEN_SECTION, USER, USER_TENANT, MENU_CATEGORY, MENU_ITEM,
MENU_ITEM_VARIANT, MENU_ITEM_ADDON, DAILY_MENU, DAILY_MENU_ITEM, CUSTOMER, ORDER, ORDER_ITEM, ORDER_ITEM_ADDON, KOT_TICKET, KOT_ITEM, TRANSACTION,
BUSINESS_DAY_CLOSE, PRINTER, PRINT_AGENT, PRINT_JOB, AUDIT_LOG, SOCIAL_POST, TENANT_COUNTER, RATE_LIMIT_BUCKET.
