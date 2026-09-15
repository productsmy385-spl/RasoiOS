---
title: "Responsive Breakpoints & Touch Target Rules"
document_type: "RESPONSIVE_SPEC"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "Slice 02"
target_start_date: "2026-09-23"
target_end_date: "2026-09-30"
priority: "HIGH"
dependencies: []
related_documents: ["design.md"]
related_decisions: []
---

# Responsive Breakpoints & Touch Target Rules

- **Mobile Viewport (`< 640px`)**: Single-column layout for public menu, waiter ordering, and mobile cashier view. Touch targets minimum `44px × 44px`.
- **Tablet Viewport (`640px - 1024px`)**: Dual-column grid for Kitchen Display System (KDS) and POS cashier order entry.
- **Desktop Viewport (`> 1024px`)**: Multi-column dashboard layout with persistent sidebar navigation and high-density data tables.
