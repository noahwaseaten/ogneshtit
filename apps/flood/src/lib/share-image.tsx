import { ImageResponse } from "next/og";
import { EmblemTile } from "@shtit/core/emblem";
import type { OgFonts } from "@shtit/core/og";
import { localeOf, pick, type Lang } from "@shtit/core/i18n/lang";
import { placeName } from "@shtit/core/i18n/names";
import { APP_NAME } from "@/brand";
import { LEVELS, levelText, type Level } from "./flood-types";

/** Share image for a place: today's flood danger set large, the river under it, and the five-step scale. */
export function shareImage(name: string, l: Level, river: string, fonts: OgFonts, lang: Lang = "bg") {
  const t = pick(lang);
  const fg = l.onColor;
  const label = levelText(l, lang).label;
  const place = placeName(name, lang);
  const date = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", timeZone: "Europe/Sofia" }).format(new Date());
  const big = label.length > 8 ? 124 : 168;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: l.hex, color: fg, padding: "52px 72px 60px", fontFamily: "Onest, Onest Latin" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <EmblemTile app="flood" size={54} inset={0.09} radius={14} />
            <div style={{ fontSize: 30, fontWeight: 700 }}>{APP_NAME[lang]}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, opacity: 0.8 }}>{date}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 38, fontWeight: 500, opacity: 0.88 }}>{t(`Опасност от наводнение днес, ${place}`, `Flood danger today, ${place}`)}</div>
          <div style={{ fontSize: big, fontWeight: 700, lineHeight: 1, letterSpacing: -big * 0.035, marginTop: 6 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 500, opacity: 0.85, marginTop: 12 }}>{river}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {LEVELS.map((c) => (
              <div
                key={c.key}
                style={{ display: "flex", flex: 1, height: c.index === l.index ? 22 : 14, marginTop: c.index === l.index ? 0 : 4, borderRadius: 11, background: fg, opacity: c.index === l.index ? 1 : c.index < l.index ? 0.45 : 0.2 }}
              />
            ))}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{t(`Ниво ${l.index + 1} от ${LEVELS.length}`, `Level ${l.index + 1} of ${LEVELS.length}`)}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 520, fonts, headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" } },
  );
}
