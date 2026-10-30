// River flood danger, shared by the server (forecasts, alerts) and the browser (cards, map, charts).
// No server imports here.
//
// The scale follows GloFAS, the Copernicus global flood forecast that the numbers come from:
//   - three thresholds per river: the daily flow expected once in 2, 5 and 20 years (scripts/gauges.mjs fits them
//     to 40 years of the river's own flow);
//   - a day reaches a threshold when more than 30% of the 51 forecast runs (the ensemble) go over it. ECMWF colours
//     its GloFAS reporting points by the same 30% rule.
// Below the 2-year flow we add one step GloFAS does not have: "higher than usual for this time of year" (over the
// 90th percentile of that calendar month), so a rising winter river is visible before it is a flood.

export type Basin = "dunav" | "cherno" | "iztok" | "zapad";

export type Gauge = {
  id: string;
  river: { bg: string; en: string };
  place: { bg: string; en: string };
  basin: Basin;
  lat: number;
  lon: number;
  /** Long-term mean flow, m³/s. */
  mean: number;
  q2: number;
  q5: number;
  q20: number;
  /** Median and 90th percentile of daily flow for each calendar month, January first. */
  normal: number[];
  high: number[];
  records: { date: string; q: number }[];
  years: string;
};

export type LevelKey = "low" | "moderate" | "high" | "veryhigh" | "extreme";

export type Level = {
  key: LevelKey;
  index: number;
  color: string; // CSS var
  hex: string; // for images
  onColor: string;
  bg: { label: string; meaning: string; advice: string };
  en: { label: string; meaning: string; advice: string };
};

export const LEVELS: Level[] = [
  {
    key: "low",
    index: 0,
    color: "var(--d-low)",
    hex: "#2a6a9a",
    onColor: "#ffffff",
    bg: {
      label: "Ниска",
      meaning: "Реката е в обичайните си граници за сезона.",
      advice: "Не паркирайте и не лагерувайте в сухи речни корита и под мостове. Водата там се качва за минути при пороен дъжд.",
    },
    en: {
      label: "Low",
      meaning: "The river is within its usual range for the season.",
      advice: "Don't park or camp in dry river beds or under bridges. Water there can rise within minutes in a downpour.",
    },
  },
  {
    key: "moderate",
    index: 1,
    color: "var(--d-moderate)",
    hex: "#e3b021",
    onColor: "#1b1b1b",
    bg: {
      label: "Умерена",
      meaning: "Реката е по-пълноводна от обичайното за сезона, но остава в коритото си.",
      advice: "Следете прогнозата и предупрежденията. Не влизайте във водата и дръжте децата далеч от брега.",
    },
    en: {
      label: "Moderate",
      meaning: "The river is fuller than usual for the season but stays in its bed.",
      advice: "Keep an eye on the forecast and warnings. Stay out of the water and keep children away from the bank.",
    },
  },
  {
    key: "high",
    index: 2,
    color: "var(--d-high)",
    hex: "#e3741b",
    onColor: "#1b1b1b",
    bg: {
      label: "Висока",
      meaning: "Водата може да излезе от коритото на ниските места: ниви, крайречни пътища и дворове.",
      advice: "Изнесете колата и ценните неща от мазета и ниски места. Не минавайте с кола през вода на пътя.",
    },
    en: {
      label: "High",
      meaning: "Water can leave the river bed in low places: fields, riverside roads and yards.",
      advice: "Move the car and valuables out of basements and low ground. Never drive through water on a road.",
    },
  },
  {
    key: "veryhigh",
    index: 3,
    color: "var(--d-veryhigh)",
    hex: "#c7361f",
    onColor: "#ffffff",
    bg: {
      label: "Много висока",
      meaning: "Възможно е наводнение на ниските части на населените места край реката.",
      advice: "Подгответе раница с документи, лекарства, вода и зарядно. Ако общината или 112 кажат да излезете, тръгнете веднага.",
    },
    en: {
      label: "Very high",
      meaning: "Low parts of towns and villages by the river may flood.",
      advice: "Pack a bag with documents, medicines, water and a charger. If the municipality or 112 tell you to leave, go at once.",
    },
  },
  {
    key: "extreme",
    index: 4,
    color: "var(--d-extreme)",
    hex: "#5b1e6e",
    onColor: "#ffffff",
    bg: {
      label: "Изключителна",
      meaning: "Прогнозата е за вода, каквато тази река има средно веднъж на 20 години или по-рядко.",
      advice: "Стойте далеч от реката и мостовете. Ако водата приижда, качете се на по-висок етаж и звъннете на 112.",
    },
    en: {
      label: "Severe",
      meaning: "The forecast is for water this river sees about once in 20 years or less often.",
      advice: "Stay away from the river and bridges. If water is coming in, go to a higher floor and call 112.",
    },
  },
];

