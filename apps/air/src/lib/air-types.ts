// Air quality bands and advice, shared by the server (forecast, sensors, alerts) and the browser. No server imports.
//
// The scale is the European Air Quality Index of the European Environment Agency (EEA), in its current form with
// hourly concentrations. We rate particles only (PM2.5 and PM10): in a Bulgarian winter they are the pollutant that
// matters, coming mostly from household heating (EEA country profile for Bulgaria). A place takes the worse of its two
// particle bands. Health advice is the EEA's own, for everyone and for sensitive people (children, older people,
// people with asthma, heart or lung disease), in plain words.
// Source: https://airindex.eea.europa.eu/AQI/index.html

import { distanceKm } from "@shtit/core/geo";

export type BandKey = "good" | "fair" | "moderate" | "poor" | "verypoor" | "extreme";

export type Band = {
  key: BandKey;
  index: number;
  /** Upper limits of the band, µg/m³ hourly. */
  pm25: number;
  pm10: number;
  color: string; // CSS var
  hex: string; // EEA colour, for images
  onColor: string;
  bg: { label: string; everyone: string; sensitive: string };
  en: { label: string; everyone: string; sensitive: string };
};

export const BANDS: Band[] = [
  {
    key: "good",
    index: 0,
    pm25: 5,
    pm10: 15,
    color: "var(--b-good)",
    hex: "#50f0e6",
    onColor: "#0b2a2c",
    bg: { label: "Добро", everyone: "Въздухът е чист. Правете всичко навън както обикновено.", sensitive: "Въздухът е чист. Правете всичко навън както обикновено." },
    en: { label: "Good", everyone: "The air is clean. Enjoy your usual outdoor activities.", sensitive: "The air is clean. Enjoy your usual outdoor activities." },
  },
  {
    key: "fair",
    index: 1,
    pm25: 15,
    pm10: 45,
    color: "var(--b-fair)",
    hex: "#50ccaa",
    onColor: "#0b2a22",
    bg: { label: "Задоволително", everyone: "Можете да правите всичко навън както обикновено.", sensitive: "Можете да правите всичко навън както обикновено." },
    en: { label: "Fair", everyone: "Enjoy your usual outdoor activities.", sensitive: "Enjoy your usual outdoor activities." },
  },
  {
    key: "moderate",
    index: 2,
    pm25: 50,
    pm10: 120,
    color: "var(--b-moderate)",
    hex: "#f0e641",
    onColor: "#2a2600",
    bg: {
      label: "Умерено",
      everyone: "Можете да правите всичко навън както обикновено.",
      sensitive: "Ако усетите кашлица, дразнене в очите или гърлото, намалете усилените занимания навън.",
    },
    en: {
      label: "Moderate",
      everyone: "Enjoy your usual outdoor activities.",
      sensitive: "If you get symptoms, cut down on hard exercise outdoors.",
    },
  },
  {
    key: "poor",
    index: 3,
    pm25: 90,
    pm10: 195,
    color: "var(--b-poor)",
    hex: "#ff5050",
    onColor: "#2b0505",
    bg: {
      label: "Лошо",
      everyone: "Ако ви смъдят очите, кашляте или ви дращи гърлото, намалете усилените занимания навън.",
      sensitive: "Намалете движението навън, особено ако имате оплаквания.",
    },
    en: {
      label: "Poor",
      everyone: "If your eyes sting or you cough or have a sore throat, cut down on hard exercise outdoors.",
      sensitive: "Cut down on physical activity outdoors, especially if you have symptoms.",
    },
  },
  {
    key: "verypoor",
    index: 4,
    pm25: 140,
    pm10: 270,
    color: "var(--b-verypoor)",
    hex: "#960032",
    onColor: "#ffffff",
    bg: {
      label: "Много лошо",
      everyone: "Ако ви смъдят очите, кашляте или ви дращи гърлото, намалете усилените занимания навън.",
      sensitive: "Намалете движението, особено навън, и повече ако имате оплаквания.",
    },
    en: {
      label: "Very poor",
      everyone: "If your eyes sting or you cough or have a sore throat, cut down on hard exercise outdoors.",
      sensitive: "Reduce physical activity, especially outdoors, more so if you have symptoms.",
    },
  },
  {
    key: "extreme",
    index: 5,
    pm25: Infinity,
    pm10: Infinity,
    color: "var(--b-extreme)",
    hex: "#7d2181",
    onColor: "#ffffff",
    bg: { label: "Изключително лошо", everyone: "Намалете движението навън.", sensitive: "Избягвайте движението навън." },
    en: { label: "Extremely poor", everyone: "Reduce physical activity outdoors.", sensitive: "Avoid physical activity outdoors." },
  },
];

