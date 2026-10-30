import { ImageResponse } from "next/og";
import { BRANDS, type AppId } from "./brand";
import { Emblem } from "./emblem";
import { ogFonts } from "./og";
import type { Lang } from "./i18n/lang";

export const OG_SIZE = { width: 1200, height: 630 };

/** The site preview for an app: emblem and name on the app's colour, one question set large, one line under it. */
export async function brandImage(app: AppId, lang: Lang, headline: string, sub: string) {
  const b = BRANDS[app];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: b.color, color: b.shield, fontFamily: "Onest, Onest Latin" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Emblem app={app} size={64} fixed />
          <div style={{ fontSize: 56, fontWeight: 700 }}>{b.name[lang]}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{headline}</div>
          <div style={{ fontSize: 32, fontWeight: 500, opacity: 0.85 }}>{sub}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
