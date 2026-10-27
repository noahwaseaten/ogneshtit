import { cacheLife } from "next/cache";
import { inBulgaria } from "./geo";
import { loadBackup } from "./backup";
import { getPasses } from "./passes";
import { DATA_DELAY_MIN, SHARP_ANGLE, type Pass } from "./pass-types";

// Satellite fires, made trustworthy.
//
// Raw data: NASA FIRMS hotspots from five satellites (VIIRS on Suomi NPP, NOAA-20 and NOAA-21; MODIS on Terra
// and Aqua). A hotspot is one pixel (375 m for VIIRS, 1 km for MODIS) that was hotter than its surroundings
// when a satellite passed. On its own that is weak evidence, so the raw pixels are turned into fires:
//
// 1. Pixels within ~1.2 km of each other are one fire. One fire seen by three satellites is one fire, not three.
// 2. Each fire counts its separate sightings (satellite passes). Two or more = confirmed.
// 3. A single low-confidence pixel is "weak" (sun glint, hot roofs, small agricultural burns).
// 4. A spot that has lit up on many separate days in the last two weeks is a permanent heat source
//    (a smelter, power plant, refinery or landfill), not a wildfire. Example: the copper smelter near Pirdop.
// 5. If a later satellite pass went over Bulgaria and did not see the fire again, it may be out (or hidden
//    by cloud); the app says so instead of showing it as burning. A pass counts when it found heat anywhere
//    in the region, or when its orbit says it looked at Bulgaria and its data should be in by now (passes.ts).
//
// Sources, in order: FIRMS API with our free key → FIRMS public 24 h files (no key, different servers) →
// the last good copy saved in Vercel Blob by the cron job. Each satellite feed can fail on its own.

import type { Confidence, Detection, Fire, FireStatus, FiresResponse, Sat } from "./fire-types";
export * from "./fire-types";

const FEEDS: { id: string; sat: Sat; open: string }[] = [
  { id: "VIIRS_SNPP_NRT", sat: "SNPP", open: "suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Europe_24h.csv" },
  { id: "VIIRS_NOAA20_NRT", sat: "NOAA-20", open: "noaa-20-viirs-c2/csv/J1_VIIRS_C2_Europe_24h.csv" },
  { id: "VIIRS_NOAA21_NRT", sat: "NOAA-21", open: "noaa-21-viirs-c2/csv/J2_VIIRS_C2_Europe_24h.csv" },
  { id: "MODIS_NRT", sat: "Terra", open: "modis-c6.1/csv/MODIS_C6_1_Europe_24h.csv" }, // MODIS rows say T or A
];
const VIIRS: Sat[] = ["SNPP", "NOAA-20", "NOAA-21"];

// Bulgaria plus its neighbours: the extra area only tells us when satellites passed (their swath is ~3000 km,
// so a pass that saw anything nearby also looked at Bulgaria).
const REGION = "19,39,30,46";
const HOURS = 48;

const MAX_GAP_KM = 1.2; // pixels closer than this are one fire
const PASS_GAP_MIN = 20; // detections by one satellite within this many minutes are one pass
const STATIC_KM = 1.0;

// ---------------------------------------------------------------------------------------------
// Parsing

