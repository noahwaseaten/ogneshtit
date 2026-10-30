import { quantile, roundQ } from "./stats";
import { dayLevel, type Day, type Thresholds } from "./flood-types";

/** Open-Meteo's daily block: dates plus one series per run ("river_discharge", "river_discharge_member01" …). */
export type Daily = Record<string, (number | null)[]> & { time: string[] };

const RUNS = 51;

/** Summarises the runs day by day against a river's thresholds. */
export function summarize(daily: Daily, t: Thresholds): Day[] {
  const keys = Object.keys(daily).filter((k) => k.startsWith("river_discharge"));
  const out: Day[] = [];
  daily.time.forEach((date, i) => {
    const runs = keys.map((k) => daily[k][i]).filter((v): v is number => v != null);
    if (runs.length < RUNS / 2) return;
    const share = (x: number) => runs.filter((v) => v > x).length / runs.length;
    const above = { high: share(t.high[Number(date.slice(5, 7)) - 1]), q2: share(t.q2), q5: share(t.q5), q20: share(t.q20) };
    out.push({
      date,
      median: roundQ(quantile(runs, 0.5)),
      p25: roundQ(quantile(runs, 0.25)),
      p75: roundQ(quantile(runs, 0.75)),
      min: roundQ(Math.min(...runs)),
      max: roundQ(Math.max(...runs)),
      above,
      level: dayLevel(above),
    });
  });
  return out;
}
