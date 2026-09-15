---
title: "Data Dictionary & Field Specifications"
document_type: "DATA_DICTIONARY"
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
priority: "HIGH"
dependencies: []
related_documents: ["database.md"]
related_decisions: []
---

# Data Dictionary & Field Specifications

| Entity | Field | Type | Nullable | Description | Security / Validation |
|---|---|---|:---:|---|---|
| `Tenant` | `id` | String (UUID) | No | Unique tenant identifier | Primary Key |
| `Tenant` | `timezone` | String | No | IANA timezone (e.g. `Asia/Kolkata`) | Display conversion |
| `MenuItem` | `price` | Decimal(12,2) | No | Price in tenant currency | NUMERIC Decimal strict |
| `Order` | `totalAmount` | Decimal(12,2) | No | Calculated order total | Calculated server-side |
| `OrderItem` | `priceSnapshot` | Decimal(12,2) | No | Snapshot of item price at order time | Immutable historical record |
