// EFFIS fire danger classes for the FWI index.
// Source: EFFIS technical background, "Fire danger forecast" table.

export type DangerKey = "low" | "moderate" | "high" | "veryhigh" | "extreme" | "veryextreme";

export type Danger = {
  key: DangerKey;
  index: number; // 0–5, position on the scale
  label: string; // Bulgarian, sentence case
  min: number;
  color: string; // CSS var
  onColor: string; // text colour on top of `color`
  advice: string;
};

export const DANGERS: Danger[] = [
  {
    key: "low",
    index: 0,
    label: "Ниска",
    min: 0,
    color: "var(--d-low)",
    onColor: "#ffffff",
    advice: "Огън сред природата пак само на обозначени места — и гасете го докрай.",
  },
  {
    key: "moderate",
    index: 1,
    label: "Умерена",
    min: 11.2,
    color: "var(--d-moderate)",
    onColor: "#1b1b1b",
    advice: "Не палете огън при вятър. Не оставяйте жар без надзор.",
  },
  {
    key: "high",
    index: 2,
    label: "Висока",
    min: 21.3,
    color: "var(--d-high)",
    onColor: "#1b1b1b",
    advice: "Никакъв огън в и край гората. Фас от кола е достатъчен за пожар.",
  },
  {
    key: "veryhigh",
    index: 3,
    label: "Много висока",
    min: 38,
    color: "var(--d-veryhigh)",
    onColor: "#ffffff",
    advice: "Пожар може да се разрасне за минути. Никакъв открит огън навън.",
  },
  {
    key: "extreme",
    index: 4,
    label: "Екстремна",
    min: 50,
    color: "var(--d-extreme)",
    onColor: "#ffffff",
    advice: "Огън тръгва от искра и бяга бързо. При дим — веднага 112.",
  },
  {
    key: "veryextreme",
    index: 5,
    label: "Изключителна",
    min: 70,
    color: "var(--d-veryextreme)",
    onColor: "#ffffff",
    advice: "Най-високото ниво в Европа. Избягвайте гората. При дим — веднага 112.",
  },
];

export function dangerFor(fwi: number): Danger {
  let d = DANGERS[0];
  for (const c of DANGERS) if (fwi >= c.min) d = c;
  return d;
}