/** "Марица при Пловдив" / "Maritsa at Plovdiv" */
export const gaugeName = (g: Pick<Gauge, "river" | "place">, lang: "bg" | "en") => (lang === "bg" ? `${g.river.bg} при ${g.place.bg}` : `${g.river.en} at ${g.place.en}`);

export const levelByKey = (k: string) => LEVELS.find((l) => l.key === k) ?? LEVELS[0];
export const levelText = (l: Level, lang: "bg" | "en") => l[lang];

/** Share of the 51 runs that must exceed a threshold for the day to reach it (ECMWF's GloFAS rule). */
export const MIN_SHARE = 0.3;

export type Thresholds = { q2: number; q5: number; q20: number; high: number[]; normal: number[] };

export type Day = {
  date: string;
  /** Median of the runs and the spread: half of them between p25 and p75, all between min and max. */
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  /** Share of runs above each threshold (0 to 1). */
  above: { high: number; q2: number; q5: number; q20: number };
  level: LevelKey;
};

export type RiverForecast = {
  lat: number;
  lon: number;
  /** Modelled flow for the past 30 days, as GloFAS saw it. */
  past: { date: string; q: number }[];
  days: Day[];
  thresholds: Thresholds;
  /** The highest level within the next 15 days, and the first day it is reached. */
  peak: { level: LevelKey; date: string };
  updated: string;
};

/** The level a day reaches from the share of runs over each threshold. */
export function dayLevel(above: Day["above"]): LevelKey {
  if (above.q20 > MIN_SHARE) return "extreme";
  if (above.q5 > MIN_SHARE) return "veryhigh";
  if (above.q2 > MIN_SHARE) return "high";
  if (above.high > MIN_SHARE) return "moderate";
  return "low";
}

/** Highest level over the first `n` days, with the first day it is reached. */
export function peakOf(days: Day[], n = 15): { level: LevelKey; date: string } {
  let best = days[0];
  for (const d of days.slice(0, n)) if (levelByKey(d.level).index > levelByKey(best.level).index) best = d;
  return { level: best?.level ?? "low", date: best?.date ?? "" };
}

export type GaugeStatus = {
  id: string;
  /** Today's modelled flow, the level today and the highest level within 15 days. */
  q: number;
  level: LevelKey;
  peak: { level: LevelKey; date: string };
  /** Flow compared with the median for this month: 1 = normal, 2 = twice the usual. */
  vsNormal: number;
  /** Rising, falling or steady over the next 3 days (median of the runs). */
  trend: "up" | "down" | "flat";
};

export type GaugesResponse = { gauges: GaugeStatus[]; updated: string; backupFrom?: string };

/** River points this close to a place count as its rivers. */
export const NEAR_KM = 25;

export type PlaceResponse = {
  /** The river point within NEAR_KM in the worst state, with its full forecast; null when there is none nearby. */
  river: (RiverForecast & { gauge: string; km: number; mean: number; records: { date: string; q: number }[] }) | null;
  /** The other river points within NEAR_KM. */
  others: (GaugeStatus & { km: number })[];
  /** Set when GloFAS did not answer (as opposed to "no river point nearby"). */
  riverFailed?: boolean;
  weather: Weather | null;
  backupFrom?: string;
  updated: string;
};

export type WeatherDay = { date: string; rain: number; snow: number; precip: number; tmax: number; tmin: number; snowDepth: number | null };

export type Weather = {
  /** Rain and melted snow in the last 3 days, mm: wet ground runs off faster. */
  past3: number;
  days: WeatherDay[];
  /** Snow on the ground now, cm. */
  snowNow: number;
  /** Days with at least 5 mm of rain falling on snow and temperatures above zero: the classic winter flood mix. */
  rainOnSnow: string[];
};

export type DanubeStation = { name: string; km: number; level: number | null; flow: number | null; change: number | null; temp: number | null };
export type DanubeForecast = { name: string; days: { date: string; level: number; min: number; max: number }[] };
export type DanubeResponse = { date: string; stations: DanubeStation[]; forecast: DanubeForecast[]; updated: string; backupFrom?: string };

export const BASINS: Record<Basin, { bg: string; en: string }> = {
  dunav: { bg: "Дунавски район", en: "Danube region" },
  cherno: { bg: "Черноморски район", en: "Black Sea region" },
  iztok: { bg: "Източнобеломорски район", en: "East Aegean region" },
  zapad: { bg: "Западнобеломорски район", en: "West Aegean region" },
};

/** MeteoAlarm warning types that matter for floods, most direct first. */
export const FLOOD_WARNINGS = ["flooding", "rain-flood", "rain", "snow-ice", "coastalevent", "thunderstorm"];
