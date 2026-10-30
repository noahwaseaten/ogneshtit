import { connection } from "next/server";
import { cronAuthorized } from "@shtit/core/alerts";
import { backupAge, saveBackup } from "@shtit/core/backup";
import { CITIES_BACKUP, SENSORS_BACKUP, getLiveCities, getLiveSensors } from "@/lib/air";

// Saves a copy of every live data source to Vercel Blob, so the app can still show real (dated) data when a
// source is down and the cache is empty. Called with the alert cron every 30 minutes; it only writes when the copies
// are older than 6 hours, which keeps Blob use small.
const EVERY = 6 * 3600e3;

export async function GET(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return new Response("unauthorized", { status: 401 });
  const force = new URL(req.url).searchParams.has("force");
  const age = await backupAge(CITIES_BACKUP);
  if (!force && age != null && age < EVERY) return Response.json({ skipped: "fresh", ageMinutes: Math.round(age / 60e3) });
  const jobs: Record<string, () => Promise<unknown>> = {
    [CITIES_BACKUP]: () => getLiveCities(),
    [SENSORS_BACKUP]: () => getLiveSensors(),
  };
  const results = await Promise.allSettled(
    Object.entries(jobs).map(async ([key, load]) => {
      await saveBackup(key, await load());
      return key;
    }),
  );
  const out = Object.fromEntries(Object.keys(jobs).map((k, i) => [k, results[i].status === "fulfilled" ? "saved" : String((results[i] as PromiseRejectedResult).reason)]));
  console.log("backups", out);
  return Response.json(out);
}
