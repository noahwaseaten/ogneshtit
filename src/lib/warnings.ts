import { cacheLife } from "next/cache";

// Official weather warnings from НИМХ (Bulgaria's met service), published through MeteoAlarm.
const FEED = "https://feeds.meteoalarm.org/api/v1/warnings/feeds-bulgaria";

export type Warning = {
  level: 1 | 2 | 3 | 4; // green, yellow, orange, red
  type: string; // e.g. "wind", "high-temperature", "forest-fire"
  event: string;
  headline: string;
  description: string;
  areas: string[];
  onset: string;
  expires: string;
};

export type WarningsResponse = { warnings: Warning[]; updated: string };

type Info = {
  language?: string;
  event?: string;
  headline?: string;
  description?: string;
  onset?: string;
  effective?: string;
  expires?: string;
  area?: { areaDesc?: string }[];
  parameter?: { valueName?: string; value?: string }[];
};
type Feed = { warnings?: { alert?: { info?: Info[] } }[] };

const param = (info: Info, name: string) => info.parameter?.find((p) => p.valueName === name)?.value ?? "";

export async function getWarnings(): Promise<WarningsResponse> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 7200 });
  const res = await fetch(FEED, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`MeteoAlarm ${res.status}`);
  const feed = (await res.json()) as Feed;
  const now = Date.now();
  const out: Warning[] = [];
  for (const w of feed.warnings ?? []) {
    const infos = w.alert?.info ?? [];
    const info = infos.find((i) => (i.language ?? "").toLowerCase().startsWith("bg")) ?? infos[0];
    if (!info) continue;
    const expires = info.expires ?? "";
    if (expires && Date.parse(expires) < now) continue;
    const level = Number(param(info, "awareness_level").split(";")[0]) as Warning["level"];
    if (!(level >= 2)) continue; // green means "no warning"
    out.push({
      level,
      type: param(info, "awareness_type").split(";")[1]?.trim() ?? "",
      event: info.event ?? "",
      headline: info.headline ?? "",
      description: info.description ?? "",
      areas: (info.area ?? []).map((a) => a.areaDesc ?? "").filter(Boolean),
      onset: info.onset ?? info.effective ?? "",
      expires,
    });
  }
  return { warnings: out, updated: new Date().toISOString() };
}
