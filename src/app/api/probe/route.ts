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
      : q === "c"
        ? [
            get(`https://maps.effis.emergency.copernicus.eu/effis?service=WFS&version=1.1.0&request=GetFeature&typeName=ms:viirs.hs&maxFeatures=3&outputFormat=${encodeURIComponent("application/json; subtype=geojson")}&FILTER=${encodeURIComponent('<Filter><And><PropertyIsGreaterThan><PropertyName>acq_at</PropertyName><Literal>' + day(3) + '</Literal></PropertyIsGreaterThan><PropertyIsEqualTo><PropertyName>gid_0</PropertyName><Literal>BGR</Literal></PropertyIsEqualTo></And></Filter>')}`),
            get(`https://maps.effis.emergency.copernicus.eu/effis?service=WFS&version=1.1.0&request=GetFeature&typeName=ms:viirs.hs&maxFeatures=3&outputFormat=${encodeURIComponent("application/json; subtype=geojson")}&FILTER=${encodeURIComponent('<Filter><PropertyIsGreaterThan><PropertyName>acq_at</PropertyName><Literal>' + day(3) + '</Literal></PropertyIsGreaterThan></Filter>')}`),
            get(`https://maps.effis.emergency.copernicus.eu/effis?service=WFS&version=2.0.0&request=GetFeature&typeNames=ms:viirs.hs&count=3&sortBy=acq_at+DESC&outputFormat=${encodeURIComponent("application/json; subtype=geojson")}`),
            get(`https://maps.effis.emergency.copernicus.eu/effis?service=WFS&version=1.1.0&request=GetFeature&typeName=ms:all.hs.query&maxFeatures=3&outputFormat=${encodeURIComponent("application/json; subtype=geojson")}`),
            get(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${k}/VIIRS_NOAA20_NRT/19,39,30,46/1`),
          ]
        : [get(effis("ms:viirs.hs", "&TIME=" + day(1)))];
  return Response.json(await Promise.all(jobs));
}
