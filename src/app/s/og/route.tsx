import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getRisk } from "@/lib/risk";
import { dangerByKey, DANGERS } from "@/lib/danger";
import { DANGER_HEX, SHIELD, ogFonts } from "@/lib/og";

// Share card: today's fire danger for a place, with the next five days.
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
  const fonts = await ogFonts();
  const d = dangerByKey(risk.today.danger);
  const bg = DANGER_HEX[d.key];
  const fg = d.onColor;
  const day = (s: string) => new Intl.DateTimeFormat("bg-BG", { weekday: "short", timeZone: "UTC" }).format(new Date(s + "T00:00:00Z"));
  const date = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", timeZone: "Europe/Sofia" }).format(new Date());

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: bg, color: fg, padding: 64, fontFamily: "Onest, Onest Latin" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", background: "#1f5b3e", borderRadius: 16, padding: 6 }}>{SHIELD}</div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>ОгнеЩит</div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, opacity: 0.85 }}>{date}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
          <div style={{ fontSize: 38, fontWeight: 500, opacity: 0.9 }}>{`Опасност от горски пожар днес, ${name}`}</div>
          <div style={{ fontSize: 128, fontWeight: 700, lineHeight: 1, marginTop: 8 }}>{d.label}</div>
          <div style={{ fontSize: 32, fontWeight: 500, marginTop: 16, opacity: 0.92 }}>{d.meaning}</div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: "auto" }}>
          {risk.forecast.slice(0, 5).map((f) => {
            const x = dangerByKey(f.danger);
            return (
              <div key={f.date} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.92)", color: "#16201a", borderRadius: 18, padding: "12px 18px" }}>
                <div style={{ fontSize: 26, fontWeight: 500 }}>{day(f.date)}</div>
                <div style={{ display: "flex", width: 40, height: 40, borderRadius: 20, background: DANGER_HEX[x.key], color: x.onColor, alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700 }}>
                  {x.index + 1}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", marginLeft: "auto", alignItems: "center", fontSize: 26, fontWeight: 500, opacity: 0.85 }}>
            {`ниво ${d.index + 1} от ${DANGERS.length}`}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts, headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" } },
  );
}