export const bandByKey = (k: string) => BANDS.find((b) => b.key === k) ?? BANDS[0];
export const bandText = (b: Band, lang: "bg" | "en") => b[lang];
/** "Добро качество на въздуха", worded like the other apps' "Ниска опасност от ..." headlines. */
export const airHeadline = (b: Band, lang: "bg" | "en") => (lang === "bg" ? `${b.bg.label} качество на въздуха` : `${b.en.label} air quality`);

/** The band for one pollutant's hourly value. Values on a boundary belong to the lower band, as in the EEA table. */
const bandFor = (v: number, limit: (b: Band) => number) => BANDS.find((b) => v <= limit(b) + 0.49) ?? BANDS[BANDS.length - 1];

/** The worse of the PM2.5 and PM10 bands. */
export function bandOf(pm25: number | null, pm10: number | null): Band {
  const a = pm25 == null ? BANDS[0] : bandFor(pm25, (b) => b.pm25);
  const b = pm10 == null ? BANDS[0] : bandFor(pm10, (b) => b.pm10);
  return a.index >= b.index ? a : b;
}

/** Which particle decides the band: "pm25" or "pm10". */
export function leadOf(pm25: number | null, pm10: number | null): "pm25" | "pm10" {
  const a = pm25 == null ? 0 : bandFor(pm25, (b) => b.pm25).index;
  const b = pm10 == null ? 0 : bandFor(pm10, (b) => b.pm10).index;
  return b > a ? "pm10" : "pm25";
}

export type Hour = { time: string; pm25: number; pm10: number; band: BandKey };

/** A stretch of hours: the cleanest one to go out or air the room, or the dirtiest one to keep windows shut. */
export type Window = { start: string; end: string; pm25: number; band: BandKey };

export type Sensors = {
  /** Median of the citizen sensors within `km`, with how many there are and how fresh the newest reading is. */
  pm25: number | null;
  pm10: number | null;
  band: BandKey | null;
  count: number;
  km: number;
  newest: string | null;
};

export type PlaceResponse = {
  now: Hour | null;
  /** Hourly forecast from now, 48 hours (CAMS). */
  hours: Hour[];
  /** Cleanest and dirtiest 3 hours in daytime (07:00 to 22:00) still ahead today, or tomorrow when today is over. */
  best: Window | null;
  worst: Window | null;
  /** Highest band in daytime today and tomorrow. */
  days: { date: string; band: BandKey; pm25: number }[];
  sensors: Sensors | null;
  updated: string;
  backupFrom?: string;
};

/** An oblast centre: `now` is measured when `sensors` (how many nearby) is above 0, else forecast. */
export type City = { name: string; lat: number; lon: number; now: Hour | null; dayMax: BandKey; dayPm25: number; sensors: number };
export type CitiesResponse = { cities: City[]; updated: string; backupFrom?: string };

/** One citizen sensor: [lat, lon, PM2.5, PM10, minutes since the reading]. */
export type SensorPoint = [number, number, number, number, number];
export type SensorsResponse = {
  sensors: SensorPoint[];
  /** Left out: readings taken in air at 90% humidity or more, and readings that cannot be right (see cleanSensors). */
  hidden?: { humid: number; odd: number };
  updated: string;
  backupFrom?: string;
};

/** A reading as it comes in, with the relative humidity from the same station when it has a humidity sensor. */
export type RawSensor = { lat: number; lon: number; pm25: number; pm10: number; age: number; rh: number | null };

/** Above this relative humidity low-cost optical sensors count fog droplets as particles and read far too high. */
export const HUMID = 90;

/**
 * Which citizen readings to trust. Left out:
 *  - stuck or broken: zero, PM2.5 at the sensor's ceiling (999.9) or PM2.5 well above PM10 (impossible, PM2.5 is part of PM10);
 *  - humid: the station's own humidity sensor reads HUMID% or more;
 *  - odd: far above its neighbours within 5 km (more than 3 times their median and 30 µg/m³ over it), or far below
 *    them when they read over 20, or over 250 µg/m³ with fewer than 3 neighbours to check it against. A chimney next to
 *    one sensor is real, but it is not the air of the town.
 */
