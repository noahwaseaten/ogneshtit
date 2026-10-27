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
  /** For satellites: the newest pass over the region, which says more than the fetch time. */
  latest?: string | null;
  /**
   * live: the source answered. approx: it did not, and a second source filled in (weather from MET Norway).
   * backup: it did not, and this is the copy saved at `backupFrom`.
   */
  mode?: "live" | "approx" | "backup";
  backupFrom?: string | null;
  /** Satellite feeds that failed while the others worked. */
  failed?: string[];
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
  const w = val(risk);
  const wn = val(warnings);
  const st = val(stats);
  const sources: SourceStatus[] = [
    { key: "weather", ok: !!w, updated: w?.updated ?? null, mode: w?.approx ? "approx" : "live" },
    {
      key: "fires",
      ok: !!f,
      updated: f?.backupFrom ?? f?.updated ?? null,
      latest: f?.lastPass ?? null,
      mode: f?.backupFrom ? "backup" : "live",
      backupFrom: f?.backupFrom ?? null,
      failed: f?.failed ?? [],
    },
    { key: "warnings", ok: !!wn, updated: wn?.backupFrom ?? wn?.updated ?? null, mode: wn?.backupFrom ? "backup" : "live", backupFrom: wn?.backupFrom ?? null },
    { key: "iag", ok: !!st && !!val(rdgs), updated: st?.backupFrom ?? st?.updated ?? null, mode: st?.backupFrom ? "backup" : "live", backupFrom: st?.backupFrom ?? null },
  ];
  return Response.json({ sources, checked: new Date().toISOString() } satisfies StatusResponse, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
