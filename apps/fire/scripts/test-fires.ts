// Checks how raw satellite pixels become fires (src/lib/fires.ts). Run: npm run test:fires
import assert from "node:assert/strict";
import { buildFires, parseCsv, type Detection } from "../src/lib/fires";
import { isCurrent, isReal } from "../src/lib/fire-types";

const NOW = Date.parse("2026-08-10T15:00:00Z");
const at = (h: number) => new Date(NOW - h * 3600e3).toISOString().replace(/\.\d{3}Z$/, "Z");
const px = (lat: number, lon: number, hAgo: number, sat: Detection["sat"] = "NOAA-20", conf: Detection["conf"] = "nominal", frp = 8): Detection => ({
  lat,
  lon,
  time: at(hAgo),
  sat,
  conf,
  frp,
  night: false,
});
// A pass somewhere else in the region (Greece), to tell the code a satellite went over.
const elsewhere = (hAgo: number, sat: Detection["sat"] = "SNPP") => px(40.5, 22.0, hAgo, sat);

let n = 0;
const test = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log("ok", name);
};

test("one fire seen by three satellites is one confirmed fire", () => {
  const { fires } = buildFires(
    [px(42.1, 24.1, 3, "SNPP"), px(42.101, 24.102, 2.5, "NOAA-20"), px(42.1005, 24.099, 2, "NOAA-21"), px(42.102, 24.101, 2, "NOAA-21")],
    [],
    NOW,
  );
  assert.equal(fires.length, 1);
  assert.equal(fires[0].status, "confirmed");
  assert.equal(fires[0].passes, 3);
  assert.equal(fires[0].pixels, 4);
  assert.ok(isCurrent(fires[0], NOW));
});

test("two fires 5 km apart stay separate", () => {
  const { fires } = buildFires([px(42.1, 24.1, 3), px(42.1, 24.16, 3)], [], NOW);
  assert.equal(fires.length, 2);
});

test("a single low-confidence pixel is weak and hidden", () => {
  const { fires } = buildFires([px(42.5, 25.0, 4, "SNPP", "low", 1.2)], [], NOW);
  assert.equal(fires[0].status, "weak");
  assert.equal(isReal(fires[0]), false);
});

test("seen once with normal confidence is real but single", () => {
  const { fires } = buildFires([px(42.5, 25.0, 4)], [], NOW);
  assert.equal(fires[0].status, "single");
  assert.ok(isReal(fires[0]));
});

test("heat at the same spot on many separate days is a permanent source", () => {
  const hist = [3, 4, 6, 8, 9, 11].map((d) => px(42.716, 24.165, d * 24 + 1, "NOAA-20", "nominal", 2));
  const { fires } = buildFires([px(42.7165, 24.1655, 2, "NOAA-20", "nominal", 2)], hist, NOW);
  assert.equal(fires[0].status, "static");
  assert.equal(isReal(fires[0]), false);
});

test("a real fire burning four days in a row is not mistaken for a factory", () => {
  const hist = [2, 3].map((d) => px(41.9, 23.3, d * 24 + 2));
  const { fires } = buildFires([px(41.9, 23.3, 26, "SNPP"), px(41.901, 23.301, 3, "NOAA-20")], hist, NOW);
  assert.equal(fires[0].status, "confirmed");
});

test("a later pass that does not see the fire marks it as missed", () => {
  const { fires } = buildFires([px(42.3, 26.0, 14, "NOAA-20"), elsewhere(2, "SNPP")], [], NOW);
  assert.equal(fires[0].missed, 1);
  assert.equal(isCurrent(fires[0], NOW), false);
});

test("passes in the same afternoon count once, and MODIS passes do not count as misses", () => {
  const { fires } = buildFires([px(42.3, 26.0, 14), elsewhere(3, "SNPP"), elsewhere(2.2, "NOAA-21"), elsewhere(1, "Aqua")], [], NOW);
  assert.equal(fires[0].missed, 1);
});

test("a fire seen on the newest pass is not missed", () => {
  const { fires } = buildFires([px(42.3, 26.0, 2, "NOAA-20"), elsewhere(2.1, "SNPP")], [], NOW);
  assert.equal(fires[0].missed, 0);
});

test("fires outside Bulgaria are left out but still tell us about passes", () => {
  const { fires, lastPass } = buildFires([elsewhere(1)], [], NOW);
  assert.equal(fires.length, 0);
  assert.equal(Date.parse(lastPass!), Date.parse(at(1)));
});

test("detections older than 48 hours are dropped", () => {
  const { fires } = buildFires([px(42.3, 26.0, 50)], [], NOW);
  assert.equal(fires.length, 0);
});

test("the id stays the same when more pixels join later", () => {
  const a = buildFires([px(42.1, 24.1, 5)], [], NOW).fires[0].id;
  const b = buildFires([px(42.1, 24.1, 5), px(42.102, 24.103, 1, "SNPP", "high", 90)], [], NOW).fires[0].id;
  assert.equal(a, b);
});

test("CSV parsing: VIIRS letters, MODIS numbers, broken rows, error pages", () => {
  const viirs = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n42.48787,24.4295,332.93,0.42,0.45,2026-10-27,1051,N20,VIIRS,n,2.0NRT,288.66,3.25,D\nbad,row\n42.4,24.4,1,1,1,2026-10-27,xx,N20,VIIRS,h,2,1,1,D";
  const v = parseCsv(viirs, "NOAA-20");
  assert.equal(v.length, 1);
  assert.equal(v[0].time, "2026-10-27T10:51:00Z");
  assert.equal(v[0].conf, "nominal");
  const modis = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight\n42.1,24.1,320,1,1,2026-10-27,935,A,MODIS,85,6.1NRT,290,40.2,D\n42.2,24.2,320,1,1,2026-10-27,935,T,MODIS,20,6.1NRT,290,4,N";
  const m = parseCsv(modis, "Terra");
  assert.deepEqual(
    m.map((d) => [d.sat, d.conf, d.night]),
    [
      ["Aqua", "high", false],
      ["Terra", "low", true],
    ],
  );
  assert.throws(() => parseCsv("Invalid MAP_KEY.", "SNPP"));
  assert.equal(parseCsv("latitude,longitude,acq_date,acq_time\n", "SNPP").length, 0);
});

console.log(`\n${n} checks passed`);
