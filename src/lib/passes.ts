import { cacheLife } from "next/cache";
import { eciToEcf, ecfToLookAngles, gstime, json2satrec, propagate, type OMMJsonObject } from "satellite.js";
import { ORBIT_SEED } from "@/data/orbits";
import { loadBackup } from "./backup";
import type { Sat } from "./fire-types";
import type { Pass, PassesResponse } from "./pass-types";

// When do the five fire satellites look at Bulgaria?
//
// Each satellite follows a path that repeats every day, so its passes can be calculated ahead of time from its
// orbit elements (published by CelesTrak from US Space Force tracking). The calculation is SGP4, the standard
// model for these elements: it gives where the satellite is at any minute, and from that how far from straight
// below it Bulgaria lies. A satellite sees Bulgaria while that angle is under its scan limit (VIIRS 56.3°,
// MODIS 55°). The middle of that stretch is the pass.
//
// Orbit elements come from CelesTrak, then the copy in Vercel Blob, then the copy shipped in the repo
// (src/data/orbits.ts). The newest of those wins for each satellite. Elements get less exact as they age
// (a minute or two off after about a week), so satellites with elements older than MAX_AGE_DAYS are left out.

export const NORAD: Record<Sat, number> = { SNPP: 37849, "NOAA-20": 43013, "NOAA-21": 54234, Terra: 25994, Aqua: 27424 };
const SATS = Object.keys(NORAD) as Sat[];
/** Furthest the scanner looks to the side, degrees from straight down. */
const SCAN: Record<Sat, number> = { SNPP: 56.28, "NOAA-20": 56.28, "NOAA-21": 56.28, Terra: 55, Aqua: 55 };

/** Middle of Bulgaria. Its swath is ~3000 km wide, so the whole country is looked at when this point is. */
const TARGET = { latitude: (42.75 * Math.PI) / 180, longitude: (25.2 * Math.PI) / 180, height: 0.4 };
const EARTH_KM = 6371;
const STEP = 30e3;
export const MAX_AGE_DAYS = 21;
export const ORBITS_BACKUP = "orbits";

export type Elements = Partial<Record<Sat, OMMJsonObject>>;

// ---------------------------------------------------------------------------------------------
// Maths

/** Degrees away from straight below the satellite at which `at` sees the target; null when it cannot be worked out. */
export function offNadir(rec: ReturnType<typeof json2satrec>, at: number, target = TARGET): number | null {
  const date = new Date(at);
  const pv = propagate(rec, date);
  if (!pv || !pv.position) return null;
  const ecf = eciToEcf(pv.position, gstime(date));
  const { elevation } = ecfToLookAngles(target, ecf);
  const r = Math.hypot(ecf.x, ecf.y, ecf.z);
  const s = (EARTH_KM / r) * Math.cos(elevation);
  // Below the horizon the target is not visible at all.
  return elevation < 0 ? 90 : (Math.asin(Math.min(1, s)) * 180) / Math.PI;
}

/** All passes of one satellite over Bulgaria between `from` and `to` (epoch ms). */
export function passesOf(sat: Sat, el: OMMJsonObject, from: number, to: number): Pass[] {
  const rec = json2satrec(el);
  const limit = SCAN[sat];
  const out: Pass[] = [];
  let open: { start: number; best: number; at: number } | null = null;
  for (let t = from; t <= to; t += STEP) {
    const a = offNadir(rec, t);
    if (a !== null && a <= limit) {
      if (!open) open = { start: t, best: a, at: t };
      else if (a < open.best) {
        open.best = a;
        open.at = t;
      }
    } else if (open) {
      out.push(finish(sat, rec, open, t));
      open = null;
    }
  }
  if (open) out.push(finish(sat, rec, open, to));
  return out;
}

/** Sharpen the middle of a pass to a few seconds. */
function finish(sat: Sat, rec: ReturnType<typeof json2satrec>, o: { start: number; best: number; at: number }, end: number): Pass {
  let at = o.at;
  let best = o.best;
  for (let t = o.at - STEP; t <= o.at + STEP; t += 3e3) {
    const a = offNadir(rec, t);
    if (a !== null && a < best) {
      best = a;
      at = t;
    }
  }
  return { sat, start: o.start, peak: at, end, angle: Math.round(best * 10) / 10 };
}

export const epochOf = (el: OMMJsonObject) => Date.parse(`${el.EPOCH}Z`);

/** Newest element set for each satellite among the given sources. */
export function newest(...sources: (Elements | null | undefined)[]): Elements {
  const out: Elements = {};
  for (const src of sources)
    for (const sat of SATS) {
      const el = src?.[sat];
      if (el && Number.isFinite(epochOf(el)) && (!out[sat] || epochOf(el) > epochOf(out[sat]!))) out[sat] = el;
    }
  return out;
}

/** Passes for every satellite whose elements are fresh enough. */
export function predict(el: Elements, from: number, to: number, now = Date.now()) {
  const passes: Pass[] = [];
  const age: PassesResponse["age"] = {};
  const dropped: Sat[] = [];
  for (const sat of SATS) {
    const e = el[sat];
    if (!e) {
      dropped.push(sat);
      continue;
    }
    const days = Math.max(0, (now - epochOf(e)) / 864e5);
    age[sat] = Math.round(days * 10) / 10;
    if (days > MAX_AGE_DAYS) dropped.push(sat);
    else passes.push(...passesOf(sat, e, from, to));
  }
  passes.sort((a, b) => a.peak - b.peak);
  return { passes, age, dropped };
}

// ---------------------------------------------------------------------------------------------
// Orbit elements

async function fetchElement(sat: Sat): Promise<OMMJsonObject> {
  const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${NORAD[sat]}&FORMAT=json`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`CelesTrak ${res.status}`);
  const body: unknown = await res.json();
  const el = Array.isArray(body) ? (body[0] as OMMJsonObject | undefined) : undefined;
  if (!el || Number(el.NORAD_CAT_ID) !== NORAD[sat] || !Number.isFinite(epochOf(el))) throw new Error(`CelesTrak: no elements for ${sat}`);
  json2satrec(el); // throws when the numbers are unusable
  return el;
}

/** Fresh elements from CelesTrak. Cached 6 hours (CelesTrak asks for no more than one request per 2 hours). */
export async function getLiveElements(): Promise<Elements> {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 6 * 3600, expire: 3 * 86400 });
  const got = await Promise.allSettled(SATS.map(fetchElement));
  const out: Elements = {};
  got.forEach((g, i) => {
    if (g.status === "fulfilled") out[SATS[i]] = g.value;
    else console.error("orbits:", SATS[i], String(g.reason));
  });
  if (Object.keys(out).length === 0) throw new Error("CelesTrak unavailable");
  return out;
}

async function allElements() {
  const [live, saved] = await Promise.all([getLiveElements().catch(() => null), loadBackup<Elements>(ORBITS_BACKUP)]);
  const el = newest(live, saved?.data, ORBIT_SEED);
  const fresh = live ? SATS.every((s) => live[s] && el[s] === live[s]) : false;
  return { el, fresh };
}

/** Passes from 12 hours ago to 36 hours ahead. Cached 1 hour; the browser picks what it needs by time. */
export async function getPasses(): Promise<PassesResponse> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 3600, expire: 6 * 3600 });
  const now = Date.now();
  const from = now - 12 * 3600e3;
  const to = now + 36 * 3600e3;
  const { el, fresh } = await allElements();
  const { passes, age, dropped } = predict(el, from, to, now);
  return { passes, from, to, updated: new Date(now).toISOString(), age, dropped, source: fresh ? "live" : "saved" };
}
