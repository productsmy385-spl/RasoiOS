---
title: "Scope, Non-Goals and Future Scope"
document_type: "SCOPE"
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
related_documents: ["../implementation/slice-01/prd.md","../implementation/slice-01/open-questions.md"]
related_decisions: ["RASOIOS-ADR-002","RASOIOS-ADR-005"]
---

# Scope

## In scope (SLICE-01)
Everything in the canonical PRD (`../implementation/slice-01/prd.md`) with MUST or SHOULD priority. Summary:
- multi-tenancy and server-side isolation
- Clerk Email OTP, invite-only access
- RBAC for six roles
- Super Admin console
- restaurant, staff and website settings
- design system and public website
- menu, variants, add-ons and daily menu
- staff order entry and order lifecycle
- customers
- KOT and kitchen board
- cloud print queue and local print agent
- payment ledger, refunds, voids and day close
- reports and dashboard
- menu cards and honest social sharing
- PWA
- restaurant timezone and live clock
- audit logging, security hardening, testing, observability, Railway deployment and release

## Explicit non-goals
| Non-goal | Basis |
|---|---|
| SaaS subscription plans, tiers, recurring tenant billing, plan-based feature gating | ADR-002, brief §4 |
| Native mobile applications | brief §57 |
| AI features | brief §57 |
| ERP, inventory, purchasing, advanced accounting | brief §57 |
| Microservices or extra runtime infrastructure (Redis, brokers, WebSocket servers) | brief §57, ADR-001, ADR-009, ADR-011 |
| Delivery driver GPS / logistics | KB v1.0 scope |
| Unrelated third-party integrations | brief §57 |

## Decision-gated (COULD — only if approved)
Public online ordering (Q-001) · adding items to open orders (Q-003) · discounts (Q-006) · image uploads (Q-009) · social publishing APIs (Q-012) · report exports (Q-014).

## Future Scope (recorded, not planned)
| Item | Origin |
|---|---|
| Multiple outlets per tenant | Q-002 |
| Subdomain / custom-domain public sites | Q-013 |
| Payment gateway (UPI/card links) | Q-015 |
| SUPER_ADMIN support sessions into tenant data | Q-019 |
| Offline order capture and sync | Q-027 |
| Additional UI languages | Q-028 |
| PostgreSQL row-level security as defence in depth | ADR-008 |
| Server-Sent Events push for boards | ADR-009 |
| Add-on groups with min/max rules; order line removal | ADR-010, Q-003 |
| Late-night business-day cut-over | ADR-010 §5 |
| Print agent auto-update | architecture.md §6.5 |
| Light console theme | design.md §1 |
| Table / floor plan management, loyalty programmes | not requested |
| Allergen tagging beyond veg/non-veg/egg | Q-022 |
