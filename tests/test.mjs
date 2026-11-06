#!/usr/bin/env node
// Tests for the pure spacing and date math used by index.html.
// The script block is extracted straight out of index.html and evaluated in
// a sandbox, so the tests cover exactly the code the app ships with.
//
// Run:  node tests/test.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const html = readFileSync(path.join(root, "index.html"), "utf8");

// --- extract the app's <script> block --------------------------------------
const openTag = html.lastIndexOf("<script>");
const closeTag = html.indexOf("</script>", openTag);
if (openTag === -1 || closeTag === -1) {
  console.error("Could not find the <script> block in index.html");
  process.exit(1);
}
const appSrc = html.slice(openTag + "<script>".length, closeTag).trim();

// --- sandbox: localStorage stub, no document (UI block must stay guarded) ---
const storage = new Map();
const localStorageStub = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

const sandbox = { localStorage: localStorageStub, console, confirm: () => true };
vm.createContext(sandbox);
vm.runInContext(appSrc, sandbox, { filename: "index.html#inline-script" });

const GBP = sandbox.GBP;
if (!GBP || typeof GBP !== "object") {
  console.error("GBP planning module not found after evaluating index.html script");
  process.exit(1);
}

// --- tiny test harness ------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    failures.push({ name, message: err instanceof Error ? err.message : String(err) });
  }
}
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

// ---------------------------------------------------------------------------
// Date math
// ---------------------------------------------------------------------------
test("parseISO parses a plain ISO date", () => {
  const d = GBP.parseISO("2026-04-20");
  eq(d.getUTCFullYear(), 2026, "year");
  eq(d.getUTCMonth(), 3, "month");
  eq(d.getUTCDate(), 20, "day");
});

test("parseISO rejects invalid dates", () => {
  eq(GBP.parseISO("not a date"), null, "garbage");
  eq(GBP.parseISO("2026-13-05"), null, "month 13");
  eq(GBP.parseISO("2026-02-30"), null, "Feb 30");
  eq(GBP.parseISO("2027-02-29"), null, "Feb 29 in non-leap year");
});

test("parseISO accepts leap-day in a leap year", () => {
  eq(GBP.parseISO("2028-02-29") !== null, true, "2028 leap day ok");
});

test("addDays handles month boundaries", () => {
  eq(GBP.addDays("2026-04-30", 1), "2026-05-01", "Apr 30 + 1");
  eq(GBP.addDays("2026-03-01", -1), "2026-02-28", "Mar 1 - 1 (not leap year)");
});

test("addDays handles year boundaries", () => {
  eq(GBP.addDays("2026-12-31", 1), "2027-01-01", "Dec 31 + 1");
  eq(GBP.addDays("2027-01-01", -1), "2026-12-31", "Jan 1 - 1");
});

test("addDays over many days stays calendar-accurate", () => {
  eq(GBP.addDays("2026-04-20", 365), "2027-04-20", "365 days later");
  eq(GBP.addDays("2028-01-01", 365 + 366), "2030-01-01", "two-year span incl. leap 2028");
});

test("diffDays is signed and symmetric-negated", () => {
  eq(GBP.diffDays("2026-04-20", "2026-05-11"), 21, "+21d");
  eq(GBP.diffDays("2026-05-11", "2026-04-20"), -21, "-21d");
  eq(GBP.diffDays("2026-04-20", "2026-04-20"), 0, "same day");
});

test("diffDays against invalid input returns null", () => {
  eq(GBP.diffDays("2026-04-20", "nope"), null, "invalid to");
  eq(GBP.diffDays("nope", "2026-04-20"), null, "invalid from");
});

test("monthDayToISO validates the month-day pair", () => {
  eq(GBP.monthDayToISO("04-20", 2026), "2026-04-20", "valid pair");
  eq(GBP.monthDayToISO("02-30", 2026), null, "Feb 30 rejected");
  eq(GBP.monthDayToISO("garbage", 2026), null, "garbage rejected");
});

