// Checks for ВъздухоЩит's numbers: `npm test -w @shtit/air`.
//  1. The EEA band limits (hourly PM2.5 and PM10), including the values on a boundary.
//  2. A place takes the worse of its two particle bands.
//  3. The cleanest and dirtiest 3 daytime hours, today or tomorrow.
//  4. Which citizen readings are trusted (stuck, humid, far from the neighbours).
//  5. The forecast made to agree with what is measured now.
import { bandOf, blend, cleanSensors, leadOf, median, windows, BANDS, BLEND_HOURS, type Hour, type RawSensor } from "../src/lib/air-types";

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

// 4. Sensors. Five in one town reading about 8, one next to a chimney, one stuck at the ceiling, one in fog.
const town = (dLat: number, pm25: number, rh: number | null = 60): RawSensor => ({ lat: 42.7 + dLat, lon: 23.3, pm25, pm10: pm25 * 1.3, age: 3, rh });
const raw = [town(0, 8), town(0.005, 7), town(0.01, 9), town(0.015, 8), town(0.02, 10), town(0.012, 606), { ...town(0.008, 999.9), pm10: 1999.9 }, town(0.003, 40, 100), town(0.004, 6, null)];
const clean = cleanSensors(raw);
check("chimney sensor left out", !clean.sensors.some((x) => x[2] === 606));
check("stuck sensor left out", !clean.sensors.some((x) => x[2] === 999.9));
check("sensor in fog left out", !clean.sensors.some((x) => x[2] === 40) && clean.humid === 1);
check("no humidity sensor is kept", clean.sensors.some((x) => x[2] === 6));
check("ordinary sensors kept", clean.sensors.length === 6 && clean.odd === 2, JSON.stringify(clean));
check("PM2.5 above PM10 is broken", cleanSensors([{ ...town(0, 50), pm10: 10 }]).sensors.length === 0);
check("a lone very high reading is left out", cleanSensors([town(1, 400)]).sensors.length === 0);
check("a lone ordinary reading is kept", cleanSensors([town(1, 30)]).sensors.length === 1);
check("a whole town that is dirty is kept", cleanSensors([town(0, 120), town(0.01, 110), town(0.02, 130), town(0.03, 125)]).sensors.length === 4);

// 5. Blend. Forecast 25 every hour, sensors say 3 now.
const flat: Hour[] = Array.from({ length: 24 }, (_, i) => ({ time: `2026-11-02T${String(i).padStart(2, "0")}:00`, pm25: 25, pm10: 30, band: bandOf(25, 30).key }));
const b = blend(flat, { pm25: 3, pm10: 4 });
check("first hour is the measured value", b[0].pm25 === 3 && b[0].band === "good", JSON.stringify(b[0]));
check("gap fades halfway", b[BLEND_HOURS / 2].pm25 === 14, String(b[6].pm25));
check("plain forecast after the fade", b[BLEND_HOURS].pm25 === 25 && b[23].pm25 === 25);
check("never below zero", blend(flat, { pm25: -100, pm10: null }).every((h) => h.pm25 >= 0));
check("PM10 never below PM2.5", b.every((h) => h.pm10 >= h.pm25));
check("no sensors, no change", blend(flat, null) === flat);

console.log(`${passed} checks passed${failed ? `, ${failed} failed` : ""}`);
process.exit(failed ? 1 : 0);
