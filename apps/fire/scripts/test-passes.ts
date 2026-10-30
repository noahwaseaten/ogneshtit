// Checks the satellite pass predictions (src/lib/passes.ts). Run: npm run test:passes
import assert from "node:assert/strict";
import { ORBIT_SEED } from "../src/data/orbits";
import { epochOf, newest, predict } from "../src/lib/passes";
import { buildFires } from "../src/lib/fires";
import { DATA_DELAY_MIN, longestGap, looksOf, stateOf, type Pass } from "../src/lib/pass-types";
import type { Detection, Sat } from "../src/lib/fire-types";

let n = 0;
const test = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log("ok", name);
};

const DAY = Date.parse("2026-10-27T00:00:00Z");
const NOW = DAY + 14 * 3600e3;
const min = (iso: string) => Date.parse(`2026-10-27T${iso}:00Z`);

test("passes match the times NASA recorded fires on 2026-10-27 (within 3 minutes)", () => {
  // Real FIRMS detection times over the Balkans that day, taken from the public 24 h files.
  const real: [Sat, string][] = [
    ["NOAA-21", "00:11"], ["SNPP", "00:48"], ["NOAA-20", "01:07"], ["Terra", "08:03"],
    ["NOAA-20", "10:51"], ["NOAA-21", "11:36"], ["NOAA-20", "12:32"],
  ];
  const { passes } = predict(ORBIT_SEED, DAY - 3600e3, DAY + 24 * 3600e3, NOW);
  for (const [sat, hm] of real) {
    const near = passes.filter((p) => p.sat === sat).map((p) => Math.abs(p.peak - min(hm))).sort((a, b) => a - b)[0];
    assert.ok(near <= 3 * 60e3, `${sat} ${hm}: nearest predicted pass is ${Math.round(near / 6e4)} min away`);
  }
});

test("every satellite passes Bulgaria in a day, and the peak lies inside the pass", () => {
  const { passes, dropped } = predict(ORBIT_SEED, DAY, DAY + 24 * 3600e3, NOW);
  assert.deepEqual(dropped, []);
  for (const sat of Object.keys(ORBIT_SEED) as Sat[]) {
    const mine = passes.filter((p) => p.sat === sat);
    assert.ok(mine.length >= 2 && mine.length <= 8, `${sat} has ${mine.length} passes`);
    for (const p of mine) assert.ok(p.start <= p.peak && p.peak <= p.end && p.angle >= 0 && p.angle <= 56.3);
  }
});

test("elements older than three weeks are left out, the newest set wins", () => {
  const { passes, dropped, age } = predict(ORBIT_SEED, NOW, NOW + 24 * 3600e3, NOW + 30 * 864e5);
  assert.equal(passes.length, 0);
  assert.equal(dropped.length, 5);
  assert.ok(age.SNPP! > 29);
  const old = { ...ORBIT_SEED.SNPP, EPOCH: "2026-10-01T00:00:00.000000" };
  assert.equal(epochOf(newest({ SNPP: old }, ORBIT_SEED).SNPP!), epochOf(ORBIT_SEED.SNPP));
  assert.equal(newest(null, undefined, { Aqua: ORBIT_SEED.Aqua }).SNPP, undefined);
});

const pass = (sat: Sat, hm: string, angle = 20): Pass => ({ sat, start: min(hm) - 240e3, peak: min(hm), end: min(hm) + 240e3, angle });

test("satellites minutes apart are one look; wide-angle looks do not count as sharp", () => {
  const looks = looksOf([pass("SNPP", "12:40"), pass("NOAA-20", "12:20", 50), pass("NOAA-21", "13:30"), pass("Aqua", "03:00", 52)]);
  assert.deepEqual(looks.map((l) => l.passes.length), [1, 2, 1]);
  assert.deepEqual(looks.map((l) => l.sharp), [false, true, true]);
});

test("a look is waiting until its data should be in, then fires or quiet", () => {
  const look = looksOf([pass("NOAA-21", "11:00")])[0];
  const seen = [{ sat: "NOAA-21" as Sat, t: "2026-10-27T11:02:00Z" }];
  assert.equal(stateOf(look, [], min("10:00")), "upcoming");
  assert.equal(stateOf(look, [], min("12:00")), "waiting");
  assert.equal(stateOf(look, seen, min("11:30")), "fires");
  assert.equal(stateOf(look, [], look.t + (DATA_DELAY_MIN + 1) * 60e3), "quiet");
  assert.equal(stateOf(look, [{ sat: "SNPP", t: seen[0].t }], look.t + 4 * 3600e3), "quiet");
});

test("the longest stretch without a sharp look", () => {
  const looks = looksOf([pass("SNPP", "01:00"), pass("SNPP", "02:30"), pass("Terra", "07:00", 50), pass("SNPP", "12:00")]);
  const g = longestGap(looks, min("01:00"), min("14:00"));
  assert.equal(g.from, min("02:30"));
  assert.equal(g.to, min("12:00"));
});

const px = (lat: number, lon: number, t: string, sat: Sat = "NOAA-20"): Detection => ({ lat, lon, time: `2026-10-27T${t}:00Z`, sat, conf: "nominal", frp: 8, night: false });

test("a fire is missed by a later orbit-predicted pass even when nothing else was detected", () => {
  const fire = [px(42.3, 26.0, "08:00")];
  const quiet = [pass("NOAA-21", "10:30")]; // peak 10:30, data due by 13:30
  assert.equal(buildFires(fire, [], min("12:00"), quiet).fires[0].missed, 0, "its data is not due yet");
  assert.equal(buildFires(fire, [], min("14:00"), quiet).fires[0].missed, 1);
  assert.equal(buildFires(fire, [], min("14:00"), [pass("NOAA-21", "10:30", 52)]).fires[0].missed, 0, "wide angle does not count");
  assert.equal(buildFires(fire, [], min("14:00"), [pass("Aqua", "10:30")]).fires[0].missed, 0, "MODIS does not count");
  assert.equal(buildFires(fire, [], min("14:00"), [pass("NOAA-21", "08:40")]).fires[0].missed, 0, "too soon after the sighting");
  assert.equal(buildFires(fire, [], min("14:00")).fires[0].missed, 0);
});

test("passes that found heat are listed for the app", () => {
  const { seen } = buildFires([px(42.3, 26.0, "08:00"), px(42.31, 26.0, "08:05"), px(40.5, 22.0, "12:00", "SNPP")], [], min("14:00"));
  assert.deepEqual(seen.map((s) => `${s.sat} ${s.t.slice(11, 16)}`).sort(), ["NOAA-20 08:00", "SNPP 12:00"]);
});

console.log(`${n} passed`);
