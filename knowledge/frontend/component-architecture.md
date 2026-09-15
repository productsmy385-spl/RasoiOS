---
title: "Component Hierarchy & Reuse Patterns"
document_type: "COMPONENT_ARCH"
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
related_documents: ["frontend.md"]
related_decisions: []
---

# Component Hierarchy & Reuse Patterns

- `components/ui/`: Primitive presentation components (Button, Card, Badge, Dialog, Input, Select, Toast).
- `components/restaurant/`: Domain-specific components (MenuGrid, OrderCard, KOTCard, KitchenBoard, POSCheckout).
- `components/admin/`: Super admin tenant management components.
- `components/layout/`: Header, Sidebar, PortalNavbar, Footer.
