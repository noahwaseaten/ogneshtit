import { connection } from "next/server";
import { getSub, push, saveSub } from "@/lib/alerts";
import { pick } from "@/i18n/lang";
import { langOf } from "@/i18n/server";
import { placeName } from "@/i18n/names";

/** Sends a test notification to a subscription that already exists. At most one a minute. */
export async function POST(req: Request) {
  await connection();
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  const sub = body?.endpoint ? await getSub(body.endpoint) : null;
  const lang = sub?.lang ?? langOf(req);
  const t = pick(lang);
  if (!sub) return Response.json({ error: t("Няма такъв абонамент.", "No such subscription.") }, { status: 404 });
  if (sub.sent.test && Date.now() - sub.sent.test < 60_000) return Response.json({ error: t("Изчакайте минута.", "Wait a minute.") }, { status: 429 });
  const where = sub.place.label ? placeName(sub.place.label, lang) : t("избраното място", "your place");
  try {
    await push(sub, {
      title: t("Известията работят", "Alerts are working"),
      body: t(
        `Ще ви пишем за ${where} само когато има опасност или огън наблизо.`,
        `We'll only message you about ${where} when there's danger or a fire nearby.`,
      ),
      url: "/",
      tag: "test",
    });
  } catch (e) {
    console.error("test push failed", (e as { statusCode?: number }).statusCode);
    return Response.json({ error: t("Браузърът отказа известието.", "The browser refused the notification.") }, { status: 502 });
  }
  await saveSub({ ...sub, sent: { ...sub.sent, test: Date.now() } });
  return Response.json({ ok: true });
}
