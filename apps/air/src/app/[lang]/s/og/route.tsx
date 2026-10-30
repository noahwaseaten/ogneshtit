import type { NextRequest } from "next/server";
import { ogFonts } from "@shtit/core/og";
import { roundKm } from "@shtit/core/alerts";
import { langFrom, pick } from "@shtit/core/i18n/lang";
import { formatters } from "@shtit/core/i18n/format";
import { getPlace } from "@/lib/air";
import { bandByKey } from "@/lib/air-types";
import { shareImage } from "@/lib/share-image";

// Share card: the air now at a place (sensors nearby when there are enough, else the forecast).
export async function GET(req: NextRequest, ctx: RouteContext<"/[lang]/s/og">) {
  const lang = await langFrom(ctx.params);
  const t = pick(lang);
  const p = req.nextUrl.searchParams;
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const name = (p.get("n") ?? "").slice(0, 40) || "България";
  if (!(lat > 40 && lat < 45.5 && lon > 21 && lon < 30)) return new Response("bad place", { status: 400 });
  const place = await getPlace(roundKm(lat), roundKm(lon)).catch(() => null);
  const measured = place?.sensors?.band ? place.sensors : null;
  const key = measured?.band ?? place?.now?.band;
  if (!place || !key) return Response.redirect(new URL(`/${lang}/opengraph-image`, req.nextUrl), 302);
  const { nf } = formatters(lang);
  const pm25 = measured?.pm25 ?? place.now?.pm25 ?? 0;
  const line = t(`Фини прахови частици: ${nf(pm25)} µg/m³${measured ? `, ${measured.count} датчика` : ", прогноза"}`, `Fine particles: ${nf(pm25)} µg/m³${measured ? `, ${measured.count} sensors` : ", forecast"}`);
  return shareImage(name, bandByKey(key), line, await ogFonts(), lang);
}
