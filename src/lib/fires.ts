import { cacheLife } from "next/cache";
import { BG_BBOX, inBulgaria } from "./geo";

export type Hotspot = {
  lat: number;
  lon: number;
  time: string; // ISO, UTC
  satellite: string;
  confidence: "low" | "nominal" | "high";
  frp: number; // fire radiative power, MW
  night: boolean;
};

export type FiresResponse = { hotspots: Hotspot[]; hours: number; source: "firms-key" | "firms-open"; updated: string };

const SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"];
// Keyless fallback: FIRMS publishes rolling 24 h CSVs per region.
const OPEN_FILES = [
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Europe_24h.csv",
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Europe_24h.csv",
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_Europe_24h.csv",
];

function parseCsv(text: string): Hotspot[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0].split(",");
  const col = (n: string) => head.indexOf(n);
  const [iLat, iLon, iDate, iTime, iSat, iConf, iFrp, iDn] = [
    "latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "frp", "daynight",
  ].map(col);
  if (iLat < 0 || iLon < 0) return [];
  const out: Hotspot[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const lat = Number(c[iLat]);
    const lon = Number(c[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inBulgaria(lat, lon)) continue;
    const t = (c[iTime] ?? "0000").padStart(4, "0");
    const conf = (c[iConf] ?? "n").toLowerCase();
    out.push({
      lat,
      lon,
      time: `${c[iDate]}T${t.slice(0, 2)}:${t.slice(2)}:00Z`,
      satellite: c[iSat] ?? "",
      confidence: conf.startsWith("h") ? "high" : conf.startsWith("l") ? "low" : "nominal",
      frp: Number(c[iFrp]) || 0,
      night: (c[iDn] ?? "") === "N",
    });
  }
  return out;
}

/** VIIRS hotspots inside Bulgaria. Cached 30 minutes; satellites pass a few times a day. */
export async function getFires(): Promise<FiresResponse> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 1800, expire: 21600 });

  const key = process.env.FIRMS_MAP_KEY;
  let texts: string[];
  let source: FiresResponse["source"];
  let hours: number;

  if (key) {
    source = "firms-key";
    hours = 48;
    texts = await Promise.all(
      SOURCES.map(async (s) => {
        const res = await fetch(
          `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${s}/${BG_BBOX.join(",")}/2`,
          { signal: AbortSignal.timeout(10000) },
        );
        return res.ok ? res.text() : "";
      }),
    );
  } else {
    source = "firms-open";
    hours = 24;
    texts = await Promise.all(
      OPEN_FILES.map(async (u) => {
        const res = await fetch(u, { signal: AbortSignal.timeout(10000) });
        return res.ok ? res.text() : "";
      }),
    );
  }

  if (texts.every((t) => !t)) throw new Error("FIRMS unavailable");

  const hotspots = texts
    .flatMap(parseCsv)
    .sort((a, b) => b.time.localeCompare(a.time));

  return { hotspots, hours, source, updated: new Date().toISOString() };
}
