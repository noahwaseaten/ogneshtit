import type { NextRequest } from "next/server";
import { connection } from "next/server";
import { textFor } from "@shtit/core/i18n/server";
import { roundKm } from "@shtit/core/alerts";
import { getPlace } from "@/lib/air";

/** The air now, by the hour, the cleanest and dirtiest hours and the sensors nearby, for one place in Bulgaria. */
export async function GET(req: NextRequest) {
  await connection();
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!(lat > 40 && lat < 45.5 && lon > 21 && lon < 30)) {
    return Response.json({ error: textFor(req)("Местоположението е извън България.", "That location is outside Bulgaria.") }, { status: 400 });
  }
  try {
    return Response.json(await getPlace(roundKm(lat), roundKm(lon)));
  } catch (e) {
    console.error("place failed", e);
    return Response.json({ error: textFor(req)("Данните за въздуха не са достъпни в момента.", "Air data isn't available right now.") }, { status: 502 });
  }
}
