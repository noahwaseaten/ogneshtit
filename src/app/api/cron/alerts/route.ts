import { connection } from "next/server";
import { allSubs, deleteSub, push, saveSub, type Sub } from "@/lib/alerts";
import { getRisk } from "@/lib/risk";
import { getFires } from "@/lib/fires";
import { getWarnings, type Warning } from "@/lib/warnings";
import { dangerByKey } from "@/lib/danger";
import { distanceKm } from "@/lib/geo";

// Called every 30 minutes (GitHub Actions) and once a day as a fallback (Vercel Cron).
// Rules that keep alerts rare:
//  - danger: at most one alert per place per day, only when the level reaches the chosen threshold
//  - fires: only fires not reported before, within the chosen distance
//  - warnings: only НИМХ orange or red warnings for the place's oblast, each once
//  - nothing between 22:00 and 07:00 Sofia time; anything new is sent in the morning

const sofiaHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", hour: "2-digit", hourCycle: "h23" }).format(new Date()));

const LATIN: Record<string, string> = { "София град": "sofia", "София област": "sofia" };
const inOblast = (w: Warning, oblast?: string) => {
  if (!oblast) return false;
  const stem = oblast.replace(/ (град|област)$/, "").toLowerCase();
  return w.areas.some((a) => a.toLowerCase().includes(stem) || (LATIN[oblast] && a.toLowerCase().includes(LATIN[oblast])));
};

type Msg = { title: string; body: string; url: string; tag: string };

export async function GET(req: Request) {
  await connection();
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("unauthorized", { status: 401 });
  const hour = sofiaHour();
  if (hour >= 22 || hour < 7) return Response.json({ skipped: "quiet hours" });

  const [subs, fires, warnings] = await Promise.all([allSubs(), getFires().catch(() => null), getWarnings().catch(() => null)]);
  let sent = 0;

  for (const s of subs) {
    const msgs: Msg[] = [];
    const next: Sub["sent"] = { ...s.sent };
    const label = s.place.label || "избраното място";

    if (s.prefs.danger !== "off") {
      const risk = await getRisk(s.place.lat, s.place.lon).catch(() => null);
      const d = risk && dangerByKey(risk.today.danger);
      const min = s.prefs.danger === "veryhigh" ? 3 : 2;
      if (risk && d && d.index >= min && s.sent.danger !== risk.today.date) {
        msgs.push({ title: `${d.label} опасност от пожар днес`, body: `${label}. ${d.advice}`, url: "/", tag: "danger" });
        next.danger = risk.today.date;
      }
    }

    if (s.prefs.firesKm > 0 && fires) {
      const near = fires.hotspots.filter((h) => distanceKm(s.place.lat, s.place.lon, h.lat, h.lon) <= s.prefs.firesKm);
      const seen = new Set(s.sent.fires ?? []);
      const fresh = near.filter((h) => !seen.has(`${h.lat},${h.lon},${h.time}`));
      if (fresh.length) {
        const km = Math.round(Math.min(...fresh.map((h) => distanceKm(s.place.lat, s.place.lon, h.lat, h.lon))));
        msgs.push({
          title: fresh.length === 1 ? `Огън на ${km} км от ${label}` : `${fresh.length} огнища до ${s.prefs.firesKm} км от ${label}`,
          body: "Засечено от спътник. Може да е горски пожар или горящо стърнище. Вижте на картата.",
          url: "/karta",
          tag: "fires",
        });
      }
      next.fires = near.map((h) => `${h.lat},${h.lon},${h.time}`).slice(0, 300);
    }

    if (s.prefs.warnings && warnings) {
      const seen = new Set(s.sent.warnings ?? []);
      const mine = warnings.warnings.filter((w) => w.level >= 3 && inOblast(w, s.place.oblast));
      for (const w of mine) {
        const key = `${w.type}|${w.onset}`;
        if (seen.has(key)) continue;
        msgs.push({ title: `${w.level === 4 ? "Червен" : "Оранжев"} код: ${w.event || w.headline}`, body: w.description.slice(0, 160) || label, url: "/", tag: `warn-${key}` });
        seen.add(key);
      }
      next.warnings = [...seen].slice(-50);
    }

    const changed = JSON.stringify(next) !== JSON.stringify(s.sent);
    if (!msgs.length) {
      if (changed) await saveSub({ ...s, sent: next });
      continue;
    }
    try {
      for (const m of msgs) await push(s, m);
      sent += msgs.length;
      await saveSub({ ...s, sent: next });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await deleteSub(s.subscription.endpoint); // unsubscribed in the browser
      else console.error("push failed", code);
    }
  }
  return Response.json({ subs: subs.length, sent });
}