/** One FIRMS CSV. Anything that is not a CSV with coordinates (an error page, "Invalid MAP_KEY") throws. */
export function parseCsv(text: string, feedSat: Sat): Detection[] {
  const lines = text.trim().split(/\r?\n/);
  const head = (lines[0] ?? "").split(",");
  const col = (n: string) => head.indexOf(n);
  const iLat = col("latitude");
  const iLon = col("longitude");
  if (iLat < 0 || iLon < 0) throw new Error(`FIRMS: not a CSV (${(lines[0] ?? "").slice(0, 80)})`);
  const [iDate, iTime, iSat, iConf, iFrp, iDn] = ["acq_date", "acq_time", "satellite", "confidence", "frp", "daynight"].map(col);
  const now = Date.now();
  const out: Detection[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const lat = Number(c[iLat]);
    const lon = Number(c[iLon]);
    const date = c[iDate] ?? "";
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const t = (c[iTime] ?? "").trim().padStart(4, "0");
    if (!/^\d{4}$/.test(t)) continue;
    const time = `${date}T${t.slice(0, 2)}:${t.slice(2)}:00Z`;
    const ms = Date.parse(time);
    if (!Number.isFinite(ms) || ms > now + 3600e3) continue; // broken or from the future
    const raw = (c[iConf] ?? "").trim().toLowerCase();
    // VIIRS: l / n / h. MODIS: 0 to 100.
    const conf: Confidence = /^\d+$/.test(raw)
      ? Number(raw) >= 80
        ? "high"
        : Number(raw) >= 30
          ? "nominal"
          : "low"
      : raw.startsWith("h")
        ? "high"
        : raw.startsWith("l")
          ? "low"
          : "nominal";
    const s = (c[iSat] ?? "").trim();
    const sat: Sat = feedSat === "Terra" ? (s.startsWith("A") ? "Aqua" : "Terra") : feedSat;
    const frp = Number(c[iFrp]);
    out.push({ lat, lon, time, sat, conf, frp: Number.isFinite(frp) && frp > 0 ? frp : 0, night: (c[iDn] ?? "").trim() === "N" });
  }
  return out;
}

const keyOf = (d: Detection) => `${d.sat}|${d.time}|${d.lat.toFixed(4)}|${d.lon.toFixed(4)}`;
const dedupe = (ds: Detection[]) => [...new Map(ds.map((d) => [keyOf(d), d])).values()];

// ---------------------------------------------------------------------------------------------
// Fetching

const FIRMS = "https://firms.modaps.eosdis.nasa.gov";

async function fetchCsv(url: string, sat: Sat): Promise<Detection[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`FIRMS ${res.status}`);
  return parseCsv(await res.text(), sat);
}

/** Latest 2 days from every feed. Returns what worked and which feeds failed. */
async function fetchRecent(): Promise<{ detections: Detection[]; failed: Sat[]; source: FiresResponse["source"]; hours: number }> {
  const key = process.env.FIRMS_MAP_KEY;
  if (key) {
    const got = await Promise.allSettled(FEEDS.map((f) => fetchCsv(`${FIRMS}/api/area/csv/${key}/${f.id}/${REGION}/2`, f.sat)));
    const failed = FEEDS.filter((_, i) => got[i].status === "rejected").map((f) => f.sat);
    // Usable when at least one VIIRS feed answered (MODIS alone is too coarse to rely on).
    if (got.some((g, i) => g.status === "fulfilled" && FEEDS[i].sat !== "Terra")) {
      return { detections: dedupe(got.flatMap((g) => (g.status === "fulfilled" ? g.value : []))), failed, source: "firms", hours: HOURS };
    }
    console.error("FIRMS API failed, trying the public files", got.map((g) => (g.status === "rejected" ? String(g.reason) : "ok")));
  }
  const got = await Promise.allSettled(FEEDS.map((f) => fetchCsv(`${FIRMS}/data/active_fire/${f.open}`, f.sat)));
  const failed = FEEDS.filter((_, i) => got[i].status === "rejected").map((f) => f.sat);
  if (!got.some((g, i) => g.status === "fulfilled" && FEEDS[i].sat !== "Terra")) throw new Error("FIRMS unavailable");
  const [w, s, e, n] = REGION.split(",").map(Number);
  const detections = dedupe(got.flatMap((g) => (g.status === "fulfilled" ? g.value : []))).filter((d) => d.lon >= w && d.lon <= e && d.lat >= s && d.lat <= n);
  return { detections, failed, source: "firms-open", hours: 24 };
}

const isoDay = (msAgo: number) => new Date(Date.now() - msAgo).toISOString().slice(0, 10);

/**
 * Days 3 to 12 back, VIIRS only, inside Bulgaria: used to recognise spots that light up again and again.
 * Cached for 12 hours. If it fails we simply cannot mark permanent sources this time.
 */
async function getHeatHistory(): Promise<Detection[]> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 43200, expire: 172800 });
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return [];
  const bbox = "22.3,41.2,28.7,44.3";
  const windows = [isoDay(12 * 864e5), isoDay(7 * 864e5)]; // each covers 5 days from its start date
  const got = await Promise.allSettled(
    FEEDS.filter((f) => VIIRS.includes(f.sat)).flatMap((f) => windows.map((d) => fetchCsv(`${FIRMS}/api/area/csv/${key}/${f.id}/${bbox}/5/${d}`, f.sat))),
  );
  return dedupe(got.flatMap((g) => (g.status === "fulfilled" ? g.value : []))).filter((d) => inBulgaria(d.lat, d.lon));
}