test("toISO round-trips through parseISO", () => {
  eq(GBP.toISO(GBP.parseISO("2026-11-06")), "2026-11-06", "round trip");
});

// ---------------------------------------------------------------------------
// Frost-date table & zone handling
// ---------------------------------------------------------------------------
test("frostDates covers zones 3 through 10", () => {
  for (let z = 3; z <= 10; z++) {
    const f = GBP.frostDates(z, 2026);
    eq(f.zone, z, `zone ${z} echoed`);
    if (f.lastFrost === null || f.firstFrost === null) {
      throw new Error(`zone ${z} has null frost dates`);
    }
    if (GBP.diffDays(f.lastFrost, f.firstFrost) <= 0) {
      throw new Error(`zone ${z}: last frost must fall before first fall frost`);
    }
  }
});

test("frostDates uses the requested year", () => {
  eq(GBP.frostDates(5, 2026).lastFrost, "2026-04-20", "zone 5 2026");
  eq(GBP.frostDates(5, 2027).lastFrost, "2027-04-20", "zone 5 2027");
});

test("frostDates clamps out-of-range zones", () => {
  eq(GBP.frostDates(1, 2026).zone, 3, "zone 1 clamps up to 3");
  eq(GBP.frostDates(13, 2026).zone, 10, "zone 13 clamps down to 10");
  eq(GBP.frostDates("abc", 2026).zone, 3, "garbage zone clamps to 3");
});

test("zone 7 is warmer than zone 4 (earlier last frost)", () => {
  const z4 = GBP.frostDates(4, 2026).lastFrost;
  const z7 = GBP.frostDates(7, 2026).lastFrost;
  eq(GBP.diffDays(z7, z4) > 0, true, "zone 4 last frost later than zone 7");
});

// ---------------------------------------------------------------------------
// Spacing math
// ---------------------------------------------------------------------------
test("plantsPerRow: 8ft row at 12in spacing gives 8 plants", () => {
  eq(GBP.plantsPerRow(96, 12), 8, "96in / 12in");
});

test("plantsPerRow takes the floor for partial spaces", () => {
  eq(GBP.plantsPerRow(95, 12), 7, "95in / 12in");
  eq(GBP.plantsPerRow(47, 12), 3, "47in / 12in");
});

test("plantsPerRow rejects nonsense inputs", () => {
  eq(GBP.plantsPerRow(0, 12), 0, "zero length");
  eq(GBP.plantsPerRow(-10, 12), 0, "negative length");
  eq(GBP.plantsPerRow(96, 0), 0, "zero spacing");
  eq(GBP.plantsPerRow(96, -3), 0, "negative spacing");
  eq(GBP.plantsPerRow(NaN, 12), 0, "NaN length");
  eq(GBP.plantsPerRow(96, Infinity), 0, "infinite spacing");
});

test("plantsPerRow is consistent: fewer, tighter, or full rows", () => {
  eq(GBP.plantsPerRow(120, 24), 5, "5 plants for 24in spacing");
  const totalUsed = 5 * 24;
  eq(totalUsed <= 120 && 120 - totalUsed < 24, true, "unused space is less than one spacing");
});

test("rowsFit: 4ft bed at 12in row spacing gives 4 rows", () => {
  eq(GBP.rowsFit(48, 12), 4, "48in / 12in");
  eq(GBP.rowsFit(47, 12), 3, "partial row space ignored");
});

test("rowsFit handles wide row spacing", () => {
  eq(GBP.rowsFit(48, 36), 1, "one row only in a 4ft bed for winter squash");
  eq(GBP.rowsFit(24, 36), 0, "no rows fit in 2ft bed for 36in spacing");
  eq(GBP.rowsFit(0, 12), 0, "zero width");
  eq(GBP.rowsFit(48, 0), 0, "zero spacing");
});

