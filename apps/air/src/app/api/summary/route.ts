import type { NextRequest } from "next/server";
import { connection } from "next/server";
import { isLang, pick } from "@shtit/core/i18n/lang";
import { formatters } from "@shtit/core/i18n/format";
import { roundKm } from "@shtit/core/alerts";
import { summaryHeaders, type AppSummary } from "@shtit/core/summary";
import { getPlace } from "@/lib/air";
import { BANDS, bandByKey, bandText, hhmm } from "@/lib/air-types";

/** The air now at a place, worded for the hub. Measured by sensors nearby when there are enough, else the forecast. */
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const l = sp.get("l");
  const lang = isLang(l) ? l : "bg";
  const t = pick(lang);
  const { nf } = formatters(lang);
  if (!(lat > 40 && lat < 45.5 && lon > 21 && lon < 30)) return Response.json({ error: "outside Bulgaria" }, { status: 400 });
  try {
    const p = await getPlace(roundKm(lat), roundKm(lon));
    const measured = p.sensors?.band ? p.sensors : null;
    const key = measured?.band ?? p.now?.band;
    if (!key) throw new Error("no air data");
    const b = bandByKey(key);
    const label = bandText(b, lang).label;
    const pm25 = measured?.pm25 ?? p.now?.pm25 ?? 0;
    const body: AppSummary = {
      app: "air",
      level: { key: b.key, index: b.index, of: BANDS.length, label, hex: b.hex, onColor: b.onColor },
      headline: t(`Въздухът сега: ${label.toLowerCase()}`, `Air now: ${label.toLowerCase()}`),
      detail:
        t(`ФПЧ2,5 ${nf(pm25)} µg/m³`, `PM2.5 ${nf(pm25)} µg/m³`) +
        (measured ? t(`, ${measured.count} датчика наоколо`, `, ${measured.count} sensors nearby`) : t(", по прогноза", ", forecast")) +
        (p.best ? t(`; най-чист ${hhmm(p.best.start)} до ${hhmm(p.best.end)}`, `; cleanest ${hhmm(p.best.start)} to ${hhmm(p.best.end)}`) : ""),
      updated: p.updated,
    };
    return Response.json(body, { headers: summaryHeaders() });
  } catch (e) {
    console.error("summary failed", e);
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
}