// ---------------------------------------------------------------------------------------------
// From pixels to fires

const toRad = (x: number) => (x * Math.PI) / 180;
function km(aLat: number, aLon: number, bLat: number, bLon: number) {
  const x = toRad(bLon - aLon) * Math.cos(toRad((aLat + bLat) / 2));
  const y = toRad(bLat - aLat);
  return Math.hypot(x, y) * 6371;
}

/** Satellite passes: one satellite's detections within PASS_GAP_MIN of each other. Returns pass start times. */
function passesOf(ds: Detection[]) {
  const bySat = new Map<Sat, number[]>();
  for (const d of ds) bySat.set(d.sat, [...(bySat.get(d.sat) ?? []), Date.parse(d.time)]);
  const out: { sat: Sat; t: number }[] = [];
  for (const [sat, ts] of bySat) {
    ts.sort((a, b) => a - b);
    let last = -Infinity;
    for (const t of ts) {
      if (t - last > PASS_GAP_MIN * 60e3) out.push({ sat, t });
      last = t;
    }
  }
  return out;
}

/** Groups pixels that touch (single linkage within MAX_GAP_KM), using a coarse grid so it stays fast. */
function cluster(ds: Detection[]) {
  const parent = ds.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const cell = 0.02; // ~2 km, larger than MAX_GAP_KM, so neighbours are always in adjacent cells
  const grid = new Map<string, number[]>();
  ds.forEach((d, i) => {
    const k = `${Math.floor(d.lat / cell)},${Math.floor(d.lon / cell)}`;
    grid.set(k, [...(grid.get(k) ?? []), i]);
  });
  ds.forEach((d, i) => {
    const gy = Math.floor(d.lat / cell);
    const gx = Math.floor(d.lon / cell);
    for (let y = gy - 1; y <= gy + 1; y++)
      for (let x = gx - 1; x <= gx + 1; x++)
        for (const j of grid.get(`${y},${x}`) ?? [])
          if (j > i && km(d.lat, d.lon, ds[j].lat, ds[j].lon) <= MAX_GAP_KM) parent[find(j)] = find(i);
  });
  const groups = new Map<number, Detection[]>();
  ds.forEach((d, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), d]));
  return [...groups.values()];
}

const RANK: Record<Confidence, number> = { low: 0, nominal: 1, high: 2 };

