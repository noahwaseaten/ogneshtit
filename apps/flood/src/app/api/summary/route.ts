import type { NextRequest } from "next/server";
import { connection } from "next/server";
import { isLang, pick } from "@shtit/core/i18n/lang";
import { formatters } from "@shtit/core/i18n/format";
import { roundKm } from "@shtit/core/alerts";
import { summaryHeaders, type AppSummary } from "@shtit/core/summary";
import { GAUGES } from "@/data/gauges";
import { getPlace } from "@/lib/floods";
import { LEVELS, NEAR_KM, gaugeName, levelByKey, levelText } from "@/lib/flood-types";

/** Today's flood danger for a place, worded for the hub. */
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const l = sp.get("l");
  const lang = isLang(l) ? l : "bg";
  const t = pick(lang);
  if (!(lat > 40 && lat < 45.5 && lon > 21 && lon < 30)) return Response.json({ error: "outside Bulgaria" }, { status: 400 });
  try {
    const place = await getPlace(roundKm(lat), roundKm(lon));
    const river = place.river;
    const g = river && GAUGES.find((x) => x.id === river.gauge);
    const day = river?.days[0];
    const rain3 = formatters(lang).nf(place.weather?.days.slice(0, 3).reduce((s, d) => s + d.precip, 0) ?? 0, 0);
    let body: AppSummary;
    if (g && day) {
      const lv = levelByKey(day.level);
      const label = levelText(lv, lang).label;
      body = {
        app: "flood",
        level: { key: lv.key, index: lv.index, of: LEVELS.length, label, hex: lv.hex, onColor: lv.onColor },
        headline: t(`${label} опасност от наводнение днес`, `${label} flood danger today`),
        detail: t(`${gaugeName(g, "bg")}; дъжд ${rain3} мм за 3 дни`, `${gaugeName(g, "en")}; ${rain3} mm of rain over 3 days`),
        updated: river.updated,
      };
    } else {
      body = {
        app: "flood",
        level: null,
        headline: t(`Няма голяма река до ${NEAR_KM} км`, `No large river within ${NEAR_KM} km`),
        detail: t(`Дъжд ${rain3} мм за 3 дни`, `${rain3} mm of rain over 3 days`),
        updated: place.updated,
      };
    }
    return Response.json(body, { headers: summaryHeaders() });
  } catch (e) {
    console.error("summary failed", e);
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
}
