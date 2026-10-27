import { OBLASTS, project } from "@/data/oblasts";

type Ring = [number, number][];
let rings: { code: string; name: string; rings: Ring[] }[] | null = null;

function parse() {
  rings ??= OBLASTS.map((o) => ({
    code: o.code,
    name: o.name,
    rings: o.d
      .split("Z")
      .filter(Boolean)
      .map((r) => r.replace(/^M/, "").split("L").map((p) => p.split(" ").map(Number) as [number, number])),
  }));
  return rings;
}

function inside(x: number, y: number, ring: Ring) {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

/** Which oblast a point falls in (even-odd rule, so Sofia city is cut out of Sofia oblast). */
export function oblastAt(lat: number, lon: number) {
  const [x, y] = project(lat, lon);
  for (const o of parse()) {
    let n = 0;
    for (const r of o.rings) if (inside(x, y, r)) n++;
    if (n % 2 === 1) return { code: o.code, name: o.name };
  }
  return null;
}

const BEARINGS = ["север", "североизток", "изток", "югоизток", "юг", "югозапад", "запад", "северозапад"];
/** Compass direction from a to b as a word: "северозапад". */
export function bearingWord(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(bLon - aLon)) * Math.cos(toRad(bLat));
  const x = Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) - Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLon - aLon));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return BEARINGS[Math.round(deg / 45) % 8];
}