export function buildFires(
  recent: Detection[],
  history: Detection[],
  now = Date.now(),
  predicted: Pass[] = [],
): { fires: Fire[]; lastPass: string | null; seen: { sat: Sat; t: string }[] } {
  const windowStart = now - HOURS * 3600e3;
  const inWindow = recent.filter((d) => Date.parse(d.time) >= windowStart);
  const seen = passesOf(inWindow);
  // Passes the orbits say looked at Bulgaria sharply and whose data is in by now, even if they found nothing.
  const looked = predicted
    .filter((p) => VIIRS.includes(p.sat) && p.angle <= SHARP_ANGLE && p.peak >= windowStart && p.peak <= now - DATA_DELAY_MIN * 60e3)
    .map((p) => ({ sat: p.sat, t: p.peak }));
  const regionPasses = seen.filter((p) => VIIRS.includes(p.sat));
  const lastPass = inWindow.reduce<number>((m, d) => Math.max(m, Date.parse(d.time)), 0);
  const ours = inWindow.filter((d) => inBulgaria(d.lat, d.lon));

  const fires = cluster(ours).map((px): Fire => {
    const times = px.map((d) => Date.parse(d.time));
    const first = Math.min(...times);
    const last = Math.max(...times);
    const strongest = px.reduce((a, b) => (b.frp > a.frp ? b : a));
    const origin = [...px].sort((a, b) => a.time.localeCompare(b.time) || a.lat - b.lat || a.lon - b.lon)[0];
    // Position: heat-weighted centre of the newest pass, so a moving fire shows where it is now.
    const newest = px.filter((d) => Date.parse(d.time) >= last - PASS_GAP_MIN * 60e3);
    const w = newest.reduce((s, d) => s + Math.max(d.frp, 0.5), 0);
    const lat = newest.reduce((s, d) => s + d.lat * Math.max(d.frp, 0.5), 0) / w;
    const lon = newest.reduce((s, d) => s + d.lon * Math.max(d.frp, 0.5), 0) / w;
    const passes = passesOf(px).length;
    const conf = px.reduce<Confidence>((c, d) => (RANK[d.conf] > RANK[c] ? d.conf : c), "low");

    // Later VIIRS passes that did not see it. Passes within 3 h of each other count once (they look at
    // the same afternoon or night), and we wait 30 min after the last sighting.
    // An orbit-only pass has to be an hour later: another satellite 50 minutes behind can miss a small fire.
    const later = [...regionPasses.filter((p) => p.t > last + 30 * 60e3), ...looked.filter((p) => p.t > last + 60 * 60e3)].map((p) => p.t).sort((a, b) => a - b);
    let missed = 0;
    let prev = -Infinity;
    for (const t of later) {
      if (t - prev > 3 * 3600e3) missed++;
      prev = t;
    }

    // Permanent heat: separate days with heat at this spot in the two weeks before, plus the fire's own days.
    const days = new Set<string>(px.map((d) => d.time.slice(0, 10)));
    for (const h of history) if (km(lat, lon, h.lat, h.lon) <= STATIC_KM) days.add(h.time.slice(0, 10));
    const sorted = [...days].sort();
    const span = sorted.length ? (Date.parse(sorted[sorted.length - 1]) - Date.parse(sorted[0])) / 864e5 + 1 : 0;
    // A real fire burns on consecutive days and moves. Heat that keeps coming back with gaps, on many days,
    // at the same kilometre, is a chimney; so is heat there on more days than a wildfire lasts.
    const isStatic = days.size >= 8 || (days.size >= 4 && span - days.size >= 2);

    const status: FireStatus = isStatic ? "static" : passes >= 2 ? "confirmed" : conf === "low" ? "weak" : "single";
    return {
      // Stable while the fire grows: its first pixel never changes (new pixels are always later).
      id: `${origin.lat.toFixed(3)},${origin.lon.toFixed(3)},${origin.time.slice(0, 13)}`,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      first: new Date(first).toISOString(),
      last: new Date(last).toISOString(),
      frp: Math.round(strongest.frp * 10) / 10,
      pixels: px.length,
      passes,
      sats: [...new Set(px.map((d) => d.sat))],
      conf,
      status,
      missed,
      ...(isStatic ? { days: days.size } : {}),
    };
  });

  fires.sort((a, b) => b.last.localeCompare(a.last));
  return {
    fires,
    lastPass: lastPass ? new Date(lastPass).toISOString() : null,
    seen: seen.map((p) => ({ sat: p.sat, t: new Date(p.t).toISOString() })),
  };
}

// ---------------------------------------------------------------------------------------------

/** Live fires. Cached 15 minutes (FIRMS updates within ~3 hours of each pass). */
async function getLiveFires(): Promise<FiresResponse> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 21600 });
  const [recent, history, orbit] = await Promise.all([
    fetchRecent(),
    getHeatHistory().catch(() => [] as Detection[]),
    getPasses().catch(() => null), // without orbits we only know about passes that found something
  ]);
  const { fires, lastPass, seen } = buildFires(recent.detections, history, Date.now(), orbit?.passes);
  return { fires, lastPass, seen, hours: recent.hours, source: recent.source, failed: recent.failed, updated: new Date().toISOString() };
}

export const FIRES_BACKUP = "fires";

/** Live fires, or the last good copy when NASA does not answer. */
export async function getFires(): Promise<FiresResponse> {
  try {
    return await getLiveFires();
  } catch (e) {
    const saved = await loadBackup<FiresResponse>(FIRES_BACKUP);
    if (!saved) throw e;
    console.error("fires: serving backup from", saved.saved, e);
    return { ...saved.data, source: "backup", backupFrom: saved.saved };
  }
}

export { getLiveFires };
