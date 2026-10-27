// Fire danger classes for the Canadian Fire Weather Index (FWI), with the thresholds EFFIS uses
// across Europe. Source: EFFIS technical background, "Fire danger forecast".

export type DangerKey = "low" | "moderate" | "high" | "veryhigh" | "extreme" | "veryextreme";

export type Danger = {
  key: DangerKey;
  index: number; // 0 to 5, position on the scale
  label: string;
  min: number;
  color: string; // CSS var
  onColor: string; // text colour on top of `color`
  meaning: string; // what this level means for a fire
  advice: string; // what to do
  en: { label: string; meaning: string; advice: string };
};

export const DANGERS: Danger[] = [
  {
    key: "low",
    index: 0,
    label: "Ниска",
    min: 0,
    color: "var(--d-low)",
    onColor: "#ffffff",
    meaning: "Огън се разпалва трудно и се разпространява бавно.",
    advice: "Палете огън само на обозначените места и го залейте с вода, преди да тръгнете.",
    en: { label: "Low", meaning: "A fire is hard to start and spreads slowly.", advice: "Only light fires in marked places, and put them out with water before you leave." },
  },
  {
    key: "moderate",
    index: 1,
    label: "Умерена",
    min: 11.2,
    color: "var(--d-moderate)",
    onColor: "#1b1b1b",
    meaning: "Сухата трева може да пламне от непогасен огън или фас.",
    advice: "Не палете огън при вятър и не оставяйте жарта без надзор.",
    en: { label: "Moderate", meaning: "Dry grass can catch from an unattended fire or a cigarette end.", advice: "Don't light fires in the wind and never leave embers unwatched." },
  },
  {
    key: "high",
    index: 2,
    label: "Висока",
    min: 21.3,
    color: "var(--d-high)",
    onColor: "#1b1b1b",
    meaning: "Огън пламва лесно и бързо обхваща сухата растителност.",
    advice: "Не палете огън в гората и на по-малко от 100 метра от нея. Не хвърляйте фасове от колата.",
    en: { label: "High", meaning: "Fire starts easily and quickly spreads through dry plants.", advice: "No fires in the forest or within 100 metres of it. Don't throw cigarette ends from the car." },
  },
  {
    key: "veryhigh",
    index: 3,
    label: "Много висока",
    min: 38,
    color: "var(--d-veryhigh)",
    onColor: "#ffffff",
    meaning: "Пожар може да излезе от контрол за няколко минути.",
    advice: "Никакъв открит огън навън, включително барбекю в двор до гора. Ако видите дим, звъннете на 112.",
    en: { label: "Very high", meaning: "A fire can get out of control within minutes.", advice: "No open fire outdoors at all, including a barbecue in a garden next to a forest. If you see smoke, call 112." },
  },
  {
    key: "extreme",
    index: 4,
    label: "Екстремна",
    min: 50,
    color: "var(--d-extreme)",
    onColor: "#ffffff",
    meaning: "Една искра стига за пожар, който се гаси трудно.",
    advice: "Не косете и не режете метал до суха трева. Ако видите дим, звъннете веднага на 112.",
    en: { label: "Extreme", meaning: "One spark is enough for a fire that is hard to put out.", advice: "Don't mow or cut metal near dry grass. If you see smoke, call 112 straight away." },
  },
  {
    key: "veryextreme",
    index: 5,
    label: "Изключителна",
    min: 70,
    color: "var(--d-veryextreme)",
    onColor: "#ffffff",
    meaning: "Най-високото ниво по европейската скала. Пожарите тръгват и се разрастват много бързо.",
    advice: "Не влизайте в гората без нужда. Ако видите дим, звъннете веднага на 112.",
    en: { label: "Exceptional", meaning: "The highest level on the European scale. Fires start and grow very fast.", advice: "Stay out of the forest unless you have to be there. If you see smoke, call 112 straight away." },
  },
];

export function dangerFor(fwi: number): Danger {
  let d = DANGERS[0];
  for (const c of DANGERS) if (fwi >= c.min) d = c;
  return d;
}

export const dangerByKey = (k: string) => DANGERS.find((d) => d.key === k) ?? DANGERS[0];

/** Label, meaning and advice in the given language. */
export const dangerText = (d: Danger, lang: "bg" | "en") => (lang === "bg" ? { label: d.label, meaning: d.meaning, advice: d.advice } : d.en);

/** European Air Quality Index bands (EEA). */
export const AIR_BANDS = [
  { max: 20, label: "Добро", en: "Good", color: "var(--d-low)" },
  { max: 40, label: "Задоволително", en: "Fair", color: "#6aa84f" },
  { max: 60, label: "Умерено", en: "Moderate", color: "var(--d-moderate)" },
  { max: 80, label: "Лошо", en: "Poor", color: "var(--d-high)" },
  { max: 100, label: "Много лошо", en: "Very poor", color: "var(--d-veryhigh)" },
  { max: Infinity, label: "Изключително лошо", en: "Extremely poor", color: "var(--d-extreme)" },
];
export const airBand = (aqi: number) => AIR_BANDS.find((b) => aqi <= b.max) ?? AIR_BANDS[AIR_BANDS.length - 1];

const DIRS = {
  bg: ["север", "североизток", "изток", "югоизток", "юг", "югозапад", "запад", "северозапад"],
  en: ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"],
};
const octant = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 45) % 8;
/** Wind direction (degrees it blows from) as a word: "северозапад" / "northwest". */
export const windFrom = (deg: number, lang: "bg" | "en" = "bg") => DIRS[lang][octant(deg)];

const SHORT = { bg: ["С", "СИ", "И", "ЮИ", "Ю", "ЮЗ", "З", "СЗ"], en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] };
/** Short compass letters for tight spaces: "СЗ" / "NW". */
export const windShort = (deg: number, lang: "bg" | "en" = "bg") => SHORT[lang][octant(deg)];
