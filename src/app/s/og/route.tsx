import type { NextRequest } from "next/server";
import { getRisk } from "@/lib/risk";
import { dangerByKey } from "@/lib/danger";
import { ogFonts, shareImage } from "@/lib/og";

// Share card: today's fire danger for a place.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const name = (p.get("n") ?? "").slice(0, 40) || "България";
  if (!(lat > 40 && lat < 45.5 && lon > 21 && lon < 30)) return new Response("bad place", { status: 400 });
  const r = (x: number) => Math.round(x * 100) / 100;
  let risk: Awaited<ReturnType<typeof getRisk>>;
  try {
    risk = await getRisk(r(lat), r(lon));
  } catch {
    // Weather service down: fall back to the general card rather than a broken image.
    return Response.redirect(new URL("/opengraph-image", req.nextUrl), 302);
  }
  const d = dangerByKey(risk.today.danger);
  return shareImage(name, d, await ogFonts());
}
