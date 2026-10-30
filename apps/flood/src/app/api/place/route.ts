import type { NextRequest } from "next/server";
import { connection } from "next/server";
import { textFor } from "@shtit/core/i18n/server";
import { roundKm } from "@shtit/core/alerts";
import { getPlace } from "@/lib/floods";

/** River, rain and snow for one place in Bulgaria. The point is rounded to about 1 km first. */
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
    return Response.json({ error: textFor(req)("Данните за реките и времето не са достъпни в момента.", "River and weather data aren't available right now.") }, { status: 502 });
  }
}
