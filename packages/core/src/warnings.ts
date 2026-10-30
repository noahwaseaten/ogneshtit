import { cacheLife } from "next/cache";
import { loadBackup } from "./backup";
import type { Warning, WarningsResponse } from "./warning-types";

// Official weather warnings from НИМХ (Bulgaria's met service), published through MeteoAlarm.
const FEED = "https://feeds.meteoalarm.org/api/v1/warnings/feeds-bulgaria";

export type { Warning, WarningsResponse } from "./warning-types";
export { warningIn } from "./warning-types";

export const WARNINGS_BACKUP = "warnings";

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

/** Live warnings, or the saved copy when MeteoAlarm does not answer. Expired ones are always dropped. */
export async function getWarnings(): Promise<WarningsResponse> {
  const now = Date.now();
  const valid = (r: WarningsResponse): WarningsResponse => ({ ...r, warnings: r.warnings.filter((w) => !w.expires || Date.parse(w.expires) >= now) });
  try {
    return valid(await getLiveWarnings());
  } catch (e) {
    const saved = await loadBackup<WarningsResponse>(WARNINGS_BACKUP);
    if (!saved) throw e;
    console.error("warnings: serving backup from", saved.saved, e);
    return valid({ ...saved.data, backupFrom: saved.saved });
  }
}

export async function getLiveWarnings(): Promise<WarningsResponse> {
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
    const en = infos.find((i) => (i.language ?? "").toLowerCase().startsWith("en"));
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
      en: en ? { event: en.event ?? "", headline: en.headline ?? "", description: en.description ?? "" } : undefined,
    });
  }
  return { warnings: out, updated: new Date().toISOString() };
}
