import { connection } from "next/server";
import { getCities, getSensors } from "@/lib/air";

export type SourceStatus = {
  key: "cams" | "sensors";
  ok: boolean;
  updated: string | null;
  mode?: "live" | "backup";
  backupFrom?: string | null;
  /** For the sensors: how many reported in the last 30 minutes. */
  count?: number;
};
export type StatusResponse = { sources: SourceStatus[]; checked: string };

const within = <T,>(p: Promise<T>, ms = 10000) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

/** Whether each data source works right now. All calls hit the same caches the app uses, so this is cheap. */
export async function GET() {
  await connection();
  const [c, s] = await Promise.allSettled([within(getCities()), within(getSensors())]);
  const cities = c.status === "fulfilled" ? c.value : null;
  const sensors = s.status === "fulfilled" ? s.value : null;
  const sources: SourceStatus[] = [
    { key: "cams", ok: !!cities, updated: cities?.backupFrom ?? cities?.updated ?? null, mode: cities?.backupFrom ? "backup" : "live", backupFrom: cities?.backupFrom ?? null },
    { key: "sensors", ok: !!sensors, updated: sensors?.backupFrom ?? sensors?.updated ?? null, mode: sensors?.backupFrom ? "backup" : "live", backupFrom: sensors?.backupFrom ?? null, count: sensors?.sensors.length },
  ];
  return Response.json({ sources, checked: new Date().toISOString() } satisfies StatusResponse, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
