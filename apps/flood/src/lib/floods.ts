import { cacheLife } from "next/cache";
import { loadBackup } from "@shtit/core/backup";
import { GAUGES } from "@/data/gauges";
import { distanceKm } from "@shtit/core/geo";
import { roundQ } from "./stats";
import { summarize, type Daily } from "./summarize";
import {
  NEAR_KM,
  levelByKey,
  peakOf,
  type Gauge,
  type GaugeStatus,
  type GaugesResponse,
  type PlaceResponse,
  type RiverForecast,
  type Thresholds,
  type Weather,
} from "./flood-types";

// River forecasts from GloFAS v4 (Copernicus Emergency Management Service) through the Open-Meteo Flood API.
// GloFAS runs once a day: 51 versions of the next 30 days (an ensemble), each started from slightly different
// weather. We keep the spread instead of one line, and judge each day by the share of runs over each threshold.

const FLOOD_API = "https://flood-api.open-meteo.com/v1/flood";

type FloodJson = { latitude: number; longitude: number; daily: Daily };

async function getJson<T>(url: URL | string, ms = 20000): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return (await res.json()) as T;
}

const many = <T,>(x: T | T[]) => (Array.isArray(x) ? x : [x]);

/** The 51 runs for each point, 15 days ahead (the horizon GloFAS itself warns over). */
async function fetchEnsemble(lats: number[], lons: number[]): Promise<FloodJson[]> {
  const url = new URL(FLOOD_API);
  url.search = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lons.join(","),
    daily: "river_discharge",
    forecast_days: "15",
    ensemble: "true",
    cell_selection: "nearest",
  }).toString();
  return many(await getJson<FloodJson | FloodJson[]>(url, 25000));
}

/** Modelled flow for the past 30 days, for each point. */
async function fetchPast(lats: number[], lons: number[]): Promise<FloodJson[]> {
  const url = new URL(FLOOD_API);
  url.search = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lons.join(","),
    daily: "river_discharge",
    past_days: "30",
    forecast_days: "1",
    cell_selection: "nearest",
  }).toString();
  return many(await getJson<FloodJson | FloodJson[]>(url));
}

const todayInSofia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());

function forecastOf(ens: FloodJson, past: FloodJson | undefined, t: Thresholds): RiverForecast {
  const today = todayInSofia();
  const days = summarize(ens.daily, t).filter((d) => d.date >= today);
  const pastDays = past
    ? past.daily.time
        .map((date, i) => ({ date, q: past.daily.river_discharge[i] }))
        .filter((x): x is { date: string; q: number } => x.q != null && x.date < (days[0]?.date ?? today))
        .map((x) => ({ date: x.date, q: roundQ(x.q) }))
    : [];
  return { lat: ens.latitude, lon: ens.longitude, past: pastDays, days, thresholds: t, peak: peakOf(days), updated: new Date().toISOString() };
}

export function statusOf(g: Gauge, f: RiverForecast): GaugeStatus {
  const d0 = f.days[0];
  const d3 = f.days[Math.min(3, f.days.length - 1)];
  const month = Number((d0?.date ?? todayInSofia()).slice(5, 7)) - 1;
  const q = d0?.median ?? f.past.at(-1)?.q ?? 0;
  const change = d0 && d3 ? (d3.median - d0.median) / Math.max(d0.median, 0.1) : 0;
  return {
    id: g.id,
    q,
    level: d0?.level ?? "low",
    peak: f.peak,
    vsNormal: Math.round((q / Math.max(g.normal[month], 0.01)) * 10) / 10,
    trend: change > 0.1 ? "up" : change < -0.1 ? "down" : "flat",
  };
}

export type GaugeForecasts = { forecasts: Record<string, RiverForecast>; updated: string };

export const GAUGES_BACKUP = "gauges";

/**
 * Every river point, in two batched requests. GloFAS runs once a day, so every 6 hours is plenty, and it keeps us far
 * inside Open-Meteo's free limits (51 runs count as several variables, and every point counts on its own).
 */
export async function getLiveGaugeForecasts(): Promise<GaugeForecasts> {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 6 * 3600, expire: 36 * 3600 });
  const lats = GAUGES.map((g) => g.lat);
  const lons = GAUGES.map((g) => g.lon);
  const [ens, past] = await Promise.all([fetchEnsemble(lats, lons), fetchPast(lats, lons).catch(() => [] as FloodJson[])]);
  if (ens.length !== GAUGES.length) throw new Error("GloFAS: wrong number of points");
  const forecasts: Record<string, RiverForecast> = {};
  GAUGES.forEach((g, i) => {
    forecasts[g.id] = forecastOf(ens[i], past[i], g);
  });
  return { forecasts, updated: new Date().toISOString() };
}

/** Live forecasts, or the saved copy (with its date) when GloFAS does not answer. */
export async function getGaugeForecasts(): Promise<GaugeForecasts & { backupFrom?: string }> {
  try {
    return await getLiveGaugeForecasts();
  } catch (e) {
    const saved = await loadBackup<GaugeForecasts>(GAUGES_BACKUP);
    if (!saved) throw e;
    console.error("gauges: serving backup from", saved.saved, e);
    return { ...saved.data, backupFrom: saved.saved };
  }
}

