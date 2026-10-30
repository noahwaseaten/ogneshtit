// Saves the latest orbit elements of the five fire satellites to src/data/orbits.ts (the last-resort copy used by
// src/lib/passes.ts). Run: npm run orbits. Needs a connection to celestrak.org.
import { writeFileSync } from "node:fs";

const SATS = { SNPP: 37849, "NOAA-20": 43013, "NOAA-21": 54234, Terra: 25994, Aqua: 27424 };
const today = new Date().toISOString().slice(0, 10);
let out = `// Orbit elements (CelesTrak OMM) for the five fire satellites, saved on ${today}.
// Only a last resort: passes.ts prefers fresh elements and uses these when CelesTrak and the Blob copy are both
// unavailable. Predictions from them stay usable for about three weeks. Refresh: npm run orbits
import type { OMMJsonObject } from "satellite.js";
import type { Sat } from "@/lib/fire-types";

export const ORBIT_SEED: Record<Sat, OMMJsonObject> = {\n`;
for (const [sat, id] of Object.entries(SATS)) {
  let el;
  for (let i = 0; i < 4 && !el; i++) {
    try {
      const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=json`, { signal: AbortSignal.timeout(20000) });
      const body = await res.json();
      if (body?.[0]?.NORAD_CAT_ID === id) el = body[0];
    } catch {}
    if (!el) await new Promise((r) => setTimeout(r, 3000));
  }
  if (!el) throw new Error(`no elements for ${sat}`);
  out += `  ${JSON.stringify(sat)}: ${JSON.stringify(el)},\n`;
}
writeFileSync(new URL("../src/data/orbits.ts", import.meta.url), out + "};\n");
console.log("saved");
