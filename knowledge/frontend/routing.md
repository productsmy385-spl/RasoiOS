---
title: "Routing (Domain Reference)"
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
related_documents: ["../implementation/slice-01/frontend.md","../implementation/slice-01/security.md"]
related_decisions: []
---

# Routing
> **Canonical source:** [`../implementation/slice-01/frontend.md`](../implementation/slice-01/frontend.md). This domain file keeps only the durable summary for routes (§2, §5) and permissions (security.md §3.3). Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


| Area | Routes |
|---|---|
| Public | `/`, `/r/[slug]`, `/r/[slug]/daily`, `/sign-in`, `/sign-up` (invitation only), `/offline` |

Public restaurant pages are served from the tenant host `{slug}.<PUBLIC_ROOT_DOMAIN>` (`{slug}.localhost:3000` in development), with `/r/[slug]` kept on the apex host as a fallback that links canonically to the subdomain. Console, platform and auth routes live only on the apex host (RASOIOS-ADR-012).
| Account | `/account/no-access`, `/account/select-tenant`, `/account/suspended` |
| Super Admin | `/admin`, `/admin/tenants`, `/admin/tenants/new`, `/admin/tenants/[tenantId]`, `/admin/audit` |
| Tenant console | `/restaurant`, `/restaurant/dashboard`, `/restaurant/menu`, `/restaurant/menu/categories`, `/restaurant/menu/items`, `/restaurant/menu/items/new`, `/restaurant/menu/items/[itemId]`, `/restaurant/daily-menu`, `/restaurant/orders`, `/restaurant/orders/new`, `/restaurant/orders/[orderId]`, `/restaurant/orders/[orderId]/receipt`, `/restaurant/kitchen`, `/restaurant/transactions`, `/restaurant/transactions/day-close`, `/restaurant/customers`, `/restaurant/customers/[customerId]`, `/restaurant/reports`, `/restaurant/social`, `/restaurant/website`, `/restaurant/staff`, `/restaurant/settings`, `/restaurant/printing`, `/restaurant/audit` |

Legacy routes `/restaurant/kds`, `/restaurant/analytics`, `/restaurant/billing` redirect to kitchen, reports and transactions. The v1.0 matrix entry `/restaurant/dashboard` for "TENANT_ADMIN, MANAGER" is retained as permission `dashboard:read`.
