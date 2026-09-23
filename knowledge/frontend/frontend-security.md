---
title: "Frontend Security"
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
related_documents: ["../implementation/slice-01/security.md","../implementation/slice-01/frontend.md"]
related_decisions: ["RASOIOS-ADR-006"]
---

# Frontend Security
> **Canonical source:** controls in [`security.md` §5](../implementation/slice-01/security.md).

- **Hiding a control is not authorization.** Every action is re-checked on the server (SC-RBAC-08; E2E TC-RBAC-013). This v1.0 rule is retained.
- **No `dangerouslySetInnerHTML`** (lint-enforced), except the escaped JSON-LD serializer (SC-VAL-03).
- **Public routes render explicit public projections only** (SC-PUB-01…03). This v1.0 rule is retained and now tested (TC-WEB-005).
- **No tenant identifiers, prices or totals are sent as authority** from the client. Order totals shown before submit are labelled "Estimate" (FE-05, ADR-010).
- **No sensitive data in localStorage/sessionStorage** (FE-08). The service worker never caches authenticated responses (SC-TEN-09).
- **CSP with nonces; fonts self-hosted** (SC-HDR-02).
