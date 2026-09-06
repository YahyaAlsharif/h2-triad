# H₂-TRIAD visual system · V0.1

## Direction

A white, editorial engineering workspace: spacious, precise, readable, and transparent about evidence. Blue organizes technical information; vermillion draws attention to the interface hypothesis and selected actions. This is a project identity inspired by two verified palettes, not an official joint brand or endorsement.

## Verified brand colors

Verified on 6 September 2026; values were extracted from source, not sampled from images.

| Token | Hex | First-party provenance |
| --- | --- | --- |
| OnKith vermillion | `#FF5A36` | [Live OnKith CSS](https://onkith.online/_next/static/css/1b0b322d8211eb33.css), `:root { --brand-vermillion: #ff5a36; }`. Independently corroborated by `fill="#ff5a36"` in the [official favicon SVG](https://onkith.online/onkith-favicon.svg). The home page declares https://onkith.online as its canonical URL. |
| KAUST deep blue | `#003B75` | [KAUST Brand Style Guide](https://ipomedia.kaust.edu.sa/toolkit/KAUST/KAUST_Brand_Style_Guide.pdf), **Digital Color Palettes → Color Families → Blues → Saturated Shades**, RGB 0, 59, 117; HEX 003B75. Verified in the search-indexed text of this first-party PDF. Direct retrieval currently returns “Not Found”; this is a documented canonical palette value, not a claim about the newest brand revision. |
| OnKith light-theme accent ink | `#B33412` | Same live CSS, `:root[data-theme=light] { --lift: #b33412; }`. Used for small accent text and outlined selected states on white. |

## Small working palette

| Role | Value | Use |
| --- | --- | --- |
| White | `#FFFFFF` | Dominant page and card background |
| Technical wash | `#F5F8FB` | Diagram fields, secondary surfaces |
| Vermillion wash | `#FFF1EC` | Hypothesis panels |
| Primary ink | `#171C22` | Titles, prose, vermillion-button text |
| Secondary ink | `#566373` | Notes, units, captions |
| Divider | `#DBE2E9` | Decorative separators and card outlines |
| Control border | `#7B8998` | Input boundaries |
| Evidence ink / wash | `#23634E` / `#EDF6F1` | Published evidence labels |
| Caution ink / wash | `#795400` / `#FFF6DE` | Missing evidence and untested conditions |

## Type, space, and surfaces

- Use local `Segoe UI`, system UI, and sans-serif fallbacks. No font downloads. Technical values use `Consolas`, `SFMono-Regular`, or monospace with tabular numerals. Headings have compact leading and modest negative tracking; body text is 15–16 px with 1.55 leading. Secondary labels remain at least 12 px.
- Use a 4 px spacing base: 8, 12, 16, 24, 32, 48, 64. Give sections more space than cards, and cards more space than individual fields. Desktop content stops at 1320 px.
- Cards have 12 px corners, controls 8 px; badges may be rounded pills. Avoid rounding every object into a capsule.
- Cards use a restrained 1 px divider and, selectively, `0 5px 20px rgba(0,59,117,.035)`. No glow, glass, or decorative gradients.

## Charts and diagrams

- Use inline SVG with viewBox sizing, readable labels, and an accompanying text equivalent. Diagrams are conceptual and explicitly marked not to scale.
- Capacity chart: blue calculated curve, vermillion current marker, dashed target with a text label. Always show units and the dilution-only assumption. Never imply the target has been experimentally reached.
- Architecture: blue Fe–Ni circles, vermillion outlined CaF₂ squares, subdued N-C scaffold. Shape and labels supplement color. Particle counts do not encode composition.
- Cartridge: clean cross-section, numbered legend, blue H₂ flow, vermillion heat flow. Arrows reverse with operating mode. No fake CFD contours or sensor readings.
- Use simple line symbols and typographic indices; no external icon package.

## Meaning and color

- Vermillion: 4S hypothesis, main action, current calculation marker, selected critical controls. Use `#B33412` for normal-sized accent text on white. The exact brand vermillion remains the fill/graphic accent.
- Blue: navigation, headings, technical hierarchy, calculated results, secondary actions, H₂ paths.
- Explicit badges: PUBLISHED = reported in another system; CALCULATED = formula with assumptions; PREDICTED = reserved for future calibrated output; HYPOTHESIS = untested proposition; TARGET = screening goal. MODEL PREVIEW is an empty model state, never an experimental result.
- Evidence strength applies to the named literature category, not to the exact H₂-TRIAD material. Unknowns do not get numerical confidence scores.

## Responsive and accessible behavior

- Start with one column. Expand navigation and paired diagrams at 600 px; use the configuration/workspace split at 1000 px. Cards stack at phone widths. No fixed-width tables or horizontally scrolling navigation.
- Controls have at least 44 px touch height and visible labels; range inputs work by keyboard. Inputs expose units and bounds. Segmented buttons expose pressed state. Focus uses a 3 px blue outline with white offset.
- Normal text must meet 4.5:1 contrast; large text and essential graphical/control boundaries must meet 3:1. `#FF5A36` is not suitable for small white text (~3.1:1), so use near-black text on vermillion (~5.6:1). Blue on white is ~11:1; light-theme accent ink on white is ~6.2:1. Pale dividers are decorative, not the sole control affordance.
- Do not rely on color alone. Include names, units, shape, and explicit status text. Support reduced motion; no flashing, pulsing, or autoplay simulation. Use native details disclosures for contextual help.
- All runtime assets, styles, data, and code are embedded in the HTML. External citations are optional links; opening them is the only action requiring internet access.

## Scientific presentation contract

The root research report is the primary scientific source. V0.1 performs dilution capacity and reaction-heat bookkeeping only. Defaults are illustrative configuration inputs, not a synthesis recommendation. No model-derived performance numbers or confidence intervals exist yet. The cartridge is conceptual; system capacity excludes vessel and balance-of-plant mass. Future literature ingestion, grouped model evaluation, uncertainty calibration, experimental results, and sensor integration must retain result-level provenance.
