import { cacheLife } from "next/cache";
import { runSeries, step, type Codes, type DailyWeather, type FwiDay } from "./fwi";
import { dangerFor } from "./danger";
import { loadBackup } from "./backup";

export type RiskDay = {
  date: string;
  fwi: number;
  danger: string; // DangerKey
  temp: number;
  rh: number;
  wind: number;
  windDir: number; // degrees the wind blows from
  rain: number;
};

export type Air = { aqi: number; pm25: number; pm10: number };

export type RiskResponse = {
  lat: number;
  lon: number;
  today: RiskDay;
  forecast: RiskDay[]; // next 5 days
  /** Unknown (null) for MET Norway estimates, which have no past weather. */
  daysSinceRain: number | null;
  air: Air | null;
  updated: string;
  /**
   * Set when Open-Meteo did not answer: the danger was carried forward from the last saved codes of the
   * nearest oblast with the MET Norway forecast for this place. Close, but not as exact.
   */
  approx?: "met-no";
};

type OpenMeteo = {
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    wind_speed_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    precipitation: (number | null)[];
  };
};

const todayInSofia = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());

/** Weather for the last 45 days + 7-day forecast → FWI series. Cached 30 min per ~1 km cell. */
async function getLiveRisk(lat: number, lon: number): Promise<RiskResponse> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 21600 });

  const [hourly, air] = await Promise.all([fetchHourly([lat], [lon]).then((x) => x[0]), getAir(lat, lon)]);
  const { codes: _codes, ...risk } = computeRisk(hourly, lat, lon);
  void _codes;
  return { ...risk, air };
}

/** Danger for a place; if Open-Meteo is down, an estimate from MET Norway (see `approx`). */
export async function getRisk(lat: number, lon: number): Promise<RiskResponse> {
  try {
    return await getLiveRisk(lat, lon);
  } catch (e) {
    console.error("risk: Open-Meteo failed, using MET Norway", e);
    return getMetRisk(lat, lon);
  }
}

const HOURLY = "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation";

/** Open-Meteo accepts many points in one request; it then answers with one object per point. */
async function fetchHourly(lats: number[], lons: number[]): Promise<OpenMeteo["hourly"][]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lons.join(","),
    hourly: HOURLY,
    past_days: "45",
    forecast_days: "7",
    timezone: "Europe/Sofia",
    wind_speed_unit: "kmh",
  }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = (await res.json()) as OpenMeteo | OpenMeteo[];
  return (Array.isArray(data) ? data : [data]).map((d) => d.hourly);
}

/** Codes at the end of `date`: enough to carry the FWI forward without 45 days of history. */
export type SavedCodes = Codes & { date: string };

function computeRisk(h: OpenMeteo["hourly"], lat: number, lon: number): Omit<RiskResponse, "air"> & { codes: SavedCodes | null } {
  // Noon weather + rain over the 24 h ending at noon, per day.
  const days: DailyWeather[] = [];
  const dailyRain = new Map<string, number>();
  h.time.forEach((t, i) => {
    const d = t.slice(0, 10);
    dailyRain.set(d, (dailyRain.get(d) ?? 0) + (h.precipitation[i] ?? 0));
  });
  h.time.forEach((t, i) => {
    if (!t.endsWith("T12:00") || i < 24) return;
    const temp = h.temperature_2m[i];
    const rh = h.relative_humidity_2m[i];
    const wind = h.wind_speed_10m[i];
    if (temp == null || rh == null || wind == null) return;
    let rain = 0;
    for (let k = i - 23; k <= i; k++) rain += h.precipitation[k] ?? 0;
    days.push({ date: t.slice(0, 10), month: Number(t.slice(5, 7)), temp, rh, wind, rain });
  });

  const series = runSeries(days);
  const dirAt = new Map(h.time.map((t, i) => [t.slice(0, 10), t.endsWith("T12:00") ? h.wind_direction_10m[i] : undefined]).filter(([, v]) => v != null) as [string, number][]);
  const today = todayInSofia();
  const idx = Math.max(0, series.findIndex((d) => d.date === today));
  const toDay = (d: (typeof series)[number]): RiskDay => ({
    date: d.date,
    fwi: Math.round(d.fwi * 10) / 10,
    danger: dangerFor(d.fwi).key,
    temp: Math.round(d.temp),
    rh: Math.round(d.rh),
    wind: Math.round(d.wind),
    windDir: Math.round(dirAt.get(d.date) ?? 0),
    rain: Math.round(d.rain * 10) / 10,
  });

  let daysSinceRain = 0;
  const dates = [...dailyRain.keys()].filter((d) => d <= today).sort().reverse();
  for (const d of dates) {
    if ((dailyRain.get(d) ?? 0) >= 1) break;
    daysSinceRain++;
  }

  const y = series[idx - 1];
  return {
    lat,
    lon,
    today: toDay(series[idx]),
    forecast: series.slice(idx + 1, idx + 6).map(toDay),
    daysSinceRain,
    updated: new Date().toISOString(),
    codes: y ? { date: y.date, ffmc: y.ffmc, dmc: y.dmc, dc: y.dc } : null,
  };
}

