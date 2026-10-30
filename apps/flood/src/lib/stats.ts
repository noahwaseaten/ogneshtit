// Statistics for river flow. Used by scripts/gauges.ts (fixed river points) and by the live lookup for any place.

/** Linear-interpolated quantile, q in 0..1. */
export function quantile(xs: number[], q: number) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

/**
 * Gumbel (extreme value type I) fitted by the method of moments to yearly peaks. Returns the flow expected to be
 * reached or passed once in T years on average: Q(T) = u − α·ln(−ln(1 − 1/T)), with α = s·√6/π and u = mean − 0.5772·α.
 */
export function gumbel(peaks: number[]) {
  const n = peaks.length;
  const mean = peaks.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(peaks.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
  const alpha = (sd * Math.sqrt(6)) / Math.PI;
  const u = mean - 0.5772 * alpha;
  return (T: number) => u - alpha * Math.log(-Math.log(1 - 1 / T));
}

/** Rounds a flow to a sensible number of digits for its size. */
export const roundQ = (x: number) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100);

export type FlowStats = {
  mean: number;
  q2: number;
  q5: number;
  q20: number;
  normal: number[];
  high: number[];
  records: { date: string; q: number }[];
  years: string;
};

/** Everything the app needs to judge a river, from its daily flow history (complete years only for the peaks). */
export function flowStats(time: string[], q: (number | null)[]): FlowStats {
  const byYear = new Map<number, { v: number; day: string; days: number }>();
  const byMonth: number[][] = Array.from({ length: 12 }, () => []);
  let sum = 0;
  let n = 0;
  time.forEach((day, i) => {
    const v = q[i];
    if (v == null) return;
    const y = Number(day.slice(0, 4));
    const prev = byYear.get(y);
    if (!prev) byYear.set(y, { v, day, days: 1 });
    else {
      prev.days++;
      if (v > prev.v) Object.assign(prev, { v, day });
    }
    byMonth[Number(day.slice(5, 7)) - 1].push(v);
    sum += v;
    n++;
  });
  const years = [...byYear.entries()].filter(([, x]) => x.days >= 360).sort(([a], [b]) => a - b);
  const g = gumbel(years.map(([, x]) => x.v));
  return {
    mean: roundQ(sum / n),
    q2: roundQ(g(2)),
    q5: roundQ(g(5)),
    q20: roundQ(g(20)),
    normal: byMonth.map((m) => roundQ(quantile(m, 0.5))),
    high: byMonth.map((m) => roundQ(quantile(m, 0.9))),
    records: years
      .map(([, x]) => ({ date: x.day, q: roundQ(x.v) }))
      .sort((a, b) => b.q - a.q)
      .slice(0, 3),
    years: years.length ? `${years[0][0]}-${years[years.length - 1][0]}` : "",
  };
}
