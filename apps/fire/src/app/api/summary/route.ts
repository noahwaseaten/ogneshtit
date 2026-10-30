import type { NextRequest } from "next/server";
import { connection } from "next/server";
import { isLang, pick } from "@shtit/core/i18n/lang";
import { roundKm } from "@shtit/core/alerts";
import { summaryHeaders, type AppSummary } from "@shtit/core/summary";
import { getRisk } from "@/lib/risk";
import { DANGERS, dangerByKey, dangerText } from "@/lib/danger";
import { DANGER_HEX } from "@/lib/share-image";

/** Today's fire danger for a place, worded for the hub. */
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
    const risk = await getRisk(roundKm(lat), roundKm(lon));
    const d = dangerByKey(risk.today.danger);
    const label = dangerText(d, lang).label;
    const body: AppSummary = {
      app: "fire",
      level: { key: d.key, index: d.index, of: DANGERS.length, label, hex: DANGER_HEX[d.key], onColor: d.onColor },
      headline: t(`${label} опасност от горски пожар днес`, `${label} forest fire danger today`),
      detail: t(`${risk.today.temp}°C, влажност ${risk.today.rh}%, вятър ${risk.today.wind} км/ч`, `${risk.today.temp}°C, humidity ${risk.today.rh}%, wind ${risk.today.wind} km/h`),
      updated: risk.updated,
    };
    return Response.json(body, { headers: summaryHeaders() });
  } catch (e) {
    console.error("summary failed", e);
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
}