const toRiskDay = (d: FwiDay & { windDir?: number }): RiskDay => ({
  date: d.date,
  fwi: Math.round(d.fwi * 10) / 10,
  danger: dangerFor(d.fwi).key,
  temp: Math.round(d.temp),
  rh: Math.round(d.rh),
  wind: Math.round(d.wind),
  windDir: Math.round(d.windDir ?? 0),
  rain: Math.round(d.rain * 10) / 10,
});

// ---------------------------------------------------------------------------------------------
// Backup weather: MET Norway (api.met.no, free, no key; asks for a User-Agent that says who we are).

type MetEntry = {
  time: string;
  data: {
    instant: { details: { air_temperature?: number; relative_humidity?: number; wind_speed?: number; wind_from_direction?: number } };
    next_1_hours?: { details?: { precipitation_amount?: number } };
    next_6_hours?: { details?: { precipitation_amount?: number } };
  };
};

async function fetchMet(lat: number, lon: number): Promise<MetEntry[]> {
  const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`, {
    headers: { "user-agent": "OgneShtit/1.0 (+https://github.com/noahwaseaten/ogneshtit)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`MET Norway ${res.status}`);
  const ts = ((await res.json()) as { properties?: { timeseries?: MetEntry[] } }).properties?.timeseries;
  if (!ts?.length) throw new Error("MET Norway: empty forecast");
  return ts;
}

const sofiaParts = (ms: number) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(ms)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
};

/** Noon weather per Sofia day from MET Norway, with rain over the 24 h before (as much of it as the forecast covers). */
function metDays(ts: MetEntry[]): (DailyWeather & { windDir: number })[] {
  const t = ts.map((e) => Date.parse(e.time));
  // Rain periods: hourly while the forecast has them, then 6-hourly.
  const rain = ts.map((e, i) => {
    const next = t[i + 1] ?? Infinity;
    const one = e.data.next_1_hours?.details?.precipitation_amount;
    const six = e.data.next_6_hours?.details?.precipitation_amount;
    if (one != null && next - t[i] <= 3600e3) return { from: t[i], mm: one };
    if (six != null) return { from: t[i], mm: six };
    return { from: t[i], mm: one ?? 0 };
  });
  const best = new Map<string, number>();
  ts.forEach((_, i) => {
    const { date, hour } = sofiaParts(t[i]);
    const prev = best.get(date);
    if (prev == null || Math.abs(hour - 12) < Math.abs(sofiaParts(t[prev]).hour - 12)) best.set(date, i);
  });
  const out: (DailyWeather & { windDir: number })[] = [];
  for (const [date, i] of [...best.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    // Later days need a reading near noon. For today the forecast may start after noon (in the evening it starts
    // now), so the nearest reading stands in for noon.
    if (date !== sofiaParts(t[0]).date && Math.abs(sofiaParts(t[i]).hour - 12) > 3) continue;
    const d = ts[i].data.instant.details;
    if (d.air_temperature == null || d.relative_humidity == null || d.wind_speed == null) continue;
    const mm = rain.filter((r) => r.from >= t[i] - 24 * 3600e3 && r.from < t[i]).reduce((s, r) => s + r.mm, 0);
    out.push({ date, month: Number(date.slice(5, 7)), temp: d.air_temperature, rh: d.relative_humidity, wind: d.wind_speed * 3.6, rain: mm, windDir: d.wind_from_direction ?? 0 });
  }
  return out;
}

/** Steps the FWI forward from saved codes through the MET Norway days. */
function carryForward(codes: SavedCodes, days: (DailyWeather & { windDir: number })[]) {
  let prev: Codes = codes;
  const out: (FwiDay & { windDir: number })[] = [];
  for (const d of days) {
    if (d.date <= codes.date) continue;
    const r = { ...step(d, prev), windDir: d.windDir };
    out.push(r);
    prev = r;
  }
  return out;
}

/** The danger map's saved codes: live cache if it has them, else the stored copy. */
async function savedCodes(): Promise<DangerMap | null> {
  const live = await getLiveDangerMap().catch(() => null);
  if (live?.regions.every((r) => r.codes)) return live;
  return (await loadBackup<DangerMap>(DANGER_BACKUP))?.data ?? null;
}

async function getMetRisk(lat: number, lon: number): Promise<RiskResponse> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 21600 });
  const [map, ts, air] = await Promise.all([savedCodes(), fetchMet(lat, lon), getAir(lat, lon)]);
  if (!map) throw new Error("No saved FWI codes to continue from");
  const { OBLASTS } = await import("@/data/oblasts");
  const near = OBLASTS.map((o) => ({ o, d: (o.lat - lat) ** 2 + ((o.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2 })).sort((a, b) => a.d - b.d)[0].o;
  const codes = map.regions.find((r) => r.code === near.code)?.codes;
  if (!codes) throw new Error("No saved FWI codes for this oblast");
  const series = carryForward(codes, metDays(ts));
  const today = todayInSofia();
  const idx = series.findIndex((d) => d.date === today);
  if (idx < 0) throw new Error("MET Norway has no noon reading for today");
  return {
    lat,
    lon,
    today: toRiskDay(series[idx]),
    forecast: series.slice(idx + 1, idx + 6).map(toRiskDay),
    daysSinceRain: null,
    air,
    updated: new Date().toISOString(),
    approx: "met-no",
  };
}

/** Air quality now (CAMS model via Open-Meteo). Smoke from fires shows up as fine particles. Best-effort. */
async function getAir(lat: number, lon: number): Promise<Air | null> {
  try {
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.search = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: "european_aqi,pm2_5,pm10",
      timezone: "Europe/Sofia",
    }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const c = ((await res.json()) as { current?: { european_aqi?: number; pm2_5?: number; pm10?: number } }).current;
    if (c?.european_aqi == null) return null;
    return { aqi: Math.round(c.european_aqi), pm25: Math.round(c.pm2_5 ?? 0), pm10: Math.round(c.pm10 ?? 0) };
  } catch {
    return null;
  }
}

export type DangerMap = {
  regions: { code: string; name: string; fwi: number; danger: string; tomorrow: string; codes?: SavedCodes | null }[];
  updated: string;
  /** "met-no": carried forward with MET Norway because Open-Meteo did not answer. "backup": a stored copy. */
  approx?: "met-no" | "backup";
  backupFrom?: string;
};

export const DANGER_BACKUP = "danger-map";

/** Today's danger at each oblast's centre, from one batched weather request so no region goes missing. */
export async function getLiveDangerMap(): Promise<DangerMap> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 21600 });
  const { OBLASTS } = await import("@/data/oblasts");
  const hourly = await fetchHourly(
    OBLASTS.map((o) => o.lat),
    OBLASTS.map((o) => o.lon),
  );
  if (hourly.length !== OBLASTS.length) throw new Error("Open-Meteo: wrong number of points");
  const regions = OBLASTS.map((o, i) => {
    const r = computeRisk(hourly[i], o.lat, o.lon);
    return { code: o.code, name: o.name, fwi: r.today.fwi, danger: r.today.danger, tomorrow: r.forecast[0]?.danger ?? r.today.danger, codes: r.codes };
  });
  return { regions, updated: new Date().toISOString() };
}

/** MET Norway for each oblast centre, carried forward from the stored codes. A few at a time (their fair-use limit). */
export async function getMetDangerMap(saved: DangerMap): Promise<DangerMap> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 21600 });
  const { OBLASTS } = await import("@/data/oblasts");
  const today = todayInSofia();
  const regions: DangerMap["regions"] = [];
  for (let i = 0; i < OBLASTS.length; i += 7) {
    const batch = await Promise.all(
      OBLASTS.slice(i, i + 7).map(async (o) => {
        const prev = saved.regions.find((r) => r.code === o.code);
        if (!prev?.codes) throw new Error(`no codes for ${o.code}`);
        const series = carryForward(prev.codes, metDays(await fetchMet(o.lat, o.lon)));
        const k = series.findIndex((d) => d.date === today);
        if (k < 0) throw new Error("MET Norway has no noon reading for today");
        const day = toRiskDay(series[k]);
        return { code: o.code, name: o.name, fwi: day.fwi, danger: day.danger, tomorrow: series[k + 1] ? dangerFor(series[k + 1].fwi).key : day.danger, codes: prev.codes };
      }),
    );
    regions.push(...batch);
  }
  return { regions, updated: new Date().toISOString(), approx: "met-no" };
}

/** Live danger map; if Open-Meteo is down, MET Norway from the stored codes; else the stored copy itself. */
export async function getDangerMap(): Promise<DangerMap> {
  try {
    return await getLiveDangerMap();
  } catch (e) {
    const saved = await loadBackup<DangerMap>(DANGER_BACKUP);
    if (!saved) throw e;
    console.error("danger map: Open-Meteo failed, using MET Norway", e);
    try {
      return await getMetDangerMap(saved.data);
    } catch (e2) {
      console.error("danger map: MET Norway failed too, serving the stored copy", e2);
      return { ...saved.data, approx: "backup", backupFrom: saved.saved };
    }
  }
}
