---
title: "Incident Response"
document_type: "RUNBOOK"
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
related_documents: ["../implementation/slice-01/deployment.md","../implementation/slice-01/threat-model.md"]
related_decisions: []
---

# Incident Response

Status: initial runbooks. These are completed and exercised in S1-P28-T005.

| Incident | Immediate actions | Follow-up |
|---|---|---|
| **Suspected cross-tenant data exposure** | 1) Suspend affected tenant(s) via `/admin/tenants/[tenantId]` (v1.0 action retained). 2) Preserve logs (export relevant `request_id`s). 3) Disable the affected route by hotfix if identified. 4) Notify the Project Owner. | Root cause, fix with TI/ADV regression test, notify affected restaurants per legal advice (Q-020), record in KB known issues |
| **Secret compromise** (Clerk key, webhook secret, DB password, agent token) | Rotate immediately per `../implementation/slice-01/deployment.md` §10 (v1.0 rotation rule retained); revoke agents if tokens leaked | Review access logs; audit how the leak happened |
| **Authentication outage (Clerk)** | Confirm via Clerk status; post notice to restaurants; do not add bypasses | Review fail-closed messaging |
| **Database outage / corruption** | Check `/api/ready`; Railway database status; if corruption, suspend writes (maintenance mode) and follow restore procedure | Restore drill lessons |
| **Printing outage at a restaurant** | Kitchen board remains the source of truth; check agent online status and printer health in `/restaurant/printing`; retry failed jobs after reconnect | Physical troubleshooting guide in `operations/print-agent.md` |
| **Bad deploy** | Railway rollback to previous deployment; verify smoke suite | Postmortem; regression test |
