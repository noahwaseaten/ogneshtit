import { connection } from "next/server";
import { getRisk } from "@/lib/risk";
import { getFires } from "@/lib/fires";
import { getWarnings } from "@/lib/warnings";
import { getFireStats, getRdgs } from "@/lib/iag";

export type SourceStatus = {
  key: "weather" | "fires" | "warnings" | "iag";
  ok: boolean;
  /** When we last got fresh data from the source. */
  updated: string | null;
  /** For satellites: the newest detection, which says more than the fetch time. */
  latest?: string | null;
};
export type StatusResponse = { sources: SourceStatus[]; checked: string };

const within = <T,>(p: Promise<T>, ms = 8000) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

const year = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric" }).format(new Date()));

/** Whether each data source works right now. All calls hit the same caches the app uses, so this is cheap. */
export async function GET() {
  await connection();
  const [risk, fires, warnings, stats, rdgs] = await Promise.allSettled([
    within(getRisk(42.7, 23.32)),
    within(getFires()),
    within(getWarnings()),
    within(getFireStats(year())),
    within(getRdgs()),
  ]);
  const val = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
  const f = val(fires);
  const newest = f?.hotspots.reduce<string | null>((m, h) => (!m || h.time > m ? h.time : m), null) ?? null;
  const sources: SourceStatus[] = [
    { key: "weather", ok: !!val(risk), updated: val(risk)?.updated ?? null },
    { key: "fires", ok: !!f, updated: f?.updated ?? null, latest: newest },
    { key: "warnings", ok: !!val(warnings), updated: val(warnings)?.updated ?? null },
    { key: "iag", ok: !!val(stats) && !!val(rdgs), updated: val(stats)?.updated ?? null },
  ];
  return Response.json({ sources, checked: new Date().toISOString() } satisfies StatusResponse, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
