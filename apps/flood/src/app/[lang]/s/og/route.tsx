import type { NextRequest } from "next/server";
import { ogFonts } from "@shtit/core/og";
import { roundKm } from "@shtit/core/alerts";
import { langFrom } from "@shtit/core/i18n/lang";
import { GAUGES } from "@/data/gauges";
import { getPlace } from "@/lib/floods";
import { gaugeName, levelByKey } from "@/lib/flood-types";
import { shareImage } from "@/lib/share-image";

// Share card: today's flood danger for a place, from the riskiest river within 25 km.
export async function GET(req: NextRequest, ctx: RouteContext<"/[lang]/s/og">) {
  const lang = await langFrom(ctx.params);
  const p = req.nextUrl.searchParams;
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const name = (p.get("n") ?? "").slice(0, 40) || "България";
  if (!(lat > 40 && lat < 45.5 && lon > 21 && lon < 30)) return new Response("bad place", { status: 400 });
  const place = await getPlace(roundKm(lat), roundKm(lon)).catch(() => null);
  const river = place?.river;
  const g = river && GAUGES.find((x) => x.id === river.gauge);
  // No river nearby or the forecast is down: the general card rather than a broken image.
  if (!river || !g || !river.days[0]) return Response.redirect(new URL(`/${lang}/opengraph-image`, req.nextUrl), 302);
  return shareImage(name, levelByKey(river.days[0].level), gaugeName(g, lang), await ogFonts(), lang);
}
