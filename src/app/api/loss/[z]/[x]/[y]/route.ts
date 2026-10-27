import { connection, type NextRequest } from "next/server";

// Proxies Global Forest Watch tree cover loss tiles (Hansen/UMD) so the browser talks only to us
// and Vercel's CDN can cache them. Loss years are filtered upstream.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/loss/[z]/[x]/[y]">) {
  await connection();
  const { z, x, y } = await ctx.params;
  const n = (s: string) => /^\d{1,7}$/.test(s);
  if (![z, x, y].every(n) || Number(z) > 12) return new Response("Bad tile", { status: 400 });

  const from = Math.max(2001, Math.min(2025, Number(req.nextUrl.searchParams.get("from")) || 2001));
  const to = Math.max(from, Math.min(2025, Number(req.nextUrl.searchParams.get("to")) || 2025));
  const url =
    `https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/${z}/${x}/${y}.png` +
    `?start_year=${from}&end_year=${to}&tree_cover_density_threshold=30`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return new Response(null, { status: 204 });
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=2592000",
      },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
