---
title: "RASOIOS-ADR-002: Commercial License Model vs SaaS Subscription Tiers"
document_type: "ADR"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "ALL"
target_start_date: "2026-09-15"
target_end_date: "2026-11-22"
priority: "CRITICAL"
dependencies: []
related_documents: ["../product/product-thesis.md"]
related_decisions: []
---

# RASOIOS-ADR-002: Commercial License Model vs SaaS Subscription Tiers

## Context
Standard SaaS applications often introduce multi-tiered recurring subscription pricing (Starter, Pro, Enterprise) and commercial feature gating.

## Decision
The platform is sold strictly as a software product/license. **NO subscription tiers, recurring monthly SaaS tenant billing, or commercial feature gating** will be implemented. `UserTenant` represents pure technical authorization context rather than subscription billing state.

## Consequences
- Eliminates subscription billing integration overhead in core product code.
- Prevents accidental feature lockout for licensed users.
