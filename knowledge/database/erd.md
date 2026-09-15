---
title: "Entity Relationship Diagram (ERD)"
document_type: "ERD"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "Slice 01"
target_start_date: "2026-09-15"
target_end_date: "2026-09-22"
priority: "CRITICAL"
dependencies: []
related_documents: ["database.md", "data-dictionary.md"]
related_decisions: ["ADR-001"]
---

# Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    Tenant ||--o{ Restaurant : owns
    Tenant ||--o{ UserTenant : membership
    User ||--o{ UserTenant : belongs
    Tenant ||--o{ MenuCategory : contains
    MenuCategory ||--o{ MenuItem : holds
    Tenant ||--o{ DailyMenu : publishes
    Tenant ||--o{ Order : processes
    Order ||--o{ OrderItem : details
    Order ||--o{ KOTTicket : generates
    Order ||--o{ Transaction : logs
    Tenant ||--o{ PrintJob : queues
    Tenant ||--o{ AuditLog : audits
```
