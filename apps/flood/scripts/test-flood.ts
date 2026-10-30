// Checks for ВодоЩит's numbers: `npm test -w @shtit/flood`.
//  1. Gumbel thresholds against values worked out by hand.
//  2. The GloFAS 30% rule and day summaries on a made-up ensemble.
//  3. The АППД page parsers on saved copies of the real pages.
//  4. The generated river points: thresholds in order, and more water downstream on every river.
import { readFileSync } from "node:fs";
import { gumbel, quantile, flowStats } from "../src/lib/stats";
import { dayLevel, peakOf, MIN_SHARE, type Day } from "../src/lib/flood-types";
import { parseForecast, parseLevels } from "../src/lib/danube";
import { summarize } from "../src/lib/summarize";
import { GAUGES } from "../src/data/gauges";

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name} ${detail}`);
  }
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// 1. Gumbel by the method of moments. Peaks 100, 200, 300: mean 200, s = 100,
//    α = 100·√6/π = 77.97, u = 200 − 0.5772·77.97 = 155.0. Q(2) = u − α·ln(ln 2) = 155.0 + 0.3665·77.97 = 183.6.
//    Q(20) = u − α·ln(−ln 0.95) = 155.0 + 2.9702·77.97 = 386.6.
const g = gumbel([100, 200, 300]);
check("gumbel Q2", near(g(2), 183.6, 0.2), String(g(2)));
check("gumbel Q20", near(g(20), 386.6, 0.3), String(g(20)));
check("gumbel grows with T", g(2) < g(5) && g(5) < g(20));
check("quantile median", quantile([1, 2, 3, 4], 0.5) === 2.5);
check("quantile p90", near(quantile([0, 10], 0.9), 9, 1e-9));

// flowStats keeps only complete years for peaks.
const time: string[] = [];
const q: number[] = [];
for (let y = 2000; y <= 2002; y++)
  for (let d = 0; d < 365; d++) {
    const date = new Date(Date.UTC(y, 0, 1 + d)).toISOString().slice(0, 10);
    time.push(date);
    q.push(d === 100 ? (y - 1999) * 100 : 10);
  }
time.push("2003-01-01");
q.push(9999); // a partial year must not count as a yearly peak
const fs = flowStats(time, q);
check("flowStats ignores partial years", fs.records[0].q === 300 && fs.years === "2000-2002", JSON.stringify(fs.records));
check("flowStats Q2 from peaks", near(fs.q2, 183.6, 0.5), String(fs.q2));

// 2. The level rule: a day reaches a threshold when more than 30% of runs pass it.
const none = { high: 0, q2: 0, q5: 0, q20: 0 };
check("rule: calm", dayLevel(none) === "low");
check("rule: exactly 30% is not enough", dayLevel({ ...none, high: MIN_SHARE }) === "low");
check("rule: moderate", dayLevel({ ...none, high: 0.31 }) === "moderate");
check("rule: high", dayLevel({ high: 1, q2: 0.4, q5: 0.1, q20: 0 }) === "high");
check("rule: severe beats all", dayLevel({ high: 1, q2: 1, q5: 1, q20: 0.35 }) === "extreme");

// 51 runs for 3 days. Day 1: all at 50. Day 2: 20 runs at 150, 31 at 50 (39% over q2 = 100). Day 3: 40 runs at 300.
const t = { q2: 100, q5: 200, q20: 400, high: Array(12).fill(80), normal: Array(12).fill(40) };
const daily: Record<string, (number | null)[]> & { time: string[] } = { time: ["2026-11-01", "2026-11-02", "2026-11-03"] };
for (let m = 0; m < 51; m++) daily[m ? `river_discharge_member${String(m).padStart(2, "0")}` : "river_discharge"] = [50, m < 20 ? 150 : 50, m < 40 ? 300 : 50];
const days: Day[] = summarize(daily, t);
check("summary: 3 days", days.length === 3);
check("summary: day 1 low", days[0].level === "low" && days[0].median === 50);
check("summary: day 2 high", days[1].level === "high" && near(days[1].above.q2, 20 / 51, 1e-9), JSON.stringify(days[1].above));
check("summary: day 3 very high", days[2].level === "veryhigh" && days[2].median === 300);
check("peak", peakOf(days).level === "veryhigh" && peakOf(days).date === "2026-11-03");

// 3. АППД parsers on saved pages (30 October 2026).
const lv = parseLevels(readFileSync(new URL("./data/appd-hidrology.html", import.meta.url), "utf8"));
check("danube date", lv.date === "2026-10-30", lv.date);
check("danube stations", lv.stations.length === 8, String(lv.stations.length));
const ruse = lv.stations.find((s) => s.name === "Русе");
check("danube Ruse", !!ruse && ruse.level === -127 && ruse.flow === 1487 && ruse.change === 1, JSON.stringify(ruse));
check("danube Vidin has no flow", lv.stations.find((s) => s.name === "Видин")?.flow === null);
const fc = parseForecast(readFileSync(new URL("./data/appd-forecasts.html", import.meta.url), "utf8"), 2026);
check("danube forecast stations", fc.length === 5, String(fc.length));
const svishtov = fc.find((f) => f.name === "Свищов");
check("danube forecast Svishtov", !!svishtov && svishtov.days[0].date === "2026-10-31" && svishtov.days[0].level === -79 && svishtov.days[0].min === -84, JSON.stringify(svishtov?.days[0]));

// 4. Generated river points.
for (const p of GAUGES) {
  check(`${p.id} thresholds in order`, p.q2 < p.q5 && p.q5 < p.q20, `${p.q2} ${p.q5} ${p.q20}`);
  check(`${p.id} normal below high`, p.normal.every((n, i) => n <= p.high[i]));
  check(`${p.id} big enough for GloFAS`, p.q2 >= 1, String(p.q2));
}
const byRiver = new Map<string, typeof GAUGES>();
for (const p of GAUGES) byRiver.set(p.river.en, [...(byRiver.get(p.river.en) ?? []), p]);
for (const [river, ps] of byRiver)
  for (let i = 1; i < ps.length; i++)
    check(`${river}: more water at ${ps[i].place.en} than at ${ps[i - 1].place.en}`, ps[i].mean >= ps[i - 1].mean * 0.95, `${ps[i - 1].mean} → ${ps[i].mean}`);

// Two different rivers close together with almost the same flow means one point took the other river's cell.
for (const a of GAUGES)
  for (const b of GAUGES) {
    if (a.id >= b.id || a.river.en === b.river.en) continue;
    const km = Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 82);
    const same = Math.abs(a.mean - b.mean) / Math.max(a.mean, b.mean) < 0.1;
    check(`${a.id} and ${b.id} are different rivers`, !(km < 40 && same), `${km.toFixed(0)} km, ${a.mean} vs ${b.mean}`);
  }

console.log(`${passed} checks passed${failed ? `, ${failed} failed` : ""}`);
process.exit(failed ? 1 : 0);
