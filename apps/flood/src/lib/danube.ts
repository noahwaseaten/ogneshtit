import { cacheLife } from "next/cache";
import { loadBackup } from "@shtit/core/backup";
import { userAgent } from "@shtit/core/brand";
import type { DanubeForecast, DanubeResponse, DanubeStation } from "./flood-types";

// Measured Danube levels from the Executive Agency for Exploration and Maintenance of the Danube River (АППД),
// published every morning for the Bulgarian stretch, and its 6-day level forecast for five stations.
// Levels are in centimetres above each station's own zero, so they can be negative and are only comparable at
// the same station; we show them as they are and add the change over 24 hours.

const BASE = "https://www.appd-bg.org";
export const DANUBE_BACKUP = "danube";

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const num = (s: string) => {
  const m = /^[+-]?\d+(?:[.,]\d+)?$/.exec(strip(s));
  return m ? Number(m[0].replace(",", ".")) : null;
};
const rows = (table: string) => [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]));

async function page(path: string) {
  const res = await fetch(`${BASE}/${path}`, { headers: { "user-agent": userAgent("flood") }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`АППД ${res.status}`);
  return res.text();
}

/** "за 30.10.2026 г." → "2026-10-30" */
function dateOf(html: string) {
  const m = /за\s+(\d{2})\.(\d{2})\.(\d{4})/.exec(html);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

export function parseLevels(html: string): { date: string; stations: DanubeStation[] } {
  // The first table on the page: the staffed hydrometric stations.
  const table = /<table[\s\S]*?<\/table>/.exec(html)?.[0] ?? "";
  const stations = rows(table)
    .slice(1)
    .filter((r) => r.length >= 6)
    .map((r) => ({ name: strip(r[0]), km: num(r[1]) ?? 0, level: num(r[2]), flow: num(r[3]), change: num(r[4]), temp: num(r[5]) }))
    .filter((s) => s.name);
  return { date: dateOf(html), stations };
}

export function parseForecast(html: string, year: number): DanubeForecast[] {
  const out: DanubeForecast[] = [];
  for (const m of html.matchAll(/<h3>([^<]+)<\/h3>[\s\S]*?(<table[\s\S]*?<\/table>)/g)) {
    const r = rows(m[2]);
    const head = r.find((x) => strip(x[0]) === "ден");
    const get = (k: string) => r.find((x) => strip(x[0]) === k)?.slice(1).map(num) ?? [];
    if (!head) continue;
    const [mx, fc, mn] = [get("max"), get("прогноза"), get("min")];
    const days = head
      .slice(1)
      .map((d, i) => {
        const [dd, mm] = strip(d).split(".");
        return { date: `${year}-${mm}-${dd}`, level: fc[i], min: mn[i], max: mx[i] };
      })
      .filter((d): d is { date: string; level: number; min: number; max: number } => d.level != null && d.min != null && d.max != null);
    if (days.length) out.push({ name: strip(m[1]), days });
  }
  return out;
}

export async function getLiveDanube(): Promise<DanubeResponse> {
  "use cache";
  cacheLife({ stale: 900, revalidate: 3600, expire: 6 * 3600 });
  const [levels, forecast] = await Promise.all([page("hidrology"), page("forecasts").catch(() => "")]);
  const { date, stations } = parseLevels(levels);
  if (!stations.length) throw new Error("АППД: no stations in the table");
  const year = Number(date.slice(0, 4)) || new Date().getUTCFullYear();
  // A forecast that starts in January belongs to next year when the measurements are from December.
  const fc = parseForecast(forecast, year).map((f) => ({
    ...f,
    days: f.days.map((d) => (date.slice(5, 7) === "12" && d.date.slice(5, 7) === "01" ? { ...d, date: `${year + 1}${d.date.slice(4)}` } : d)),
  }));
  return { date, stations, forecast: fc, updated: new Date().toISOString() };
}

export async function getDanube(): Promise<DanubeResponse> {
  try {
    return await getLiveDanube();
  } catch (e) {
    const saved = await loadBackup<DanubeResponse>(DANUBE_BACKUP);
    if (!saved) throw e;
    console.error("danube: serving backup from", saved.saved, e);
    return { ...saved.data, backupFrom: saved.saved };
  }
}
