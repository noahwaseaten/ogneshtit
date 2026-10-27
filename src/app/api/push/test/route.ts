import { connection } from "next/server";
import { getSub, push, saveSub } from "@/lib/alerts";

/** Sends a test notification to a subscription that already exists. At most one a minute. */
export async function POST(req: Request) {
  await connection();
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  const sub = body?.endpoint ? await getSub(body.endpoint) : null;
  if (!sub) return Response.json({ error: "Няма такъв абонамент." }, { status: 404 });
  if (sub.sent.test && Date.now() - sub.sent.test < 60_000) return Response.json({ error: "Изчакайте минута." }, { status: 429 });
  try {
    await push(sub, {
      title: "Известията работят",
      body: `Ще ви пишем за ${sub.place.label || "избраното място"} само когато има опасност или огън наблизо.`,
      url: "/",
      tag: "test",
    });
  } catch (e) {
    console.error("test push failed", (e as { statusCode?: number }).statusCode);
    return Response.json({ error: "Браузърът отказа известието." }, { status: 502 });
  }
  await saveSub({ ...sub, sent: { ...sub.sent, test: Date.now() } });
  return Response.json({ ok: true });
}