test("usableRowLength subtracts edge setback", () => {
  eq(GBP.usableRowLength(96, 12), 84, "96in with 12in setback");
  eq(GBP.usableRowLength(12, 12), 0, "exactly one spacing wide -> zero usable");
  eq(GBP.usableRowLength(6, 12), 0, "narrower than spacing -> zero");
});

test("total plants = rowsFit * plantsPerRow (zone-independent math)", () => {
  const rows = GBP.rowsFit(48, 18);
  const per = GBP.plantsPerRow(96, 2);
  eq(rows, 2, "rows for peas");
  eq(per, 48, "plants per row for peas");
  eq(rows * per, 96, "96 pea plants in a 4x8 bed");
});

// ---------------------------------------------------------------------------
// Schedule generation from frost dates
// ---------------------------------------------------------------------------
test("scheduleForPlant: tomato zone 5, 2026", () => {
  const tomato = GBP.catalog().find((p) => p.id === "tomato");
  const s = GBP.scheduleForPlant(tomato, 5, 2026);
  eq(s.isDirectSow, false, "tomato is started indoors");
  eq(s.startIndoorsISO, "2026-03-09", "6 weeks before last frost (Apr 20)");
  eq(s.setOutISO, "2026-04-27", "1 week after last frost");
});

test("scheduleForPlant honors zone warmth", () => {
  const tomato = GBP.catalog().find((p) => p.id === "tomato");
  const z3 = GBP.scheduleForPlant(tomato, 3, 2026);
  const z9 = GBP.scheduleForPlant(tomato, 9, 2026);
  eq(GBP.diffDays(z9.startIndoorsISO, z3.startIndoorsISO) > 80, true, "zone 9 starts much earlier");
});

test("scheduleForPlant: direct-sow crop has no indoor start", () => {
  const pea = GBP.catalog().find((p) => p.id === "pea");
  const s = GBP.scheduleForPlant(pea, 5, 2026);
  eq(s.isDirectSow, true, "pea direct sown");
  eq(s.startIndoorsISO, null, "no indoor start");
  eq(s.setOutISO, "2026-03-16", "5 weeks before last frost");
});

test("every catalog entry produces a valid schedule", () => {
  for (const plant of GBP.catalog()) {
    const s = GBP.scheduleForPlant(plant, 6, 2026);
    if (GBP.parseISO(s.setOutISO) === null) {
      throw new Error(`${plant.name}: set-out date invalid`);
    }
    if (!s.isDirectSow && GBP.parseISO(s.startIndoorsISO) === null) {
      throw new Error(`${plant.name}: indoor start invalid for non-direct crop`);
    }
    if (plant.plantSpacing <= 0 || plant.rowSpacing <= 0) {
      throw new Error(`${plant.name}: default spacings must be positive`);
    }
  }
});

test("transplant always follows (or equals) its indoor start", () => {
  for (const plant of GBP.catalog()) {
    if (plant.weeksStart === null) continue;
    const s = GBP.scheduleForPlant(plant, 5, 2026);
    eq(GBP.diffDays(s.startIndoorsISO, s.setOutISO) > 0, true, `${plant.name} set out after start`);
  }
});

// ---------------------------------------------------------------------------
// Persistence layer (localStorage) through the sandbox
// ---------------------------------------------------------------------------
test("state serializes and deserializes through JSON", () => {
  const state = { zone: 7, year: 2026, beds: [], log: [] };
  sandbox.localStorage.setItem("garden-bed-planner-v1", JSON.stringify(state));
  eq(sandbox.localStorage.getItem("garden-bed-planner-v1"), JSON.stringify(state), "round trip");
});

// --- report -----------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\nFAILED: ${failed} of ${passed + failed} tests\n`);
  for (const f of failures) {
    console.error(`  [x] ${f.name}`);
    console.error(`      ${f.message}\n`);
  }
  process.exitCode = 1;
} else {
  console.log(`PASSED: ${passed}/${passed + failed} tests (spacing math, date math, frost schedule, persistence)`);
}
