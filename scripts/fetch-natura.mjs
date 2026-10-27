// Downloads Natura 2000 boundaries for Bulgaria from the EEA once, at build time, into a static file.
// Boundaries change rarely, so the map never depends on the EEA server being up at runtime.
// Never fails the build: if the EEA is unreachable, the map simply shows no Natura layer.
import { writeFileSync } from "node:fs";

const BASE = "https://nest.discomap.eea.europa.eu/arcgis/rest/services/Hosted/Natura2000/FeatureServer/0/query";
const OUT = "public/natura-bg.json";

async function main() {
  const features = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const q = new URLSearchParams({
      where: "country='BG'",
      outFields: "sitecode,sitename,sitetype",
      returnGeometry: "true",
      outSR: "4326",
      maxAllowableOffset: "0.002", // ~200 m simplification: plenty for a phone map
      geometryPrecision: "4",
      resultOffset: String(offset),
      resultRecordCount: "500",
      f: "geojson",
    });
    const res = await fetch(`${BASE}?${q}`, { signal: AbortSignal.timeout(60000) });
    const text = await res.text();
    let page;
    try {
      page = JSON.parse(text);
    } catch {
      throw new Error(`EEA ${res.status}, not JSON: ${text.slice(0, 300)}`);
    }
    if (!res.ok || page.error || !Array.isArray(page.features)) {
      throw new Error(`EEA ${res.status}: ${text.slice(0, 300)}`);
    }
    features.push(...page.features);
    if (page.features.length < 500) break;
  }
  if (features.length === 0) throw new Error("EEA returned no features for BG");
  const fc = { type: "FeatureCollection", features };
  writeFileSync(OUT, JSON.stringify(fc));
  console.log(`[natura] ${features.length} sites, ${(JSON.stringify(fc).length / 1e6).toFixed(2)} MB → ${OUT}`);
}

main().catch((e) => console.warn(`[natura] skipped: ${e.message}`));
