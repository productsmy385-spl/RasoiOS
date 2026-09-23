---
title: "UX Principles"
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
related_documents: ["../implementation/slice-01/design.md","../implementation/slice-01/frontend.md"]
related_decisions: []
---

# UX Principles

1. **Speed where service happens.** POS and kitchen actions are one tap at touch size, with no confirmation dialogs for high-frequency actions. Destructive or financial actions confirm (v1.0 principle retained).
2. **Truthful states.** Every major screen designs loading, empty, error, unauthorized, forbidden, not-found, success and disabled states (v1.0 listed 9 states; the canonical list is in frontend.md §4). Nothing claims success before the server confirms it.
3. **High-contrast kitchen.** Large ticket numbers, quantity-first item lines, priority and overdue shown with icon plus text, readable at about 1.5 m (v1.0 retained; design.md §11).
4. **Restaurant-local time everywhere** (design.md, architecture §7).
5. **Actionable empty states** that say what to do next ("Add your first menu item").
6. **Feedback for every action:** Save → Saving… → Saved; toasts via live regions.
7. **Consistency over novelty:** one component per purpose across all screens.
