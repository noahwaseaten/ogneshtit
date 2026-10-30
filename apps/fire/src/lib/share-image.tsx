import { ImageResponse } from "next/og";
import { DANGERS, dangerText, type Danger } from "@/lib/danger";
import { EmblemTile } from "@shtit/core/emblem";
import type { OgFonts } from "@shtit/core/og";
import { localeOf, pick, type Lang } from "@shtit/core/i18n/lang";
import { placeName } from "@shtit/core/i18n/names";
import { APP_NAME } from "@/brand";

/** Hex colours for the danger classes (images cannot use CSS variables). */
export const DANGER_HEX: Record<string, string> = {
  low: "#2f7d4a",
  moderate: "#e3b021",
  high: "#e3741b",
  veryhigh: "#c7361f",
  extreme: "#8a1a12",
  veryextreme: "#4b1036",
};

/** Share image for a place: one message set large, today's level, on the six-step scale used on the site. */
export function shareImage(name: string, d: Danger, fonts: OgFonts, lang: Lang = "bg") {
  const t = pick(lang);
  const bg = DANGER_HEX[d.key];
  const fg = d.onColor;
  const label = dangerText(d, lang).label;
  const place = placeName(name, lang);
  const date = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", timeZone: "Europe/Sofia" }).format(new Date());
  const big = label.length > 8 ? 124 : 168;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: bg, color: fg, padding: "52px 72px 60px", fontFamily: "Onest, Onest Latin" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <EmblemTile app="fire" size={54} inset={0.09} radius={14} />
            <div style={{ fontSize: 30, fontWeight: 700 }}>{APP_NAME[lang]}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, opacity: 0.8 }}>{date}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 38, fontWeight: 500, opacity: 0.88 }}>{t(`Опасност от пожар днес, ${place}`, `Fire danger today, ${place}`)}</div>
          <div style={{ fontSize: big, fontWeight: 700, lineHeight: 1, letterSpacing: -big * 0.035, marginTop: 6 }}>{label}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {DANGERS.map((c) => (
              <div
                key={c.key}
                style={{ display: "flex", flex: 1, height: c.index === d.index ? 22 : 14, marginTop: c.index === d.index ? 0 : 4, borderRadius: 11, background: fg, opacity: c.index === d.index ? 1 : c.index < d.index ? 0.45 : 0.2 }}
              />
            ))}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{t(`Ниво ${d.index + 1} от ${DANGERS.length}`, `Level ${d.index + 1} of ${DANGERS.length}`)}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 520, fonts, headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" } },
  );
}
