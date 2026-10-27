import { connection } from "next/server";

// Temporary: inspect upstream responses from Vercel (the dev sandbox cannot reach them). Public data only.
const BB = "22.3,41.2,28.7,44.3";
const get = async (url: string, init?: RequestInit) => {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(20000), cache: "no-store" });
    const text = await r.text();
    return { url: url.replace(process.env.FIRMS_MAP_KEY ?? "@@", "KEY"), status: r.status, ms: Date.now() - t0, len: text.length, head: text.slice(0, 1500) };
  } catch (e) {
    return { url: url.replace(process.env.FIRMS_MAP_KEY ?? "@@", "KEY"), error: String(e), ms: Date.now() - t0 };
  }
};

export async function GET(req: Request) {
  await connection();
  const k = process.env.FIRMS_MAP_KEY;
  const q = new URL(req.url).searchParams.get("q") ?? "a";
  const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const effis = (t: string, extra = "") =>
    `https://maps.effis.emergency.copernicus.eu/effis?service=WFS&version=1.1.0&request=GetFeature&typeName=${t}&maxFeatures=4&bbox=41.2,22.3,44.3,28.7,EPSG:4326&outputFormat=${encodeURIComponent("application/json; subtype=geojson")}${extra}`;
  const jobs: Promise<unknown>[] =
    q === "a"
      ? [
          get(effis("ms:viirs.hs")),
          get(effis("ms:modis.hs")),
          get(effis("ms:effis.nrt.ba.point")),
          get(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${k}/MODIS_NRT/${BB}/2`),
          get(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${k}/VIIRS_NOAA20_NRT/${BB}/1/${day(12)}`),
          get(`https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/${k}/all`),
          get(`https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=${k}`),
        ]
      : [
          get(effis("ms:viirs.hs", "&TIME=" + day(1))),
          get(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=42.7&lon=23.32`, { headers: { "user-agent": "OgneShtit/1.0 github.com/noahwaseaten/ogneshtit" } }),
          get(`https://photon.komoot.io/api/?q=Банско&limit=2&lang=default&bbox=22.3,41.2,28.7,44.3`),
          get(`https://api.open-meteo.com/v1/forecast?latitude=42.7&longitude=23.32&current=temperature_2m`),
          get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent('[out:json][timeout:20];area["ISO3166-1"="BG"]->.a;(nwr["man_made"="flare"](area.a);nwr["power"="plant"]["plant:source"~"coal|gas|lignite"](area.a););out center 5;')}`),
        ];
  return Response.json(await Promise.all(jobs));
}
