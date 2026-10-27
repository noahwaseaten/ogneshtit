import { cacheLife } from "next/cache";
import { runSeries, type DailyWeather } from "./fwi";
import { dangerFor } from "./danger";

export type RiskDay = {
  date: string;
  fwi: number;
  danger: string; // DangerKey
  temp: number;
  rh: number;
  wind: number;
  rain: number;
};

export type RiskResponse = {
  lat: number;
  lon: number;
  today: RiskDay;
  forecast: RiskDay[]; // next 5 days
  daysSinceRain: number;
  effis: { fwi: number; danger: string } | null;
  updated: string;
};

type OpenMeteo = {
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    wind_speed_10m: (number | null)[];
    precipitation: (number | null)[];
  };
};

const todayInSofia = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());

/** Weather for the last 45 days + 7-day forecast → FWI series. Cached 30 min per ~1 km cell. */
export async function getRisk(lat: number, lon: number): Promise<RiskResponse> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 21600 });

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
    past_days: "45",
    forecast_days: "7",
    timezone: "Europe/Sofia",
    wind_speed_unit: "kmh",
  }).toString();

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = (await res.json()) as OpenMeteo;
  const h = data.hourly;

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
  const today = todayInSofia();
  const idx = Math.max(0, series.findIndex((d) => d.date === today));
  const toDay = (d: (typeof series)[number]): RiskDay => ({
    date: d.date,
    fwi: Math.round(d.fwi * 10) / 10,
    danger: dangerFor(d.fwi).key,
    temp: Math.round(d.temp),
    rh: Math.round(d.rh),
    wind: Math.round(d.wind),
    rain: Math.round(d.rain * 10) / 10,
  });

  let daysSinceRain = 0;
  const dates = [...dailyRain.keys()].filter((d) => d <= today).sort().reverse();
  for (const d of dates) {
    if ((dailyRain.get(d) ?? 0) >= 1) break;
    daysSinceRain++;
  }

  return {
    lat,
    lon,
    today: toDay(series[idx]),
    forecast: series.slice(idx + 1, idx + 6).map(toDay),
    daysSinceRain,
    effis: await getEffis(lat, lon, today),
    updated: new Date().toISOString(),
  };
}

/** Cross-check: EFFIS's own FWI for this point (ECMWF model). Best-effort; null if unavailable. */
async function getEffis(lat: number, lon: number, date: string) {
  try {
    const d = 0.05;
    const url = new URL("https://maps.effis.emergency.copernicus.eu/effis");
    url.search = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.1.1",
      REQUEST: "GetFeatureInfo",
      LAYERS: "ecmwf007.fwi",
      QUERY_LAYERS: "ecmwf007.fwi",
      STYLES: "",
      SRS: "EPSG:4326",
      BBOX: [lon - d, lat - d, lon + d, lat + d].join(","),
      WIDTH: "3",
      HEIGHT: "3",
      X: "1",
      Y: "1",
      INFO_FORMAT: "text/plain",
      TIME: date,
    }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/value_0\s*=\s*'?(-?\d+(?:\.\d+)?)/i) ?? text.match(/=\s*'?(-?\d+(?:\.\d+)?)'?\s*$/m);
    if (!m) return null;
    const fwi = Number(m[1]);
    if (!Number.isFinite(fwi) || fwi < 0 || fwi > 200) return null;
    return { fwi: Math.round(fwi * 10) / 10, danger: dangerFor(fwi).key };
  } catch {
    return null;
  }
}
