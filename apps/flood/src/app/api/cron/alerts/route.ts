import { connection } from "next/server";
import { pick } from "@shtit/core/i18n/lang";
import { placeName } from "@shtit/core/i18n/names";
import { quietHours } from "@shtit/core/alerts";
import { getWarnings, warningIn } from "@shtit/core/warnings";
import { allSubs, deleteSub, push, saveSub, type Sub } from "@/lib/alerts";
import { getPlace } from "@/lib/floods";
import { FLOOD_WARNINGS, levelByKey, levelText } from "@/lib/flood-types";

// Called every 30 minutes (GitHub Actions) and once a day as a fallback (Vercel Cron).
// Rules that keep alerts rare:
//  - river: only when the river at the place is forecast to reach the chosen level within 3 days; once per rise
//    (sent.river keeps the highest level announced, so only a higher one alerts again until the river calms down)
//  - warnings: only НИМХ orange or red warnings about rain, floods, snow or ice for the place's oblast, each once
//  - nothing between 22:00 and 07:00 Sofia time; anything new is sent in the morning

type Msg = { title: string; body: string; url: string; tag: string };

const formatDay = (date: string, lang: "bg" | "en") =>
  new Intl.DateTimeFormat(lang === "bg" ? "bg-BG" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));

export async function GET(req: Request) {
  await connection();
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("unauthorized", { status: 401 });
  if (quietHours()) return Response.json({ skipped: "quiet hours" });

  const [subs, warnings] = await Promise.all([allSubs(), getWarnings().catch(() => null)]);
  let sent = 0;

  for (const s of subs) {
    const msgs: Msg[] = [];
    const next: Sub["sent"] = { ...s.sent };
    const lang = s.lang ?? "bg";
    const t = pick(lang);
    const label = s.place.label ? placeName(s.place.label, lang) : t("избраното място", "your place");

    if (s.prefs.river !== "off") {
      const place = await getPlace(s.place.lat, s.place.lon).catch(() => null);
      const river = place?.river;
      const min = levelByKey(s.prefs.river).index;
      // The highest level in the next 4 days (today and 3 ahead), if it reaches the chosen one.
      const top = river?.days.slice(0, 4).reduce<(typeof river.days)[number] | undefined>((m, d) => (!m || levelByKey(d.level).index > levelByKey(m.level).index ? d : m), undefined);
      const hit = top && levelByKey(top.level).index >= min ? top : undefined;
      const told = s.sent.river ? levelByKey(s.sent.river).index : -1;
      if (river && hit && levelByKey(hit.level).index > told) {
        const lv = levelText(levelByKey(hit.level), lang);
        const when = hit.date === river.days[0]?.date ? t("днес", "today") : formatDay(hit.date, lang);
        msgs.push({
          title: t(`${lv.label} опасност от наводнение: ${label}`, `${lv.label} flood danger: ${label}`),
          body: t(`Реката може да стигне това ниво ${when}. ${lv.advice}`, `The river may reach this level ${when}. ${lv.advice}`),
          url: "/",
          tag: "river",
        });
        next.river = hit.level;
      } else if (river && !hit && s.sent.river) {
        // Back to calm: forget the rise, so the next one is announced again.
        next.river = undefined;
      }
    }

    if (s.prefs.warnings && warnings) {
      const seen = new Set(s.sent.warnings ?? []);
      const mine = warnings.warnings.filter((w) => w.level >= 3 && FLOOD_WARNINGS.includes(w.type) && warningIn(w, s.place.oblast));
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
