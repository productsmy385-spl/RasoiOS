---
title: "Project Risk Register & Mitigation Matrix"
document_type: "RISKS"
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
related_documents: ["open-questions.md"]
related_decisions: ["ADR-003", "ADR-004"]
---

# Project Risk Register & Mitigation Matrix

| R-ID | Risk Description | Prob | Impact | Severity | Mitigation Strategy | Owner | Status |
|---|---|:---:|:---:|:---:|---|---|:---:|
| **R-001** | Cross-tenant data leakage due to client IDOR request manipulation. | Low | High | **CRITICAL** | Mandate server-side context resolution (`resolveTenantContext`). Never trust client `tenantId`. | Technical Lead | **MITIGATED** |
| **R-002** | Local print agent offline during peak kitchen hours. | Med | High | **HIGH** | Queue print jobs in PostgreSQL with automatic retry status and KDS visual fallback. | Technical Lead | **MANAGED** |
| **R-003** | Rounding errors in monetary calculations. | Low | High | **HIGH** | Enforce PostgreSQL `Decimal` / `NUMERIC(12,2)` persistence across all tables. | Technical Lead | **MITIGATED** |
