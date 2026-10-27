import { connection } from "next/server";
import { deleteSub, saveSub, type Sub } from "@/lib/alerts";

const r = (x: number) => Math.round(x * 100) / 100;

export async function POST(req: Request) {
  await connection();
  const body = (await req.json().catch(() => null)) as Partial<Sub> | null;
  const s = body?.subscription;
  const p = body?.place;
  if (!s?.endpoint?.startsWith("https://") || !s.keys?.p256dh || !s.keys?.auth || !p) {
    return Response.json({ error: "Невалиден абонамент." }, { status: 400 });
  }
  if (!(p.lat > 40 && p.lat < 45.5 && p.lon > 21 && p.lon < 30)) return Response.json({ error: "Мястото е извън България." }, { status: 400 });
  await saveSub({
    subscription: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } },
    place: { lat: r(p.lat), lon: r(p.lon), label: String(p.label ?? "").slice(0, 60) },
    danger: body?.danger !== false,
    fires: body?.fires !== false,
    sent: {},
    created: new Date().toISOString(),
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  await connection();
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await deleteSub(body.endpoint);
  return Response.json({ ok: true });
}