export async function getGauges(): Promise<GaugesResponse> {
  const f = await getGaugeForecasts();
  const gauges = GAUGES.filter((g) => f.forecasts[g.id]).map((g) => statusOf(g, f.forecasts[g.id]));
  return { gauges, updated: f.updated, backupFrom: f.backupFrom };
}

// ---------------------------------------------------------------------------------------------
// A place: its rivers are the river points within 25 km. A live 40-year lookup for any spot would cost about
// 1,000 calls of Open-Meteo's free quota per place, so thresholds exist only for the fixed points (scripts/gauges.ts).

/** River points near a place, closest first, with the distance in km. */
export function gaugesNear(lat: number, lon: number, km = NEAR_KM) {
  return GAUGES.map((g) => ({ g, km: Math.round(distanceKm(lat, lon, g.lat, g.lon) * 10) / 10 }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km);
}

/** Rain, snow and melt at a place: 3 days back and 7 ahead (Open-Meteo forecast, best model for the place). */
export async function getWeather(lat: number, lon: number): Promise<Weather> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 21600 });
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: "precipitation_sum,rain_sum,snowfall_sum,temperature_2m_max,temperature_2m_min",
    hourly: "snow_depth",
    past_days: "3",
    forecast_days: "7",
    timezone: "Europe/Sofia",
  }).toString();
  type W = {
    daily: { time: string[]; precipitation_sum: (number | null)[]; rain_sum: (number | null)[]; snowfall_sum: (number | null)[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[] };
    hourly: { time: string[]; snow_depth: (number | null)[] };
  };
  const w = await getJson<W>(url, 15000);
  const today = todayInSofia();
  // Snow depth at noon each day, in cm (the API gives metres).
  const depth = new Map(w.hourly.time.map((t, i) => [t, w.hourly.snow_depth[i]] as const).filter(([t]) => t.endsWith("T12:00")).map(([t, v]) => [t.slice(0, 10), v]));
  const all = w.daily.time.map((date, i) => ({
    date,
    rain: Math.round((w.daily.rain_sum[i] ?? 0) * 10) / 10,
    snow: Math.round((w.daily.snowfall_sum[i] ?? 0) * 10) / 10,
    precip: Math.round((w.daily.precipitation_sum[i] ?? 0) * 10) / 10,
    tmax: Math.round(w.daily.temperature_2m_max[i] ?? 0),
    tmin: Math.round(w.daily.temperature_2m_min[i] ?? 0),
    snowDepth: depth.get(date) != null ? Math.round((depth.get(date) as number) * 100) : null,
  }));
  const nowHour = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .format(new Date())
    .replace(", ", "T")
    .slice(0, 13);
  const k = w.hourly.time.findIndex((t) => t.startsWith(nowHour));
  const snowNow = Math.round((w.hourly.snow_depth[k >= 0 ? k : 0] ?? 0) * 100);
  const days = all.filter((d) => d.date >= today);
  return {
    past3: Math.round(all.filter((d) => d.date < today).reduce((s, d) => s + d.precip, 0) * 10) / 10,
    days,
    snowNow,
    rainOnSnow: days.filter((d) => d.rain >= 5 && (d.snowDepth ?? 0) >= 5 && d.tmax > 0).map((d) => d.date),
  };
}

/**
 * Everything the Today screen needs for one place: the river point within 25 km in the worst state (closest first
 * when equal) with its full forecast, the others nearby, and rain and snow. Rounded to about 1 km before it gets here.
 */
export async function getPlace(lat: number, lon: number): Promise<PlaceResponse> {
  const near = gaugesNear(lat, lon);
  const [forecasts, weather] = await Promise.allSettled([near.length ? getGaugeForecasts() : Promise.resolve(null), getWeather(lat, lon)]);
  if (forecasts.status === "rejected" && weather.status === "rejected") throw forecasts.reason;
  if (forecasts.status === "rejected") console.error("place rivers failed", forecasts.reason);
  if (weather.status === "rejected") console.error("place weather failed", weather.reason);
  const f = forecasts.status === "fulfilled" ? forecasts.value : null;
  const rated = f
    ? near
        .filter((x) => f.forecasts[x.g.id])
        .map((x) => ({ ...x, f: f.forecasts[x.g.id], status: statusOf(x.g, f.forecasts[x.g.id]) }))
    : [];
  const rank = (x: (typeof rated)[number]) => levelByKey(x.status.peak.level).index * 10 + levelByKey(x.status.level).index;
  const main = [...rated].sort((a, b) => rank(b) - rank(a) || a.km - b.km)[0];
  return {
    river: main ? { ...main.f, gauge: main.g.id, km: main.km, mean: main.g.mean, records: main.g.records } : null,
    others: rated.filter((x) => x !== main).map((x) => ({ ...x.status, km: x.km })),
    riverFailed: (near.length > 0 && !f) || undefined,
    weather: weather.status === "fulfilled" ? weather.value : null,
    backupFrom: f?.backupFrom,
    updated: new Date().toISOString(),
  };
}
