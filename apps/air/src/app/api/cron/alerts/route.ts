import { connection } from "next/server";
import { pick } from "@shtit/core/i18n/lang";
import { placeName } from "@shtit/core/i18n/names";
import { cronAuthorized, sofiaHour } from "@shtit/core/alerts";
import { allSubs, deleteSub, push, saveSub, type Sub } from "@/lib/alerts";
import { getPlace } from "@/lib/air";
import { bandByKey, bandText, hhmm } from "@/lib/air-types";

// Called every 30 minutes (GitHub Actions) and once a day as a fallback (Vercel Cron).
// One alert a day at most, in the morning (07:00 to 10:00 Sofia time), when today's daytime air at the place is
// forecast to reach the chosen band. It says when the air is cleanest, so the alert is something to act on.

type Msg = { title: string; body: string; url: string; tag: string };

export async function GET(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return new Response("unauthorized", { status: 401 });
  const hour = sofiaHour();
  if (hour < 7 || hour >= 10) return Response.json({ skipped: "only in the morning" });

  const subs = await allSubs();
  let sent = 0;
  for (const s of subs) {
    if (s.prefs.level === "off") continue;
    const place = await getPlace(s.place.lat, s.place.lon).catch(() => null);
    const today = place?.days[0];
    if (!place || !today || s.sent.day === today.date) continue;
    const band = bandByKey(today.band);
    if (band.index < bandByKey(s.prefs.level).index) continue;
    const lang = s.lang ?? "bg";
    const t = pick(lang);
    const label = s.place.label ? placeName(s.place.label, lang) : t("избраното място", "your place");
    const text = bandText(band, lang);
    const clean = place.best ? t(` Най-чист въздух: ${hhmm(place.best.start)} до ${hhmm(place.best.end)}.`, ` Cleanest air: ${hhmm(place.best.start)} to ${hhmm(place.best.end)}.`) : "";
    const msg: Msg = {
      title: t(`Въздухът днес: ${text.label.toLowerCase()}, ${label}`, `Air today: ${text.label.toLowerCase()}, ${label}`),
      body: `${s.prefs.sensitive ? text.sensitive : text.everyone}${clean}`,
      url: "/",
      tag: "air",
    };
    const next: Sub["sent"] = { ...s.sent, day: today.date };
    try {
      await push(s, msg);
      sent++;
      await saveSub({ ...s, sent: next });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await deleteSub(s.subscription.endpoint); // unsubscribed in the browser
      else console.error("push failed", code);
    }
  }
  return Response.json({ subs: subs.length, sent });
}