export function cleanSensors(raw: RawSensor[]): { sensors: SensorPoint[]; humid: number; odd: number } {
  let humid = 0;
  let odd = 0;
  const sane = raw.filter((r) => {
    const ok = r.pm25 > 0 && r.pm25 < 999 && r.pm10 > 0 && r.pm10 < 1999 && r.pm25 <= r.pm10 * 1.1 + 2;
    if (!ok) odd++;
    else if (r.rh != null && r.rh >= HUMID) humid++;
    return ok && !(r.rh != null && r.rh >= HUMID);
  });
  const sensors: SensorPoint[] = [];
  for (const r of sane) {
    const near = sane.filter((o) => o !== r && distanceKm(r.lat, r.lon, o.lat, o.lon) <= 5).map((o) => o.pm25);
    const m = median(near);
    const bad = m == null || near.length < 3 ? r.pm25 > 250 : r.pm25 > Math.max(3 * m, m + 30) || (m > 20 && r.pm25 < m / 4);
    if (bad) odd++;
    else sensors.push([r.lat, r.lon, r.pm25, r.pm10, r.age]);
  }
  return { sensors, humid, odd };
}

/**
 * The forecast from now on, made to agree with what is measured now: the gap between the sensors and the forecast for
 * this hour is carried into the next hours and fades out over 12 hours, after which it is the plain forecast. This
 * way the first hour of the chart is the number on the card, and the hours after it do not jump.
 */
export const BLEND_HOURS = 12;
export function blend(ahead: Hour[], measured: { pm25: number | null; pm10: number | null } | null): Hour[] {
  const h0 = ahead[0];
  if (!h0 || !measured || measured.pm25 == null) return ahead;
  const d25 = measured.pm25 - h0.pm25;
  const d10 = measured.pm10 != null ? measured.pm10 - h0.pm10 : 0;
  return ahead.map((h, k) => {
    const w = Math.max(0, 1 - k / BLEND_HOURS);
    if (!w) return h;
    const pm25 = Math.round(Math.max(0, h.pm25 + d25 * w) * 10) / 10;
    const pm10 = Math.round(Math.max(pm25, h.pm10 + d10 * w) * 10) / 10;
    return { ...h, pm25, pm10, band: bandOf(pm25, pm10).key };
  });
}

export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Cleanest and dirtiest 3-hour stretch in daytime (07:00 to 22:00), from `now` on. If less than 3 daytime hours are
 * left today, tomorrow's daytime is used. Hours are local Sofia time as "YYYY-MM-DDTHH:00".
 */
export function windows(hours: Hour[], now: string): { best: Window | null; worst: Window | null } {
  const day = (t: string) => t.slice(0, 10);
  const hour = (t: string) => Number(t.slice(11, 13));
  const ahead = hours.filter((h) => h.time >= now.slice(0, 13) && hour(h.time) >= 7 && hour(h.time) <= 21);
  const today = ahead.filter((h) => day(h.time) === day(now));
  let pool = today;
  if (today.length < 3) {
    const later = ahead.filter((h) => day(h.time) > day(now));
    pool = later.filter((h) => day(h.time) === day(later[0]?.time ?? ""));
  }
  if (pool.length < 3) return { best: null, worst: null };
  const runs: Window[] = [];
  for (let i = 0; i + 2 < pool.length; i++) {
    const r = pool.slice(i, i + 3);
    // Only stretches of three hours in a row.
    if (hour(r[2].time) - hour(r[0].time) !== 2 || day(r[0].time) !== day(r[2].time)) continue;
    const pm25 = Math.round(((r[0].pm25 + r[1].pm25 + r[2].pm25) / 3) * 10) / 10;
    const worstBand = r.reduce((m, h) => (bandByKey(h.band).index > bandByKey(m).index ? h.band : m), r[0].band);
    runs.push({ start: r[0].time, end: `${r[2].time.slice(0, 11)}${String(hour(r[2].time) + 1).padStart(2, "0")}:00`, pm25, band: worstBand });
  }
  if (!runs.length) return { best: null, worst: null };
  const best = runs.reduce((m, w) => (w.pm25 < m.pm25 ? w : m));
  const worst = runs.reduce((m, w) => (w.pm25 > m.pm25 ? w : m));
  return { best, worst };
}

/** "13:00" from a local Sofia time "YYYY-MM-DDTHH:00" (the forecast's own clock, so no time zone maths). */
export const hhmm = (t: string) => t.slice(11, 16);
