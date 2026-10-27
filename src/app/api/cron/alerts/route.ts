import { connection } from "next/server";
import { allSubs, deleteSub, push, saveSub } from "@/lib/alerts";
import { getRisk } from "@/lib/risk";
import { getFires } from "@/lib/fires";
import { dangerByKey } from "@/lib/danger";
import { distanceKm } from "@/lib/geo";

// Runs once a day (vercel.json). Sends at most one danger alert per place per day, and one
// alert per new satellite fire within FIRE_KM.
const FIRE_KM = 25;
const ALERT_FROM = 2; // "Висока" and above

export async function GET(req: Request) {
  await connection();
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("unauthorized", { status: 401 });

  const [subs, fires] = await Promise.all([allSubs(), getFires().catch(() => null)]);
  let sent = 0;
  for (const s of subs) {
    const msgs: { title: string; body: string; url: string; tag: string }[] = [];
    const changed = { ...s.sent };

    if (s.danger) {
      const risk = await getRisk(s.place.lat, s.place.lon).catch(() => null);
      const d = risk && dangerByKey(risk.today.danger);
      if (risk && d && d.index >= ALERT_FROM && s.sent.danger !== risk.today.date) {
        msgs.push({ title: `Опасност от пожар днес: ${d.label.toLowerCase()}`, body: `${s.place.label}. ${d.advice}`, url: "/", tag: "danger" });
        changed.danger = risk.today.date;
      }
    }
    if (s.fires && fires) {
      const near = fires.hotspots.filter((h) => distanceKm(s.place.lat, s.place.lon, h.lat, h.lon) <= FIRE_KM);
      const fresh = near.filter((h) => !(s.sent.fires ?? []).includes(`${h.lat},${h.lon},${h.time}`));
      if (fresh.length) {
        const km = Math.round(Math.min(...fresh.map((h) => distanceKm(s.place.lat, s.place.lon, h.lat, h.lon))));
        msgs.push({
          title: fresh.length === 1 ? `Огън на ${km} км от ${s.place.label}` : `${fresh.length} огнища до ${FIRE_KM} км от ${s.place.label}`,
          body: "Засечени от спътник. Може да е горски пожар или горящо стърнище. Вижте картата.",
          url: "/karta",
          tag: "fires",
        });
        changed.fires = near.map((h) => `${h.lat},${h.lon},${h.time}`).slice(0, 200);
      }
    }
    if (!msgs.length) continue;
    try {
      for (const m of msgs) await push(s, m);
      sent += msgs.length;
      await saveSub({ ...s, sent: changed });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await deleteSub(s.subscription.endpoint); // unsubscribed in the browser
      else console.error("push failed", code);
    }
  }
  return Response.json({ subs: subs.length, sent });
}
