import { connection } from "next/server";
import { textFor } from "@shtit/core/i18n/server";
import { GAUGES } from "@/data/gauges";
import { getGaugeForecasts } from "@/lib/floods";

/** One river point in full: the past 30 days, 30 days of forecast with the spread, and its thresholds. */
export async function GET(req: Request, ctx: RouteContext<"/api/gauges/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const t = textFor(req);
  if (!GAUGES.some((g) => g.id === id)) return Response.json({ error: t("Няма такава точка.", "No such river point.") }, { status: 404 });
  try {
    const f = await getGaugeForecasts();
    const one = f.forecasts[id];
    if (!one) throw new Error(`no forecast for ${id}`);
    return Response.json({ ...one, backupFrom: f.backupFrom });
  } catch (e) {
    console.error("gauge failed", id, e);
    return Response.json({ error: t("Прогнозата за реките не е достъпна в момента.", "The river forecast isn't available right now.") }, { status: 502 });
  }
}
