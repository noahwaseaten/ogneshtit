import { ImageResponse } from "next/og";
import { EmblemTile } from "@shtit/core/emblem";
import type { OgFonts } from "@shtit/core/og";
import { localeOf, pick, type Lang } from "@shtit/core/i18n/lang";
import { placeName } from "@shtit/core/i18n/names";
import { APP_NAME } from "@/brand";
import { BANDS, bandText, type Band } from "./air-types";

/** Share image for a place: the air now set large, the particle number under it, and the six-step EEA scale. */
export function shareImage(name: string, b: Band, line: string, fonts: OgFonts, lang: Lang = "bg") {
  const t = pick(lang);
  const fg = b.onColor;
  const label = bandText(b, lang).label;
  const place = placeName(name, lang);
  const date = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sofia" }).format(new Date());
  const big = label.length > 10 ? 104 : label.length > 7 ? 128 : 168;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: b.hex, color: fg, padding: "52px 72px 60px", fontFamily: "Onest, Onest Latin" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <EmblemTile app="air" size={54} inset={0.09} radius={14} />
            <div style={{ fontSize: 30, fontWeight: 700 }}>{APP_NAME[lang]}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, opacity: 0.8 }}>{date}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 38, fontWeight: 500, opacity: 0.88 }}>{t(`Въздухът сега, ${place}`, `The air now, ${place}`)}</div>
          <div style={{ fontSize: big, fontWeight: 700, lineHeight: 1, letterSpacing: -big * 0.035, marginTop: 6 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 500, opacity: 0.85, marginTop: 12 }}>{line}</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {BANDS.map((c) => (
            <div key={c.key} style={{ display: "flex", flex: 1, height: c.index === b.index ? 22 : 14, marginTop: c.index === b.index ? 0 : 4, borderRadius: 11, background: fg, opacity: c.index === b.index ? 1 : c.index < b.index ? 0.45 : 0.2 }} />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 520, fonts, headers: { "Cache-Control": "public, max-age=900, s-maxage=900" } },
  );
}
