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
  windDir: number; // degrees the wind blows from
  rain: number;
};

export type Air = { aqi: number; pm25: number; pm10: number };

export type RiskResponse = {
  lat: number;
  lon: number;
  today: RiskDay;
  forecast: RiskDay[]; // next 5 days
  daysSinceRain: number;
  air: Air | null;
  updated: string;
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
export async function getRisk(lat: number, lon: number): Promise<RiskResponse> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 21600 });

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation",
    past_days: "45",
    forecast_days: "7",
    timezone: "Europe/Sofia",
    wind_speed_unit: "kmh",
  }).toString();

  const [res, air] = await Promise.all([fetch(url, { signal: AbortSignal.timeout(8000) }), getAir(lat, lon)]);
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

  return {
    lat,
    lon,
    today: toDay(series[idx]),
    forecast: series.slice(idx + 1, idx + 6).map(toDay),
    daysSinceRain,
    air,
    updated: new Date().toISOString(),
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
