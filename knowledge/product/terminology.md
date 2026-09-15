---
title: "Domain Terminology & Glossary"
document_type: "GLOSSARY"
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
priority: "MEDIUM"
dependencies: []
related_documents: ["prd.md"]
related_decisions: []
---

# Domain Terminology & Glossary

- **Tenant**: Root logical isolation entity representing a restaurant business organization.
- **KOT**: Kitchen Order Ticket. A physical slip or digital card detailing ordered dishes, quantities, table number, and special prep instructions.
- **KDS**: Kitchen Display System. Digital interface for kitchen staff displaying real-time KOT tickets.
- **Print Agent**: A lightweight local software daemon running on restaurant hardware polling cloud print jobs to print to local USB/LAN ESC/POS thermal printers.
- **UserTenant**: Join record mapping a `User` to a `Tenant` with an assigned `Role`. Technical authorization link, NOT a SaaS subscription plan.
- **Daily Menu**: A date-specific curated subset of menu items published for public or daily ordering.
