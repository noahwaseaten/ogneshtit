import { ImageResponse } from "next/og";
import { SHIELD, ogFonts } from "@/lib/og";

export const alt = "ОгнеЩит: опасност от горски пожар днес";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#1f5b3e", color: "#f3f5f1", fontFamily: "Onest, Onest Latin" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {SHIELD}
          <div style={{ fontSize: 56, fontWeight: 700 }}>ОгнеЩит</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>Може ли да пламне гората днес?</div>
          <div style={{ fontSize: 32, fontWeight: 500, opacity: 0.85 }}>Опасност от пожар, огън от спътник и сигнали за незаконна сеч</div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
