// Builds src/data/gauges.ts: river points on Bulgaria's main rivers with their flood thresholds.
//
// GloFAS v4 cells (0.05°, about 5 km) near a town can belong to a side stream, so for each point we first compare the
// 5 × 5 cells around the town (±0.1°) over a wet spring (March and April 2023) and keep the one with the most water.
// Points on tributaries never take a Danube cell. Then we take every day from 1984 to the end of last year at exactly
// that cell (Open-Meteo Flood API) and work out, with src/lib/stats.ts:
//   - yearly peaks → Gumbel distribution → flows expected once in 2, 5 and 20 years (GloFAS warns with the same three)
//   - every day of each calendar month → that month's median (normal) and 90th percentile (high for the season)
//   - the three highest yearly peaks, with their dates.
// Run with `npm run gauges -w @shtit/flood`. Answers are cached in scripts/.cache (not committed): 40 years for one
// point counts as about 1,000 calls on Open-Meteo's free API, so a rerun should not ask again.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { flowStats } from "../src/lib/stats";

type Basin = "dunav" | "cherno" | "iztok" | "zapad";
type FloodJson = { latitude: number; longitude: number; daily: { time: string[]; river_discharge: (number | null)[] } };

// [id, river (bg), river (en), place (bg), place (en), basin directorate, lat, lon, search radius in cells (default 2)]
// A radius of 1 keeps a tributary from jumping to the main river when the confluence is within 10 km.
const POINTS: [string, string, string, string, string, Basin, number, number, number?][] = [
  // Danube (measured by АППД too)
  ["dunav-vidin", "Дунав", "Danube", "Видин", "Vidin", "dunav", 43.99, 22.885],
  ["dunav-lom", "Дунав", "Danube", "Лом", "Lom", "dunav", 43.83, 23.24],
  ["dunav-oryahovo", "Дунав", "Danube", "Оряхово", "Oryahovo", "dunav", 43.735, 23.96],
  ["dunav-nikopol", "Дунав", "Danube", "Никопол", "Nikopol", "dunav", 43.705, 24.895],
  ["dunav-svishtov", "Дунав", "Danube", "Свищов", "Svishtov", "dunav", 43.625, 25.345],
  ["dunav-ruse", "Дунав", "Danube", "Русе", "Ruse", "dunav", 43.855, 25.955],
  ["dunav-silistra", "Дунав", "Danube", "Силистра", "Silistra", "dunav", 44.125, 27.26],
  // Danube tributaries
  ["ogosta-montana", "Огоста", "Ogosta", "Монтана", "Montana", "dunav", 43.42, 23.23],
  ["ogosta-mizia", "Огоста", "Ogosta", "Мизия", "Mizia", "dunav", 43.685, 23.85],
  ["iskar-novi-iskar", "Искър", "Iskar", "Нови Искър", "Novi Iskar", "dunav", 42.81, 23.345],
  ["iskar-roman", "Искър", "Iskar", "Роман", "Roman", "dunav", 43.15, 23.92],
  ["iskar-orehovitsa", "Искър", "Iskar", "Ореховица", "Orehovitsa", "dunav", 43.6, 24.37],
  ["vit-teteven", "Вит", "Vit", "Тетевен", "Teteven", "dunav", 42.915, 24.265],
  ["vit-pleven", "Вит", "Vit", "Плевен", "Pleven", "dunav", 43.42, 24.55],
  ["osam-troyan", "Осъм", "Osam", "Троян", "Troyan", "dunav", 42.89, 24.715],
  ["osam-lovech", "Осъм", "Osam", "Ловеч", "Lovech", "dunav", 43.135, 24.715],
  ["osam-levski", "Осъм", "Osam", "Левски", "Levski", "dunav", 43.36, 25.14],
  ["yantra-gabrovo", "Янтра", "Yantra", "Габрово", "Gabrovo", "dunav", 42.875, 25.32],
  ["yantra-tarnovo", "Янтра", "Yantra", "Велико Търново", "Veliko Tarnovo", "dunav", 43.08, 25.65],
  ["yantra-byala", "Янтра", "Yantra", "Бяла", "Byala", "dunav", 43.46, 25.73],
  ["rositsa-sevlievo", "Росица", "Rositsa", "Севлиево", "Sevlievo", "dunav", 43.02, 25.1],
  ["lom-ivanovo", "Русенски Лом", "Rusenski Lom", "Иваново", "Ivanovo", "dunav", 43.69, 25.96],
  // Black Sea
  ["kamchia-chiflik", "Камчия", "Kamchia", "Долни чифлик", "Dolni Chiflik", "cherno", 42.99, 27.715],
  ["provadiyska-provadia", "Провадийска", "Provadiyska", "Провадия", "Provadia", "cherno", 43.18, 27.44],
  ["aytoska-aytos", "Айтоска", "Aytoska", "Айтос", "Aytos", "cherno", 42.7, 27.25],
  ["veleka-zvezdets", "Велека", "Veleka", "Звездец", "Zvezdets", "cherno", 42.11, 27.43],
  // East Aegean
  ["maritsa-belovo", "Марица", "Maritsa", "Белово", "Belovo", "iztok", 42.21, 24.02],
  ["maritsa-pazardzhik", "Марица", "Maritsa", "Пазарджик", "Pazardzhik", "iztok", 42.195, 24.335],
  ["maritsa-plovdiv", "Марица", "Maritsa", "Пловдив", "Plovdiv", "iztok", 42.15, 24.75],
  ["maritsa-parvomay", "Марица", "Maritsa", "Първомай", "Parvomay", "iztok", 42.1, 25.22],
  ["maritsa-dimitrovgrad", "Марица", "Maritsa", "Димитровград", "Dimitrovgrad", "iztok", 42.06, 25.6],
  ["maritsa-harmanli", "Марица", "Maritsa", "Харманли", "Harmanli", "iztok", 41.935, 25.9],
  ["maritsa-svilengrad", "Марица", "Maritsa", "Свиленград", "Svilengrad", "iztok", 41.77, 26.2],
  ["chepelarska-asenovgrad", "Чепеларска", "Chepelarska", "Асеновград", "Asenovgrad", "iztok", 42.01, 24.87, 1],
  ["tundzha-kazanlak", "Тунджа", "Tundzha", "Казанлък", "Kazanlak", "iztok", 42.6, 25.39],
  ["tundzha-yambol", "Тунджа", "Tundzha", "Ямбол", "Yambol", "iztok", 42.48, 26.505],
  ["tundzha-elhovo", "Тунджа", "Tundzha", "Елхово", "Elhovo", "iztok", 42.17, 26.565],
  ["sazliyka-galabovo", "Сазлийка", "Sazliyka", "Гълъбово", "Galabovo", "iztok", 42.14, 25.86, 1],
  ["arda-rudozem", "Арда", "Arda", "Рудозем", "Rudozem", "iztok", 41.49, 24.85],
  ["arda-madzharovo", "Арда", "Arda", "Маджарово", "Madzharovo", "iztok", 41.635, 25.865],
  // West Aegean
  ["struma-pernik", "Струма", "Struma", "Перник", "Pernik", "zapad", 42.6, 23.03],
  ["struma-nevestino", "Струма", "Struma", "Невестино", "Nevestino", "zapad", 42.255, 22.85],
  ["struma-simitli", "Струма", "Struma", "Симитли", "Simitli", "zapad", 41.89, 23.11],
  ["struma-kresna", "Струма", "Struma", "Кресна", "Kresna", "zapad", 41.725, 23.155],
  ["struma-marino-pole", "Струма", "Struma", "Марино поле", "Marino Pole", "zapad", 41.43, 23.34],
  ["mesta-razlog", "Места", "Mesta", "Разлог", "Razlog", "zapad", 41.88, 23.47],
  ["mesta-gotse-delchev", "Места", "Mesta", "Гоце Делчев", "Gotse Delchev", "zapad", 41.57, 23.73],
];

