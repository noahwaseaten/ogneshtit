import { cronAuthorized } from "@shtit/core/alerts";
import { pick } from "@shtit/core/i18n/lang";
import { placeName } from "@shtit/core/i18n/names";
import { connection } from "next/server";
import { allSubs, deleteSub, push, saveSub, type Sub } from "@/lib/alerts";
import { getRisk } from "@/lib/risk";
import { getFires, isCurrent } from "@/lib/fires";
import { getWarnings, type Warning } from "@shtit/core/warnings";
import { dangerByKey, dangerText } from "@/lib/danger";
import { distanceKm } from "@shtit/core/geo";

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
  if (!cronAuthorized(req)) return new Response("unauthorized", { status: 401 });
  const hour = sofiaHour();
  if (hour >= 22 || hour < 7) return Response.json({ skipped: "quiet hours" });

  const [subs, fires, warnings] = await Promise.all([allSubs(), getFires().catch(() => null), getWarnings().catch(() => null)]);
  let sent = 0;

  for (const s of subs) {
    const msgs: Msg[] = [];
    const next: Sub["sent"] = { ...s.sent };
    const lang = s.lang ?? "bg";
    const t = pick(lang);
    const label = s.place.label ? placeName(s.place.label, lang) : t("избраното място", "your place");

    if (s.prefs.danger !== "off") {
      const risk = await getRisk(s.place.lat, s.place.lon).catch(() => null);
      const d = risk && dangerByKey(risk.today.danger);
      const min = s.prefs.danger === "veryhigh" ? 3 : 2;
      if (risk && d && d.index >= min && s.sent.danger !== risk.today.date) {
        const dt = dangerText(d, lang);
        msgs.push({ title: t(`${dt.label} опасност от пожар днес`, `${dt.label} fire danger today`), body: `${label}. ${dt.advice}`, url: "/", tag: "danger" });
        next.danger = risk.today.date;
      }
    }

    // Only fires we trust and that are burning now: real (not weak, not a factory), seen in the last 6 hours,
    // not missed by a later pass, and never from a saved copy. One alert per fire, and none for a fire within
    // 2 km of one we already told this person about.
    if (s.prefs.firesKm > 0 && fires && !fires.backupFrom) {
      const now = Date.now();
      const near = fires.fires.filter((f) => isCurrent(f, now) && now - Date.parse(f.last) < 6 * 3600e3 && distanceKm(s.place.lat, s.place.lon, f.lat, f.lon) <= s.prefs.firesKm);
      const seen = s.sent.fires ?? [];
      const seenAt = seen.map((id) => id.split(",").map(Number)).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
      const fresh = near.filter((f) => !seen.includes(f.id) && !seenAt.some(([a, b]) => distanceKm(a, b, f.lat, f.lon) < 2));
      if (fresh.length) {
        const km = Math.round(Math.min(...fresh.map((f) => distanceKm(s.place.lat, s.place.lon, f.lat, f.lon))));
        const sure = fresh.some((f) => f.status === "confirmed");
        msgs.push({
          title:
            fresh.length === 1
              ? t(`Огън на ${km} км от ${label}`, `Fire ${km} km from ${label}`)
              : t(`${fresh.length} огнища до ${s.prefs.firesKm} км от ${label}`, `${fresh.length} fires within ${s.prefs.firesKm} km of ${label}`),
          body: sure
            ? t("Потвърдено от няколко преминавания на спътник. Вижте на картата.", "Confirmed by several satellite passes. See it on the map.")
            : t(
                "Засечено от спътник. Може да е горски пожар или горящо стърнище. Вижте на картата.",
                "Spotted by satellite. It could be a forest fire or burning stubble. See it on the map.",
              ),
          url: "/karta",
          tag: "fires",
        });
      }
      next.fires = [...new Set([...fresh.map((f) => f.id), ...seen])].slice(0, 300);
    }

    if (s.prefs.warnings && warnings) {
      const seen = new Set(s.sent.warnings ?? []);
      const mine = warnings.warnings.filter((w) => w.level >= 3 && inOblast(w, s.place.oblast));
      for (const w of mine) {
        const key = `${w.type}|${w.onset}`;
        if (seen.has(key)) continue;
        const text = lang === "en" && w.en ? w.en : w;
        msgs.push({
          title: `${w.level === 4 ? t("Червен код", "Red warning") : t("Оранжев код", "Orange warning")}: ${text.event || text.headline}`,
          body: text.description.slice(0, 160) || label,
          url: "/",
          tag: `warn-${key}`,
        });
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
