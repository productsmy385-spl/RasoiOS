---
title: "RASOIOS-ADR-018: Brand v2.1 — Revised Owner Hues, Re-derived at Constant Luminance"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "APPROVED"
version: "1.0"
created: "2026-09-25"
last_updated: "2026-09-25"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-25"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["RASOIOS-ADR-013"]
related_documents: ["../design/design.md", "../implementation/slice-01/design.md", "../../CLAUDE.md"]
related_decisions: ["RASOIOS-ADR-013"]
---

# RASOIOS-ADR-018: Brand v2.1 — Revised Owner Hues, Re-derived at Constant Luminance

- **ID:** RASOIOS-ADR-018
- **Date:** 2026-09-25
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-25, Gopala Krishna (Project Owner), from the design board supplied on 2026-09-25.
- **Relationship:** Supersedes **RASOIOS-ADR-013 §1 (the four brand hues) only**. Everything else in ADR-013 — the
  glass system, header navigation with no desktop sidebar, near-black surfaces, per-tenant theming and the typography
  — stands unchanged.

## Context

ADR-013 recorded four owner-supplied hues on 2026-09-23. On 2026-09-25 the Project Owner supplied a design board
giving four different values and asked for them across the product. Earlier the same day the owner had been asked
about one of these (the accent) in isolation and chose to keep the recorded value; the board, which shows all four
together with their tonal ramps, is the later and more complete instruction and is taken as the decision. [fact:
owner message of 2026-09-25 with the palette board.]

| Role | ADR-013 | ADR-018 | Change |
|---|---|---|---|
| Primary | `#4FE012` | `#41E012` | Slight — same green |
| Secondary | `#201EEB` | `#2015EB` | Imperceptible — same blue |
| Tertiary / danger | `#F80E23` | `#EF0E23` | Slight — same red |
| Neutral accent | `#0CFFC4` | `#0CD9F5` | **Real** — aqua-green to cyan |

## Decision

Adopt the four hues above and **re-derive** the 50–900 tonal ramps from them, rather than hand-tuning new ramps.

Each new step keeps the **exact WCAG relative luminance** of the step it replaces and changes only hue and chroma
(matched in OKLCH, chroma clamped to sRGB gamut). Contrast depends only on relative luminance, so every pair in
design.md §2.3 continues to meet AA *by construction* instead of by re-measurement and re-tuning. Worst observed
luminance drift across all forty steps: 0.00226 absolute. [fact: derivation and measurements run 2026-09-25.]

Consequences of the derivation, all verified:

- `secondary` came back **byte-identical** to the ADR-013 ramp — the two blues round to the same hue.
- `tertiary` moved by a single 8-bit step (`#F80F23` → `#F80F25` at 500).
- `primary` shifted slightly greener (`#40BD06` → `#38BD15` at 400).
- `accent` changed materially (`#0DB98E` → `#00B3CB` at 400), and with it **`success`**, which resolves to the accent
  ramp in both themes. Success fills and success text are now cyan rather than aqua-green. This is accepted: status is
  never carried by colour alone (design.md §7 — every status badge pairs an icon with a text label), so the semantic
  reading does not depend on the hue being green.
- Published contrast evidence moved in the second decimal place (e.g. the console primary button 8.01:1 → 7.97:1, the
  public primary button 4.72:1 → 4.74:1). The lowest pair in the product is 4.74:1, still above the 4.5 AA threshold.

The `PLATFORM` website preset takes the new hues too, measured against the *website* surfaces rather than the
console's: 11.13:1 (primary) and 11.47:1 (accent) on DARK `#0B0B0F`; 4.93:1, 8.43:1 and 6.71:1 on LIGHT `#FBF9F5`.

## Scope

The board also shows a typographic system (Space Grotesk / Inter) and renders its own swatches on light cyan
surfaces. Neither is adopted here: the owner asked for the colours. Typography stays Playfair Display + Plus Jakarta
Sans (ADR-013), and surfaces stay near-black and desaturated so the saturated hues read as accents (ADR-013 §2).
Changing either is a separate decision. **Not yet decided — ask the owner whether the board's light surfaces and
fonts were also intended.**

## Alternatives considered

- **Change `BRAND_HUES` only.** Rejected: the hues are reference inputs that are never painted, so this would have
  changed nothing users can see while making the constant wrong about the ramps beside it.
- **Hand-tune new ramps to the board's swatches.** Rejected: it discards the contrast work behind every published
  pair and would need all fifteen pairs re-measured and several re-tuned. Holding luminance gets the requested hues
  and keeps the guarantees for free.
- **Adopt the board's light surfaces as well.** Deferred, not rejected — see Scope.

## Verification

- `tests/unit/platform-theme.test.ts` (TC-THEME-001) — every text pair ≥ 4.5:1 and the focus ring ≥ 3:1, in both
  themes, read from `app/globals.css`.
- `tests/unit/ui-primitives.test.tsx` (TC-DS-009) — the fifteen published pairs, recomputed against the new ramps.
- `tests/static/design-system.test.ts` (TC-DS-001) — Tailwind matches the tokens; ramps stay monotonic in lightness.
- `tests/integration/website/theme.test.ts` — the `PLATFORM` preset and every other preset still measure AA.
