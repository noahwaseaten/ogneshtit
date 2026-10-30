// Shared by the server (passes.ts) and the browser. No server-only imports here.

import type { Sat } from "./fire-types";

/** One time a satellite looks at Bulgaria. Times are epoch milliseconds. */
export type Pass = {
  sat: Sat;
  /** Bulgaria enters the satellite's scan. */
  start: number;
  /** Closest to straight below the satellite: the middle of the look. */
  peak: number;
  end: number;
  /** Angle away from straight down at the middle of the look, degrees. Small is sharp, large is blurry. */
  angle: number;
};

export type PassesResponse = {
  passes: Pass[];
  /** Window the list covers. */
  from: number;
  to: number;
  updated: string;
  /** Age of the orbit data behind each satellite's passes, in days. */
  age: Partial<Record<Sat, number>>;
  /** Satellites left out because their orbit data is too old to trust. */
  dropped: Sat[];
  /** live: fresh orbit data for all five. saved: at least one satellite uses a saved copy. */
  source: "live" | "saved";
};

/** FIRMS says new detections arrive within about 3 hours of the satellite passing. */
export const DATA_DELAY_MIN = 180;
/** Looks this close together (different satellites) are shown as one. */
export const MERGE_MIN = 25;
/** Beyond this angle a small fire is hard to see and its position is rough. */
export const SHARP_ANGLE = 45;

/** One moment satellites look at Bulgaria: one or more satellites within MERGE_MIN of each other. */
export type Look = { t: number; passes: Pass[]; sharp: boolean };

/** Passes grouped into looks, oldest first. */
export function looksOf(passes: Pass[]): Look[] {
  const sorted = [...passes].sort((a, b) => a.peak - b.peak);
  const out: Look[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && p.peak - last.passes[last.passes.length - 1].peak <= MERGE_MIN * 60e3) {
      last.passes.push(p);
      last.sharp ||= p.angle <= SHARP_ANGLE;
    } else out.push({ t: p.peak, passes: [p], sharp: p.angle <= SHARP_ANGLE });
  }
  return out;
}

/** What is known about a look that already happened. */
export type LookState = "upcoming" | "waiting" | "fires" | "quiet";

/**
 * upcoming: not yet.
 * waiting:  the satellite has passed; its data can still be on the way.
 * fires:    the data is in and it saw heat somewhere around Bulgaria.
 * quiet:    the data should be in and nothing was seen (no fire, or cloud over it).
 * `seen` are the passes that did detect something, from the fires feed.
 */
export function stateOf(look: Look, seen: { sat: Sat; t: string }[], now: number): LookState {
  if (look.t > now) return "upcoming";
  const hit = look.passes.some((p) => seen.some((s) => s.sat === p.sat && Math.abs(Date.parse(s.t) - p.peak) <= 20 * 60e3));
  if (hit) return "fires";
  return now - look.t < DATA_DELAY_MIN * 60e3 ? "waiting" : "quiet";
}

/** The longest stretch with no sharp look between `from` and `to`. */
export function longestGap(looks: Look[], from: number, to: number) {
  const ts = looks.filter((l) => l.sharp && l.t >= from && l.t <= to).map((l) => l.t);
  const edges = [from, ...ts, to];
  let best = { from, to: from, ms: 0 };
  for (let i = 1; i < edges.length; i++) {
    const ms = edges[i] - edges[i - 1];
    if (ms > best.ms) best = { from: edges[i - 1], to: edges[i], ms };
  }
  return best;
}
