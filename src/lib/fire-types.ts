// Shared by the server (fires.ts) and the browser. No server-only imports here.

export type Sat = "SNPP" | "NOAA-20" | "NOAA-21" | "Terra" | "Aqua";
export const SAT_NAMES: Record<Sat, string> = { SNPP: "Suomi NPP", "NOAA-20": "NOAA-20", "NOAA-21": "NOAA-21", Terra: "Terra", Aqua: "Aqua" };
export type Confidence = "low" | "nominal" | "high";

export type Detection = { lat: number; lon: number; time: string; sat: Sat; conf: Confidence; frp: number; night: boolean };

/**
 * confirmed: seen on two or more separate satellite passes.
 * single:    seen once, with normal or high confidence.
 * weak:      seen once, with low confidence. Often not a fire.
 * static:    a spot that keeps lighting up on different days: almost certainly industry, not a wildfire.
 */
export type FireStatus = "confirmed" | "single" | "weak" | "static";

export type Fire = {
  id: string;
  lat: number;
  lon: number;
  first: string;
  last: string;
  /** Strongest pixel, MW. */
  frp: number;
  /** Pixels that make up the fire. */
  pixels: number;
  /** Separate satellite passes that saw it. */
  passes: number;
  sats: Sat[];
  conf: Confidence;
  status: FireStatus;
  /** Later passes over Bulgaria (VIIRS, day or night) that did not see it again. */
  missed: number;
  /** Days in the past two weeks with heat at this spot, for permanent sources. */
  days?: number;
};

export type FiresResponse = {
  fires: Fire[];
  hours: number;
  updated: string;
  source: "firms" | "firms-open" | "backup";
  /** Newest satellite pass over the region, from any satellite. */
  lastPass: string | null;
  /** Satellite feeds that did not answer this time. */
  failed: Sat[];
  /** Passes that detected heat somewhere in the region, to tell which predicted looks found anything. */
  seen?: { sat: Sat; t: string }[];
  /** Set when this is a saved copy because NASA did not answer. */
  backupFrom?: string;
};

/** Fires worth showing by default and counting: not weak, not permanent sources. */
export const isReal = (f: Fire) => f.status === "confirmed" || f.status === "single";
/** Probably still burning: real, seen in the last 24 hours, and not missed by a later pass. */
export const isCurrent = (f: Fire, now = Date.now()) => isReal(f) && f.missed === 0 && now - Date.parse(f.last) < 24 * 3600e3;

