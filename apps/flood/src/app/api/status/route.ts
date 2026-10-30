import { connection } from "next/server";
import { getWarnings } from "@shtit/core/warnings";
import { getGaugeForecasts, getWeather } from "@/lib/floods";
import { getDanube } from "@/lib/danube";

export type SourceStatus = {
  key: "glofas" | "weather" | "warnings" | "danube";
  ok: boolean;
  /** When we last got fresh data from the source. */
  updated: string | null;
  /** live: the source answered. backup: it did not, and this is the copy saved at `backupFrom`. */
  mode?: "live" | "backup";
  backupFrom?: string | null;
  /** For АППД: the day the measurements are for. */
  dataDate?: string | null;
};
export type StatusResponse = { sources: SourceStatus[]; checked: string };

const within = <T,>(p: Promise<T>, ms = 8000) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

/** Whether each data source works right now. All calls hit the same caches the app uses, so this is cheap. */
export async function GET() {
  await connection();
  const [g, w, wn, d] = await Promise.allSettled([within(getGaugeForecasts(), 12000), within(getWeather(42.7, 23.32)), within(getWarnings()), within(getDanube())]);
  const val = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
  const gauges = val(g);
  const warnings = val(wn);
  const danube = val(d);
  const sources: SourceStatus[] = [
    { key: "glofas", ok: !!gauges, updated: gauges?.backupFrom ?? gauges?.updated ?? null, mode: gauges?.backupFrom ? "backup" : "live", backupFrom: gauges?.backupFrom ?? null },
    { key: "weather", ok: !!val(w), updated: val(w) ? new Date().toISOString() : null, mode: "live" },
    { key: "warnings", ok: !!warnings, updated: warnings?.backupFrom ?? warnings?.updated ?? null, mode: warnings?.backupFrom ? "backup" : "live", backupFrom: warnings?.backupFrom ?? null },
    { key: "danube", ok: !!danube, updated: danube?.backupFrom ?? danube?.updated ?? null, mode: danube?.backupFrom ? "backup" : "live", backupFrom: danube?.backupFrom ?? null, dataDate: danube?.date ?? null },
  ];
  return Response.json({ sources, checked: new Date().toISOString() } satisfies StatusResponse, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
