// Checks for ВъздухоЩит's numbers: `npm test -w @shtit/air`.
//  1. The EEA band limits (hourly PM2.5 and PM10), including the values on a boundary.
//  2. A place takes the worse of its two particle bands.
//  3. The cleanest and dirtiest 3 daytime hours, today or tomorrow.
import { bandOf, leadOf, median, windows, BANDS, type Hour } from "../src/lib/air-types";

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name} ${detail}`);
  }
}

// 1. EEA table (https://airindex.eea.europa.eu/AQI/index.html): PM2.5 0-5, 6-15, 16-50, 51-90, 91-140, >140;
//    PM10 0-15, 16-45, 46-120, 121-195, 196-270, >270.
const pm25Cases: [number, string][] = [[0, "good"], [5, "good"], [5.4, "good"], [6, "fair"], [15, "fair"], [16, "moderate"], [50, "moderate"], [51, "poor"], [90, "poor"], [91, "verypoor"], [140, "verypoor"], [141, "extreme"], [400, "extreme"]];
for (const [v, k] of pm25Cases) check(`PM2.5 ${v} → ${k}`, bandOf(v, 0).key === k, bandOf(v, 0).key);
const pm10Cases: [number, string][] = [[15, "good"], [16, "fair"], [45, "fair"], [46, "moderate"], [120, "moderate"], [121, "poor"], [195, "poor"], [196, "verypoor"], [270, "verypoor"], [271, "extreme"]];
for (const [v, k] of pm10Cases) check(`PM10 ${v} → ${k}`, bandOf(0, v).key === k, bandOf(0, v).key);
check("six bands in order", BANDS.map((b) => b.index).join() === "0,1,2,3,4,5");

// 2. The worse of the two.
check("worse of two: PM10 decides", bandOf(10, 130).key === "poor" && leadOf(10, 130) === "pm10");
check("worse of two: PM2.5 decides", bandOf(60, 30).key === "poor" && leadOf(60, 30) === "pm25");
check("missing PM10", bandOf(20, null).key === "moderate");

// 3. Windows. Today from 09:00, values dip at 13-15 and peak at 19-21.
const hours: Hour[] = [];
for (const day of ["2026-11-02", "2026-11-03"])
  for (let h = 0; h < 24; h++) {
    const pm25 = day === "2026-11-02" ? (h >= 13 && h <= 15 ? 8 : h >= 19 && h <= 21 ? 80 : 30) : h === 10 ? 4 : 20;
    hours.push({ time: `${day}T${String(h).padStart(2, "0")}:00`, pm25, pm10: pm25, band: bandOf(pm25, pm25).key });
  }
const w = windows(hours, "2026-11-02T09:00");
check("best today 13-16", w.best?.start === "2026-11-02T13:00" && w.best?.end === "2026-11-02T16:00", JSON.stringify(w.best));
check("worst today 19-22", w.worst?.start === "2026-11-02T19:00" && w.worst?.end === "2026-11-02T22:00", JSON.stringify(w.worst));
check("worst band is the worst hour's", w.worst?.band === "poor");
const late = windows(hours, "2026-11-02T20:00");
check("late evening looks at tomorrow", late.best?.start.slice(0, 10) === "2026-11-03", JSON.stringify(late.best));
check("nothing after the data", windows(hours, "2026-11-04T08:00").best === null);
check("median odd", median([3, 1, 2]) === 2);
check("median even", median([4, 1, 2, 3]) === 2.5);
check("median empty", median([]) === null);

console.log(`${passed} checks passed${failed ? `, ${failed} failed` : ""}`);
process.exit(failed ? 1 : 0);
