// Checks the FWI implementation against the first rows of Van Wagner & Pickett's
// published test data (startup FFMC 85, DMC 6, DC 15; April).
import { runSeries } from "../src/lib/fwi";

const rows = [
  // month, temp, rh, wind, rain → ffmc, dmc, dc, isi, bui, fwi
  { w: [4, 17, 42, 25, 0], expect: [87.7, 8.5, 19.0, 10.9, 8.5, 10.1] },
  { w: [4, 20, 21, 25, 2.4], expect: [86.2, 10.4, 23.6, 8.8, 10.4, 9.3] },
  { w: [4, 8.5, 40, 17, 0], expect: [87.0, 11.8, 26.1, 6.5, 11.7, 7.6] },
];

const series = runSeries(
  rows.map(({ w }, i) => ({ date: `d${i}`, month: w[0], temp: w[1], rh: w[2], wind: w[3], rain: w[4] })),
);

let fail = 0;
series.forEach((d, i) => {
  const got = [d.ffmc, d.dmc, d.dc, d.isi, d.bui, d.fwi].map((x) => Math.round(x * 10) / 10);
  const exp = rows[i].expect;
  const ok = got.every((g, j) => Math.abs(g - exp[j]) <= 0.15);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", "got", got.join(" "), "expected", exp.join(" "));
});
process.exit(fail ? 1 : 0);
