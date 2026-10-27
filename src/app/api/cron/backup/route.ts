import { connection } from "next/server";
import { backupAge, saveBackup } from "@/lib/backup";
import { FIRES_BACKUP, getLiveFires } from "@/lib/fires";
import { DANGER_BACKUP, getLiveDangerMap } from "@/lib/risk";
import { WARNINGS_BACKUP, getLiveWarnings } from "@/lib/warnings";
import { ORBITS_BACKUP, getLiveElements } from "@/lib/passes";
import { RDG_BACKUP, getFireYear, getRdgs, statsBackupKey } from "@/lib/iag";

// Saves a copy of every live data source to Vercel Blob, so the app can still show real (dated) data when a
// source is down and the cache is empty, for example right after a deployment. Called with the alert cron
// every 30 minutes; it only writes when the copies are older than 6 hours, which keeps Blob use small.
const EVERY = 6 * 3600e3;

export async function GET(req: Request) {
  await connection();
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("unauthorized", { status: 401 });
  const force = new URL(req.url).searchParams.has("force");
  const age = await backupAge(FIRES_BACKUP);
  if (!force && age != null && age < EVERY) return Response.json({ skipped: "fresh", ageMinutes: Math.round(age / 60e3) });

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
  const year = Number(today.slice(0, 4));
  const jobs: Record<string, () => Promise<unknown>> = {
    [FIRES_BACKUP]: () => getLiveFires(),
    [ORBITS_BACKUP]: () => getLiveElements(),
    [DANGER_BACKUP]: () => getLiveDangerMap(),
    [WARNINGS_BACKUP]: () => getLiveWarnings(),
    [statsBackupKey(year)]: () => getFireYear(year, today),
    [RDG_BACKUP]: async () => {
      const r = await getRdgs();
      if (!r.every((x) => x.phone || x.email)) throw new Error("some directorates have no contact");
      return r;
    },
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
