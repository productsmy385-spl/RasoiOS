---
title: "Accessibility"
document_type: "CHECKLIST"
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
related_documents: ["../implementation/slice-01/design.md","../implementation/slice-01/testing.md"]
related_decisions: []
---

# Accessibility — WCAG 2.1 AA

Automated: axe via Playwright on every route, zero serious/critical (TC-DS-004, TC-QA-010). Manual checklist (S1-P08-T010, S1-P25-T004):

| # | Check |
|---|---|
| A-01 | Semantic landmarks (header, nav, main, footer); one h1 per page; logical heading order |
| A-02 | Skip link to main content in every shell |
| A-03 | Full keyboard operation; visible focus ring (2 px + 2 px offset); no keyboard traps except modal dialogs with Esc |
| A-04 | Every input has a visible label; errors linked via `aria-describedby`; error summary receives focus |
| A-05 | Dialogs use native `<dialog>` with title and description, focus returned on close |
| A-06 | Contrast meets design.md §2.3; interactive boundaries ≥ 3:1 |
| A-07 | Status never conveyed by colour alone (icon + label) |
| A-08 | Live regions: toasts `role="status"`, errors `role="alert"`, new orders announced politely; clock not announced |
| A-09 | Images have alt text (item name); decorative icons `aria-hidden` |
| A-10 | `prefers-reduced-motion` removes animation (TC-DS-006) |
| A-11 | Reorderable lists operable with Move up/down buttons and announcements |
| A-12 | Screen reader spot checks: NVDA + Chrome, VoiceOver + Safari on sign-in, POS, kitchen, order detail, public site |
| A-13 | Charts have equivalent data tables |
| A-14 | Zoom to 200% without loss of content or horizontal page scroll |
