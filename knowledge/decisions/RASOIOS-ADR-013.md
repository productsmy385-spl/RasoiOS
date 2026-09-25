---
title: "RASOIOS-ADR-013: Brand v2 — Vibrant Glass Design Language, Header Navigation and Per-Tenant Theming"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "APPROVED"
version: "1.0"
created: "2026-09-23"
last_updated: "2026-09-23"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-23"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["RASOIOS-ADR-012"]
related_documents: ["../design/design.md", "../implementation/slice-01/frontend.md", "../implementation/slice-01/data-model.md", "../../CLAUDE.md"]
related_decisions: ["RASOIOS-ADR-012"]
---

# RASOIOS-ADR-013: Brand v2 — Vibrant Glass Design Language, Header Navigation and Per-Tenant Theming

- **ID:** RASOIOS-ADR-013
- **Date:** 2026-09-23
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-23, Gopala Krishna (Project Owner), from the master implementation brief of 2026-09-23.
- **Relationship:** Supersedes the brand section of `CLAUDE.md` v1 and `design/design.md` §2.1–§2.3 and §6 (amber/emerald
  palette and sidebar console shell, recorded 2026-09-15 and implemented 2026-09-22 in S1-P08-T001/T008/T013).

## Context

The Project Owner supplied a reference design and a written brief on 2026-09-23: vibrant glassmorphism, a colourful
icon system, a header-navigation console with no desktop sidebar, fewer and larger dashboard sections, and — after
handover — restaurants customising their own website's colours, branding and content. The existing design system
(amber `#D97706`, emerald `#10B981`, warm light/dark neutrals, 264 px sidebar shell) was built and verified on
2026-09-22 and is replaced by this decision.

## Decision

### 1. Platform palette v2

Four brand hues, each with a 50–900 tonal scale generated once and stored as tokens; the raw hues are used only as
the 500/600 step, never as page-wide fills:

> **Superseded by RASOIOS-ADR-018 (2026-09-25).** The four hues below were replaced by `#41E012`, `#2015EB`,
> `#EF0E23` and `#0CD9F5`, and the ramps re-derived at constant luminance. The rest of this ADR still stands.

| Role | Hue (superseded) | Use |
|---|---|---|
| Primary | `#4FE012` | primary actions, active navigation, success-leaning accents |
| Secondary | `#201EEB` | secondary actions, informational accents, links |
| Tertiary | `#F80E23` | destructive actions, errors, urgent kitchen states |
| Neutral accent | `#0CFFC4` | highlights, live indicators, data emphasis |

Surfaces stay near-black and desaturated (`--surface`, `--surface-2`, `--surface-3`) so saturated hues read as accents.
Every colour remains a semantic token (`--primary`, `--on-primary`, `--surface`, `--border`, …) defined as RGB channels,
so themes can be swapped at runtime. Text/background pairs must meet WCAG 2.1 AA (4.5:1 body, 3:1 large and UI edges);
where a raw hue fails, the token uses the contrast-checked step of its scale, and the check is a test, not a judgement.

### 2. Glass as a system, not a coating

Three levels — `glass-1` (header, bottom bar), `glass-2` (cards, panels, menus), `glass-3` (modals, overlays) — each a
defined blur, translucency, border and shadow. Glass is used for navigation, metric cards, overlays, menus and
contextual panels; never for long text, tables, or nested inside another glass surface. Every glass surface keeps an
opaque fallback for `prefers-reduced-transparency` and for browsers without `backdrop-filter`.

### 3. Header navigation, no desktop sidebar

Both consoles (restaurant and platform) use one shell: a sticky glass header carrying brand, primary navigation with
icon + label, an overflow "More" menu when items exceed the available width, and notification/profile controls. There
is no persistent desktop sidebar. Below 768 px the header keeps brand and profile, and primary navigation moves to a
glass bottom bar with the role's four most-used destinations plus a central action button and "More". Navigation is
filtered by capability; the server still authorises every page and action (SC-RBAC-08).

### 4. Fewer, larger dashboard sections

The dashboard is a context header, one metric row, one quick-actions block and live operational panels (orders,
kitchen) — not a grid of small cards. Empty states replace metrics when there is no data; no fabricated figures.

### 5. Colourful, consistent icons

Lucide only, one stroke weight, sizes 16/18/20/24/32. Each domain has a fixed hue (dashboard primary, menu amber-tone
of the tertiary scale, orders secondary, kitchen violet-tone, customers pink-tone, reports neutral-accent,
transactions gold-tone, settings neutral) applied through a shared icon-tile component. Icons never carry meaning
alone: status is always icon + label (design.md §7).

### 6. Per-tenant theming

A restaurant owns its public website's appearance and content:

- `RESTAURANT` gains theme and identity columns: `theme_preset`, `theme_primary_hex`, `theme_secondary_hex`,
  `theme_accent_hex`, `theme_surface_mode` (`DARK` | `LIGHT`), `gradient_from_hex`, `gradient_to_hex`, `tagline`,
  `hero_image_url`, `favicon_url`, plus social/contact links (`instagram_url`, `facebook_url`, `whatsapp_e164`,
  `maps_url`).
- A new `WEBSITE_SECTION` entity (tenant-scoped, composite FK to the restaurant) stores which sections are enabled,
  their order and their editable copy (`key`, `enabled`, `sort_order`, `headline`, `body`, `image_url`, `cta_label`,
  `cta_href`). Section keys are a fixed enum — the tenant configures, never injects, layout.
- Colours are validated (`#RRGGBB`), contrast-checked server-side against the chosen surface mode, and rendered as
  CSS custom properties on the public page only. Tenant themes never affect the console, another tenant, or the
  platform brand. Image URLs follow the HTTPS allow-list of Q-009 (no uploads in SLICE-01).
- Editing requires `website:update`; changes are audited (`restaurant.website_updated`, `restaurant.theme_updated`).

### 7. Handover lifecycle

Provisioning (tenant, slug, initial branding, first TENANT_ADMIN invitation) is Super Admin only. After handover the
restaurant's TENANT_ADMIN manages its own restaurant, website, theme, menu, staff, printers and operations, and can
never reach platform routes, another tenant, or tenant creation (ADR-006, security.md §3).

## Consequences

- `tailwind.config.ts`, `app/globals.css`, `lib/ui/tokens.ts`, the icon map, the console shells, the landing page and
  the design-token tests are rebuilt; the design-token baseline fixture is regenerated.
- A migration adds the theme/identity columns and `WEBSITE_SECTION` (pre-release, no data to preserve — Q-017).
- Public pages become theme-aware server components; the console stays on the platform theme.
- Contrast tests cover both the platform theme and any tenant theme saved through the settings UI.

## Alternatives considered

- **Keep amber/emerald and offer the new palette as a tenant theme.** Rejected by the owner: the console itself must
  match the reference design.
- **Free-form CSS for tenants.** Rejected: it is an injection and accessibility risk; tokens plus a fixed section list
  give the same visible result safely.
