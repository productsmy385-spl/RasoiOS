---
title: "Knowledge Base — Project Identity and Master Specification"
document_type: "MASTER_SPEC"
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
related_documents: ["README.md", "decisions.md", "implementation/slice-01/README.md", "implementation/slice-01/baseline-audit.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-002", "RASOIOS-ADR-003", "RASOIOS-ADR-004", "RASOIOS-ADR-005"]
---

# Restaurant SaaS Platform — Master Specification

## 1. Identity

| Item | Value |
|---|---|
| Project | Restaurant SaaS Platform (codename RASOIOS) |
| Category | Multi-tenant restaurant management platform |
| Project Owner | Gopala Krishna |
| Repository | `github.com/productsmy385-spl/RasoiOS` [fact: `git remote -v`] |
| Implementation plan | **SLICE-01 — Complete Restaurant SaaS Platform** (single slice, 29 phases) — `implementation/slice-01/` |
| Current state (2026-09-15) | Baseline code exists at commit `18941a9` but does **not** meet SLICE-01 acceptance criteria (see `implementation/slice-01/baseline-audit.md`). All tasks PLANNED. |
| Task tracking | `implementation/slice-01/tasks.md`; not connected to Linear |

## 2. Commercial model (locked — RASOIOS-ADR-002)

- Sold to restaurant tenants as a **software product/licence**.
- **No** Starter/Professional/Business/Enterprise plans, membership tiers, monthly or annual subscriptions, recurring tenant billing or plan-based feature gating.
- Possible commercial services such as a one-time licence, setup, customisation, additional outlet deployment, hardware, support and maintenance are handled outside the software. They are **not** SaaS membership plans.
- **USER_TENANT is a technical authorization relationship** (a person's role in a tenant). It is never a commercial subscription.

## 3. Technology stack (RASOIOS-ADR-001)

| Concern | Choice |
|---|---|
| Framework | Next.js App Router (Server Components, Server Actions, Route Handlers), TypeScript strict |
| Authentication | Clerk, Email OTP only, invite-only (ADR-006) |
| Database / ORM | PostgreSQL, Prisma |
| Styling | Tailwind CSS + CSS variables; Lucide icons |
| Testing | Vitest (unit, static, integration on real PostgreSQL), Playwright (E2E, accessibility, responsive) |
| Deployment | Railway |
| Printing | PostgreSQL print queue + local print agent → USB/LAN ESC/POS printers (ADR-004, ADR-007) |
| PWA | Web app manifest + service worker (no offline order taking) |

Brand tokens: Primary `#D97706` · Secondary `#FBF9F5` · Tertiary `#10B981` · Neutral `#1A1715` · Display font Playfair Display · UI font Plus Jakarta Sans.

## 4. Multi-tenancy (highest priority)

1. Every tenant-owned record has `tenant_id`, and child records reference parents with composite keys, so cross-tenant references cannot exist (ADR-008).
2. Tenant context is resolved **only on the server**, from the authenticated Clerk identity → local USER → ACTIVE USER_TENANT → ACTIVE TENANT (ADR-003, ADR-006).
3. Tenant identifiers in URLs, bodies, query strings, headers or client state are never trusted.
4. Other tenants' resources are indistinguishable from missing resources (404).
5. Print agents, reports, caches, files, exports and public pages follow the same boundary (`implementation/slice-01/tenant-isolation.md`).

## 5. Implementation structure

```
Restaurant SaaS Platform
└── SLICE-01 — Complete Restaurant SaaS Platform
    ├── P01 Project Foundation          ├── P16 Print Queue
    ├── P02 Database Foundation         ├── P17 Local Print Agent
    ├── P03 Authentication              ├── P18 Transactions
    ├── P04 Multi-Tenant Authorization  ├── P19 Reports
    ├── P05 RBAC                        ├── P20 Social Menu + Sharing
    ├── P06 Super Admin                 ├── P21 PWA
    ├── P07 Restaurant Management       ├── P22 Timezone + Live Clock
    ├── P08 Design System + Frontend    ├── P23 Audit Logging
    ├── P09 Public Restaurant Website   ├── P24 Security Hardening
    ├── P10 Menu Management             ├── P25 Testing + QA
    ├── P11 Daily Menu                  ├── P26 Observability
    ├── P12 Orders                      ├── P27 Railway Deployment
    ├── P13 Customers                   ├── P28 Production Readiness
    ├── P14 KOT                         └── P29 Final Release
    └── P15 Kitchen Management
```

Tasks are identified `S1-Pxx-Tnnn` and executed in the order given in `implementation/slice-01/tasks.md`.

## 6. Superseded content

Knowledge Base v1.0 (also dated 2026-09-15) described eight slices, with Slice 01 IMPLEMENTED and Slices 02–08 variously PLANNED or IMPLEMENTED, on a
2026-09-15 → 2026-11-22 timeline. The baseline audit did not substantiate those statuses. That structure is superseded by RASOIOS-ADR-005.
