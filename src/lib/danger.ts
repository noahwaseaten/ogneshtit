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
  },
];

export function dangerFor(fwi: number): Danger {
  let d = DANGERS[0];
  for (const c of DANGERS) if (fwi >= c.min) d = c;
  return d;
}

export const dangerByKey = (k: string) => DANGERS.find((d) => d.key === k) ?? DANGERS[0];

/** European Air Quality Index bands (EEA). */
export const AIR_BANDS = [
  { max: 20, label: "Добро", color: "var(--d-low)" },
  { max: 40, label: "Задоволително", color: "#6aa84f" },
  { max: 60, label: "Умерено", color: "var(--d-moderate)" },
  { max: 80, label: "Лошо", color: "var(--d-high)" },
  { max: 100, label: "Много лошо", color: "var(--d-veryhigh)" },
  { max: Infinity, label: "Изключително лошо", color: "var(--d-extreme)" },
];
export const airBand = (aqi: number) => AIR_BANDS.find((b) => aqi <= b.max) ?? AIR_BANDS[AIR_BANDS.length - 1];

const DIRS = ["север", "североизток", "изток", "югоизток", "юг", "югозапад", "запад", "северозапад"];
/** Wind direction (degrees it blows from) as a word: "от северозапад". */
export const windFrom = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const SHORT = ["С", "СИ", "И", "ЮИ", "Ю", "ЮЗ", "З", "СЗ"];
/** Short compass letters for tight spaces: "СЗ". */
export const windShort = (deg: number) => SHORT[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
