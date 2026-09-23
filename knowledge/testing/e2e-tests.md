---
title: "End-to-End Tests"
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
related_documents: ["../implementation/slice-01/testing.md","../implementation/slice-01/prd.md"]
related_decisions: []
---

# End-to-End Tests

| Aspect | Approach |
|---|---|
| Tool | Playwright (`npm run test:e2e`), projects: desktop-chromium 1440×900, tablet 1024×768 touch, mobile 390×844 touch |
| Auth | Clerk testing tokens; helper `signInAs(role, tenant)` |
| Data | Seeded test database reset per spec file; printer simulator for printing journeys |
| Journeys | UJ-01…UJ-14 (`../implementation/slice-01/prd.md` §4) in `tests/e2e/journeys` (S1-P25-T003) |
| Accessibility | `@axe-core/playwright` fixture on every visited page |
| Responsive | Viewport matrix suite (TC-DS-005) |
| Smoke | `@smoke` tag for post-deploy checks (TC-QA-006) |
| Stability | Flake rate < 2% over 20 runs; quarantine with 48 h fix SLA; security specs never quarantined |
