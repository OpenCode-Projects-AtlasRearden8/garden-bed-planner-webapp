# STATUS — Garden Bed Planner

Last updated: 2026-11-06

## What was built

A complete offline single-file garden planning web app in `index.html` (pure
HTML/CSS/JS, zero dependencies, runs from `file://`):

- **Beds & Rows**: beds defined by name/length/width; crop rows with plant
  spacing and row spacing in inches; live math for plants per row, rows per
  bed, and total plants (centered layout, half-spacing edge setback). Per-bed
  succession notes.
- **Planting Schedule**: USDA zones 3–10, planning year picker; typical
  average last-spring-frost and first-fall-frost dates per zone; computed
  start-indoors and set-out (transplant/direct-sow) dates for 20 common
  crops, with "today / Nd ago / in Nd" badges.
- **Season Log**: dated entries (seed started / transplanted / harvested /
  note / wrap-up), optional bed association, newest first, delete.
- **Save & Data**: JSON backup export/import, erase-all, save status.
- Persistence in browser localStorage under key `garden-bed-planner-v1`;
  tolerant `migrate()` validates all imported/shared data (clamping,
  whitelist crop ids, length caps, type-checked fields).
- Seed catalog of 20 crops with sensible default spacings, indoor-start
  weeks, and frost-date offsets.

Supporting files: `tests/test.mjs` (28 tests, plain Node, no deps),
`README.md` (credits Asdale Dynamics, LLC), `LICENSE` (MIT, Copyright (c)
2026 Asdale Dynamics, LLC), this `STATUS.md`.

## How to run it

- App: open `index.html` in any modern browser (double-click from the file
  manager). Works offline from `file://`. No server, no build step.
- Tests: `node tests/test.mjs` (needs only Node.js ≥ 18, no packages).

## Verification results (all passing)

- `node tests/test.mjs` → **PASSED: 28/28** — date math (boundaries, leap
  years, invalid dates), frost lookup/clamping (zones 3–10, year handling),
  spacing math (plants/row, rows/bed, guards), schedule generation, JSON
  persistence round-trip.
- The tests extract the `<script>` block out of `index.html` itself and run
  it in a vm sandbox, so they verify the exact code that ships.
- DOM smoke check: the app script initializes cleanly in a minimal fake
  `document` — beds view renders, frost header and zone options render,
  schedule computes for any zone/year.
- Two real bugs were found by the tests during development and fixed: the
  indoor-start date treated "weeks before frost" as days *after* frost
  (sign flip), and one frost-ordering check compared operands backward.

## Known gaps

- Frost dates are a static hand-built table of typical averages per zone —
  no weather API, no per-location refinement, no leap-aware "days from
  today" deduplication beyond what UTC-noon math handles. Adjust manually.
- The crop catalog is built in (20 crops); importing custom crops is not
  supported — spacing is editable per row, though.
- Log entries have no CSV export (JSON backup only).
- No automated UI-level tests (click flows, import file dialogs); coverage
  is concentrated on the pure math and persistence that drive everything.
- Beds use rectangle footprints only (no bed-interior obstacles, trellises,
  or companion-planting checks).
- Spacing model assumes centered straight rows; it doesn't block planting
  patterns like wide beds/grid seeding, staggered rows, or trellis-vine
  rows.
- USDA zones are US-centric; other countries' frost systems aren't
  supported.

## Data & privacy

All data stays in local browser storage on the device; nothing is sent
anywhere. No secrets, API keys, or personal data are present in any file.
