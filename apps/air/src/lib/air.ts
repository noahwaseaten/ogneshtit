import { cacheLife } from "next/cache";
import { loadBackup } from "@shtit/core/backup";
import { userAgent } from "@shtit/core/brand";
import { distanceKm } from "@shtit/core/geo";
import { PLACES } from "@shtit/core/data/places";
import { bandOf, blend, BANDS, cleanSensors, median, windows, type CitiesResponse, type Hour, type PlaceResponse, type RawSensor, type Sensors, type SensorPoint, type SensorsResponse } from "./air-types";

// Two sources that complement each other:
//  - CAMS, the Copernicus atmosphere forecast for Europe (0.1°, about 10 km), through the Open-Meteo Air Quality API.
//    It is a model that takes in the official measuring stations, and it can look ahead four days.
//  - sensor.community, about a thousand citizen sensors across Bulgaria, read every 5 minutes. They measure the street
//    you live on, but they are low-cost: in fog and high humidity they read too high, and some are broken or sit next
//    to a chimney. We drop those (cleanSensors) and use the median of several.
// "Now" is the sensors when there are enough nearby, else the forecast, and the forecast hours are made to agree with
// it (blend), so the card, the hourly chart, the cities and the hub all show the same number.

const CAMS = "https://air-quality-api.open-meteo.com/v1/air-quality";

type CamsJson = { hourly: { time: string[]; pm2_5: (number | null)[]; pm10: (number | null)[] } };

async function fetchCams(lats: number[], lons: number[]): Promise<CamsJson[]> {
  const url = new URL(CAMS);
  url.search = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lons.join(","),
    hourly: "pm2_5,pm10",
    past_days: "1",
    forecast_days: "3",
    timezone: "Europe/Sofia",
    domains: "cams_europe",
  }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`CAMS ${res.status}`);
  const d = (await res.json()) as CamsJson | CamsJson[];
  return Array.isArray(d) ? d : [d];
}

