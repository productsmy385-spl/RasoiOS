---
title: "Project Scope & Out-Of-Scope Boundaries"
document_type: "SCOPE"
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
priority: "HIGH"
dependencies: []
related_documents: ["prd.md"]
related_decisions: ["ADR-002"]
---

# Project Scope & Out-Of-Scope Boundaries

## 1. In Scope
- Multi-tenant database isolation & server-side authorization.
- Public tenant restaurant website (`/r/[slug]`) and digital menu.
- Complete menu management (categories, items, variants, daily menus).
- Real-time order engine (state machine, snapshots, totals).
- Kitchen Order Ticket (KOT) workflow & KDS interface.
- ESC/POS thermal cloud print job queue & print agent polling integration.
- POS payment records (Cash, Card, UPI) and daily sales reporting.
- Social menu post preparation.
- PWA installability & IANA tenant timezone handling.

## 2. Explicitly Out of Scope
- **NO SaaS subscription billing tiers** (Starter, Pro, Enterprise).
- **NO monthly recurring tenant credit card billing integrations** (e.g. Stripe Subscriptions).
- Third-party delivery driver GPS mapping engines.