const LAST_YEAR = new Date().getUTCFullYear() - 1;
const CACHE = new URL("./.cache/", import.meta.url);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(url: string, key: string): Promise<T> {
  if (!existsSync(CACHE)) mkdirSync(CACHE);
  const file = new URL(`${key}.json`, CACHE);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url);
    if (r.ok) {
      const body = await r.text();
      writeFileSync(file, body);
      await sleep(1500);
      return JSON.parse(body);
    }
    const wait = r.status === 429 ? 65000 : 3000 * 2 ** i;
    console.log(`  ${r.status}, waiting ${wait / 1000} s`);
    await sleep(wait);
  }
  throw new Error(`Open-Meteo failed: ${url}`);
}

const STEP = 0.05;
const centre = (v: number) => Math.floor(v / STEP) * STEP + STEP / 2;

/** The cell with the most water among those around (lat, lon): 5 × 5 by default, 3 × 3 with radius 1. */
async function findCell(id: string, lat: number, lon: number, isDanube: boolean, radius = 2) {
  const cells: [number, number][] = [];
  for (let i = -radius; i <= radius; i++) for (let j = -radius; j <= radius; j++) cells.push([+(centre(lat) + i * STEP).toFixed(3), +(centre(lon) + j * STEP).toFixed(3)]);
  const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${cells.map((c) => c[0]).join(",")}&longitude=${cells.map((c) => c[1]).join(",")}&daily=river_discharge&start_date=2023-03-01&end_date=2023-04-30&cell_selection=nearest`;
  const res = await get<FloodJson[]>(url, `cells-${id}-${radius}`);
  const scored = res.map((d, k) => {
    const v = d.daily.river_discharge.filter((x): x is number => x != null);
    return { lat: cells[k][0], lon: cells[k][1], mean: v.reduce((a, b) => a + b, 0) / Math.max(v.length, 1) };
  });
  return scored.filter((c) => isDanube || c.mean < 1500).sort((a, b) => b.mean - a.mean)[0];
}

async function main() {
  const out: Record<string, unknown>[] = [];
  for (const [id, riverBg, riverEn, placeBg, placeEn, basin, lat, lon, radius] of POINTS) {
    const cell = await findCell(id, lat, lon, riverEn === "Danube", radius);
    const d = await get<FloodJson>(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${cell.lat}&longitude=${cell.lon}&daily=river_discharge&start_date=1984-01-01&end_date=${LAST_YEAR}-12-31&cell_selection=nearest`,
      `history-${id}-${cell.lat}-${cell.lon}-${LAST_YEAR}`,
    );
    const s = flowStats(d.daily.time, d.daily.river_discharge);
    out.push({
      id,
      river: { bg: riverBg, en: riverEn },
      place: { bg: placeBg, en: placeEn },
      basin,
      lat: Math.round(d.latitude * 1000) / 1000,
      lon: Math.round(d.longitude * 1000) / 1000,
      ...s,
    });
    console.log(id.padEnd(26), `cell ${d.latitude.toFixed(3)},${d.longitude.toFixed(3)}`, "mean", s.mean, "Q2", s.q2, "Q20", s.q20, "top", s.records[0]?.date, s.records[0]?.q);
  }

  const header = `// Generated by scripts/gauges.ts from GloFAS v4 river discharge (Open-Meteo Flood API), ${out[0].years as string}. Do not edit.
  // q2/q5/q20: daily flow (m³/s) expected once in 2, 5 and 20 years (Gumbel fit of yearly peaks).
  // normal/high: median and 90th percentile of daily flow for each calendar month (January first).
  // records: the three highest yearly peaks in the series.
  import type { Gauge } from "@/lib/flood-types";

  export const GAUGES: Gauge[] = [
  `;
  writeFileSync(new URL("../src/data/gauges.ts", import.meta.url), header + out.map((g) => "  " + JSON.stringify(g) + ",").join("\n") + "\n];\n");
  console.log(`wrote ${out.length} gauges`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
