# Garden Bed Planner

An offline, local-first web app for planning real garden beds instead of paper
guesses. Draw each bed by length and width, lay out crop rows with real spacing
math, see plant counts per row, get a seed-start and transplant schedule built
from your USDA zone's frost dates, keep succession notes per bed, and log the
season as it happens — all saved in your browser's localStorage.

Built by **Asdale Dynamics, LLC** in the same friendly spirit as
[Dylan Asdale's](https://dylanasdale.github.io) *The Massive AI Manual*: plain
English, step by step, never condescending.

## How to run it

1. Save or clone this folder anywhere on your computer.
2. Double-click `index.html` (or drag it into any modern browser).
3. That's it — it runs straight from `file://`, fully offline, with **zero
   dependencies, no accounts, and no network traffic**.

Everything you plan is stored locally in your browser under the storage key
`garden-bed-planner-v1`. Nothing is ever sent anywhere. Use the
**Save & Data** tab to export a JSON backup you can file away or move to
another computer, and to import a backup back in.

## What it does

| Tab | What you get |
| --- | --- |
| **Beds & Rows** | Add beds by name, length (ft), and width (ft). Add crop rows with plant spacing and row spacing (inches); the app computes plants/row, rows/bed, and total plants per row using centered spacing (edges keep at least a half-spacing setback). Each bed keeps its own succession notes. |
| **Planting Schedule** | Pick your USDA zone (3–10) and planning year. The app turns the zone's typical average last-spring-frost and first-fall-frost dates into a start-indoors date and a set-out date (transplant or direct-sow) for 20 common crops. |
| **Season Log** | Date, bed, and type (seed started / transplanted / harvested / note / wrap-up). Wrap-up entries are your season review for next year's seed order. |
| **Save & Data** | Export/import a JSON backup, erase all data, and see save status. |

Dates are anchored to noon UTC internally, so day math never drifts across DST
or month boundaries.

## Honest disclaimers

- Frost dates are the zone's **typical averages from a built-in table** — not
  a forecast. Watch your local weather and adjust a week either way.
- Spacing presets are sensible defaults; real seed packets and regional
  advice win. Edit any spacing in inches to match what you're planting.
- This is a planning tool, not agricultural or medical advice.

## Tests

The pure spacing and date math lives in the `GBP` module inside `index.html`;
the test suite extracts that exact script from the file and runs it in a
sandbox, so the tests cover the code the app actually ships with.

```sh
node tests/test.mjs
```

28 tests cover date math (month/year boundaries, leap years, invalid dates),
frost-date lookup and clamping, spacing math (plants per row, rows per bed,
partial spaces, zero/negative guards), schedule generation from frost dates,
and the localStorage persistence round-trip.

## Privacy

- All data stays in your browser's localStorage on your device.
- No accounts, no analytics, no network requests, no secrets.
- Backups only leave the device if *you* export and move the file yourself.

## Repository layout

```
index.html      the entire app (HTML + CSS + JS, single file)
tests/test.mjs  test suite (runs with plain Node, no dependencies)
LICENSE         MIT
README.md       this file
STATUS.md       build/run/verification notes and known gaps
```

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Asdale Dynamics, LLC.

---

*Garden Bed Planner* by [Asdale Dynamics, LLC](https://dylanasdale.github.io) —
beginner-friendly tools and guides, tested and local-first.
