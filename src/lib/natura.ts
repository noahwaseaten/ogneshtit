import { cacheLife } from "next/cache";

// Natura 2000 site boundaries for Bulgaria from the EEA's public ArcGIS FeatureServer.
const BASE = "https://nest.discomap.eea.europa.eu/arcgis/rest/services/Hosted/Natura2000/FeatureServer/0/query";

export async function getNatura(): Promise<GeoJSON.FeatureCollection> {
  "use cache";
  cacheLife("weeks");

  const features: GeoJSON.Feature[] = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    const q = new URLSearchParams({
      where: "country='BG'",
      outFields: "sitecode,sitename,sitetype",
      returnGeometry: "true",
      outSR: "4326",
      maxAllowableOffset: "0.002", // ~200 m simplification: plenty for a phone map
      geometryPrecision: "4",
      resultOffset: String(offset),
      resultRecordCount: "1000",
      f: "geojson",
    });
    const res = await fetch(`${BASE}?${q}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`EEA ${res.status}`);
    const page = (await res.json()) as GeoJSON.FeatureCollection & { properties?: { exceededTransferLimit?: boolean } };
    features.push(...page.features);
    if (page.features.length < 1000) break;
  }
  if (features.length === 0) throw new Error("No Natura 2000 features");
  return { type: "FeatureCollection", features };
}
