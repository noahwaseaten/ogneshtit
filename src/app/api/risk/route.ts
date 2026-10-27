import type { NextRequest } from "next/server";
import { getRisk } from "@/lib/risk";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  // Bulgaria and a margin around it only.
  if (!(lat > 40 && lat < 45.5 && lon > 21 && lon < 30)) {
    return Response.json({ error: "Местоположението е извън България." }, { status: 400 });
  }
  // ~1 km grid: better caching, and we never store a precise position.
  const r = (x: number) => Math.round(x * 100) / 100;
  try {
    return Response.json(await getRisk(r(lat), r(lon)));
  } catch {
    return Response.json({ error: "Метеоданните не са достъпни в момента." }, { status: 502 });
  }
}
