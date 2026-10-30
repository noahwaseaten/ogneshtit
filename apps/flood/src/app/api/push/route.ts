import { isLang } from "@shtit/core/i18n/lang";
import { langOf, textFor } from "@shtit/core/i18n/server";
import { connection } from "next/server";
import { DEFAULT_PREFS, deleteSub, getSub, saveSub, type Prefs } from "@/lib/alerts";
import { oblastAt } from "@shtit/core/oblast";
import { roundKm as r } from "@shtit/core/alerts";

function readPrefs(p: Partial<Prefs> | undefined): Prefs {
  return {
    river: p?.river === "off" || p?.river === "veryhigh" ? p.river : DEFAULT_PREFS.river,
    warnings: p?.warnings !== false,
  };
}

/** Subscribe, or update the place and preferences of an existing subscription. */
export async function POST(req: Request) {
  await connection();
  const body = (await req.json().catch(() => null)) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    place?: { lat: number; lon: number; label?: string };
    prefs?: Partial<Prefs>;
    lang?: string;
  } | null;
  const t = textFor(req);
  const s = body?.subscription;
  const p = body?.place;
  if (!s?.endpoint?.startsWith("https://") || !s.keys?.p256dh || !s.keys?.auth || !p) {
    return Response.json({ error: t("Невалиден абонамент.", "Invalid subscription.") }, { status: 400 });
  }
  if (!(p.lat > 40 && p.lat < 45.5 && p.lon > 21 && p.lon < 30)) return Response.json({ error: t("Мястото е извън България.", "That place is outside Bulgaria.") }, { status: 400 });
  const old = await getSub(s.endpoint);
  const samePlace = old && old.place.lat === r(p.lat) && old.place.lon === r(p.lon);
  await saveSub({
    subscription: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } },
    place: { lat: r(p.lat), lon: r(p.lon), label: String(p.label ?? "").slice(0, 60), oblast: oblastAt(p.lat, p.lon)?.name },
    prefs: readPrefs(body?.prefs),
    lang: isLang(body?.lang) ? body.lang : langOf(req),
    // Keep what was already sent for the same place, so changing a setting does not repeat alerts.
    sent: samePlace ? old.sent : {},
    created: old?.created ?? new Date().toISOString(),
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  await connection();
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await deleteSub(body.endpoint);
  return Response.json({ ok: true });
}