/** "YYYY-MM-DDTHH:00" in Sofia time, the format the forecast uses. */
export function sofiaHourNow() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:00`;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

function hoursOf(j: CamsJson): Hour[] {
  return j.hourly.time.flatMap((time, i) => {
    const pm25 = j.hourly.pm2_5[i];
    const pm10 = j.hourly.pm10[i];
    if (pm25 == null || pm10 == null) return [];
    return [{ time, pm25: r1(pm25), pm10: r1(pm10), band: bandOf(pm25, pm10).key }];
  });
}

/** Highest band in daytime (07:00 to 22:00) for each day from today. */
function daysOf(hours: Hour[], now: string) {
  const out: PlaceResponse["days"] = [];
  for (const h of hours) {
    if (h.time.slice(0, 10) < now.slice(0, 10)) continue;
    const hr = Number(h.time.slice(11, 13));
    if (hr < 7 || hr > 21) continue;
    const date = h.time.slice(0, 10);
    let d = out.find((x) => x.date === date);
    if (!d) out.push((d = { date, band: h.band, pm25: h.pm25 }));
    if (BANDS.findIndex((b) => b.key === h.band) > BANDS.findIndex((b) => b.key === d!.band)) d.band = h.band;
    d.pm25 = Math.max(d.pm25, h.pm25);
  }
  return out.slice(0, 3);
}

/** The forecast at one place. Rounded to about 1 km before it gets here; CAMS refreshes every few hours. */
async function placeForecast(lat: number, lon: number) {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 12 * 3600 });
  const [j] = await fetchCams([lat], [lon]);
  return hoursOf(j);
}

// ---------------------------------------------------------------------------------------------
// Citizen sensors

type ScEntry = {
  timestamp: string;
  location: { id: number; latitude: string; longitude: string; indoor: number };
  sensordatavalues: { value_type: string; value: string }[];
};

export const SENSORS_BACKUP = "sensors";

/** Every outdoor particle sensor in Bulgaria with a reading from the last 30 minutes that we can trust. */
export async function getLiveSensors(): Promise<SensorsResponse> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
  const res = await fetch("https://data.sensor.community/airrohr/v1/filter/country=BG", {
    headers: { "user-agent": userAgent("air") },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`sensor.community ${res.status}`);
  const all = (await res.json()) as ScEntry[];
  const now = Date.now();
  const ageOf = (e: ScEntry) => Math.round((now - Date.parse(e.timestamp.replace(" ", "T") + "Z")) / 60000);
  // A station sends its particle sensor and its humidity sensor as separate entries with the same location id.
  const rh = new Map<number, number>();
  for (const e of all) {
    const h = Number(e.sensordatavalues.find((x) => x.value_type === "humidity")?.value);
    if (h >= 0 && h <= 100 && ageOf(e) <= 30) rh.set(e.location.id, h);
  }
  const byPlace = new Map<string, RawSensor>();
  for (const e of all) {
    if (e.location.indoor) continue;
    const v = (k: string) => Number(e.sensordatavalues.find((x) => x.value_type === k)?.value);
    const pm10 = v("P1");
    const pm25 = v("P2");
    if (!Number.isFinite(pm25) || !Number.isFinite(pm10)) continue;
    const age = ageOf(e);
    if (!(age >= 0 && age <= 30)) continue;
    const lat = Number(e.location.latitude);
    const lon = Number(e.location.longitude);
    if (!(lat > 41 && lat < 44.5 && lon > 22 && lon < 29)) continue;
    // One reading per location (a station can list the same sensor twice): keep the newest.
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const prev = byPlace.get(key);
    if (!prev || age < prev.age)
      byPlace.set(key, { lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000, pm25: r1(pm25), pm10: r1(pm10), age, rh: rh.get(e.location.id) ?? null });
  }
  const { sensors, humid, odd } = cleanSensors([...byPlace.values()]);
  // In thick fog most sensors are left out; that is correct, and the forecast takes over.
  if (sensors.length + humid < 20) throw new Error(`sensor.community: only ${sensors.length} sensors`);
  return { sensors, hidden: { humid, odd }, updated: new Date().toISOString() };
}

export async function getSensors(): Promise<SensorsResponse> {
  try {
    return await getLiveSensors();
  } catch (e) {
    const saved = await loadBackup<SensorsResponse>(SENSORS_BACKUP);
    if (!saved) throw e;
    console.error("sensors: serving backup from", saved.saved, e);
    return { ...saved.data, backupFrom: saved.saved };
  }
}

/** Median of the sensors near a place: within 3 km if at least 3 are there, else within 8 km. */
export function sensorsNear(all: SensorPoint[], lat: number, lon: number, updated: string): Sensors | null {
  for (const km of [3, 8]) {
    const near = all.filter((s) => distanceKm(lat, lon, s[0], s[1]) <= km);
    if (near.length >= 3) {
      const pm25 = median(near.map((s) => s[2]));
      const pm10 = median(near.map((s) => s[3]));
      const newestAge = Math.min(...near.map((s) => s[4]));
      return {
        pm25: pm25 == null ? null : r1(pm25),
        pm10: pm10 == null ? null : r1(pm10),
        band: bandOf(pm25, pm10).key,
        count: near.length,
        km,
        newest: new Date(Date.parse(updated) - newestAge * 60000).toISOString(),
      };
    }
  }
  return null;
}

/** Everything the Today screen needs for one place. */
export async function getPlace(lat: number, lon: number): Promise<PlaceResponse> {
  const [fc, sensors] = await Promise.allSettled([placeForecast(lat, lon), getSensors()]);
  if (fc.status === "rejected" && sensors.status === "rejected") throw fc.reason;
  if (fc.status === "rejected") console.error("place forecast failed", fc.reason);
  if (sensors.status === "rejected") console.error("place sensors failed", sensors.reason);
  const now = sofiaHourNow();
  const all = fc.status === "fulfilled" ? fc.value : [];
  const s = sensors.status === "fulfilled" ? sensors.value : null;
  const measured = s ? sensorsNear(s.sensors, lat, lon, s.updated) : null;
  const ahead = blend(
    all.filter((h) => h.time >= now),
    measured,
  );
  const { best, worst } = windows(ahead, now);
  return {
    now: ahead[0] ?? null,
    hours: ahead.slice(0, 48),
    best,
    worst,
    days: daysOf([...all.filter((h) => h.time < now), ...ahead], now),
    sensors: measured,
    updated: new Date().toISOString(),
    backupFrom: s?.backupFrom,
  };
}

// ---------------------------------------------------------------------------------------------
// The country: the 28 oblast centres in one request.

export const CITIES_BACKUP = "cities";

/** The forecast for every oblast centre, as CAMS gives it (cached; this is what the backup keeps). */
type CitiesForecast = { cities: { name: string; lat: number; lon: number; hours: Hour[] }[]; updated: string; backupFrom?: string };

export async function getLiveCities(): Promise<CitiesForecast> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 12 * 3600 });
  const js = await fetchCams(
    PLACES.map((p) => p.lat),
    PLACES.map((p) => p.lon),
  );
  if (js.length !== PLACES.length) throw new Error("CAMS: wrong number of points");
  return { cities: PLACES.map((p, i) => ({ name: p.name, lat: p.lat, lon: p.lon, hours: hoursOf(js[i]) })), updated: new Date().toISOString() };
}

/** Each oblast centre now and today, worked out the same way as a place (sensors when there are enough, blended forecast). */
export async function getCities(): Promise<CitiesResponse> {
  let fc: CitiesForecast;
  try {
    fc = await getLiveCities();
  } catch (e) {
    const saved = await loadBackup<CitiesForecast>(CITIES_BACKUP);
    if (!saved || !saved.data.cities[0]?.hours) throw e;
    console.error("cities: serving backup from", saved.saved, e);
    fc = { ...saved.data, backupFrom: saved.saved };
  }
  const s = await getSensors().catch(() => null);
  const now = sofiaHourNow();
  const cities = fc.cities.map((c) => {
    const measured = s ? sensorsNear(s.sensors, c.lat, c.lon, s.updated) : null;
    const ahead = blend(
      c.hours.filter((h) => h.time >= now),
      measured,
    );
    const today = daysOf([...c.hours.filter((h) => h.time < now), ...ahead], now)[0];
    return { name: c.name, lat: c.lat, lon: c.lon, now: ahead[0] ?? null, dayMax: today?.band ?? "good", dayPm25: today?.pm25 ?? 0, sensors: measured?.count ?? 0 };
  });
  return { cities, updated: fc.updated, backupFrom: fc.backupFrom };
}
