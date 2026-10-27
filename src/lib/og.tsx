import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DANGERS, dangerText, type Danger } from "@/lib/danger";
import { APP_NAME, localeOf, pick, type Lang } from "@/i18n/lang";
import { placeName } from "@/i18n/names";

/** Onest (Latin + Cyrillic) for generated images. Satori needs woff/ttf, so the files live in /assets/fonts. */
export async function ogFonts() {
  const f = (n: string) => readFile(join(process.cwd(), "assets/fonts", n));
  const [c5, c7, l5, l7] = await Promise.all([
    f("onest-cyrillic-500.woff"),
    f("onest-cyrillic-700.woff"),
    f("onest-latin-500.woff"),
    f("onest-latin-700.woff"),
  ]);
  return [
    { name: "Onest", data: c5, weight: 500 as const, style: "normal" as const },
    { name: "Onest", data: c7, weight: 700 as const, style: "normal" as const },
    { name: "Onest Latin", data: l5, weight: 500 as const, style: "normal" as const },
    { name: "Onest Latin", data: l7, weight: 700 as const, style: "normal" as const },
  ];
}

/** Hex colours for the danger classes (images cannot use CSS variables). */
export const DANGER_HEX: Record<string, string> = {
  low: "#2f7d4a",
  moderate: "#e3b021",
  high: "#e3741b",
  veryhigh: "#c7361f",
  extreme: "#8a1a12",
  veryextreme: "#4b1036",
};

export const SHIELD = (
  <svg width={64} height={64} viewBox="0 0 32 32">
    <path d="M16 2.5 27 6.6v8.2c0 7-4.7 12.6-11 14.7C9.7 27.4 5 21.8 5 14.8V6.6L16 2.5Z" fill="#f3f5f1" />
    <path d="M16 9.2c.9 2.6 4.1 4.3 4.1 8.1a4.1 4.1 0 1 1-8.2 0c0-1.9 1-3 1.9-4 .3 1.4 1 2.2 1.8 2.4-.5-2.1 0-4.4.4-6.5Z" fill="#e0482c" />
  </svg>
);

export const SHIELD_SMALL = (
  <svg width={44} height={44} viewBox="0 0 32 32">
    <path d="M16 2.5 27 6.6v8.2c0 7-4.7 12.6-11 14.7C9.7 27.4 5 21.8 5 14.8V6.6L16 2.5Z" fill="#f3f5f1" />
    <path d="M16 9.2c.9 2.6 4.1 4.3 4.1 8.1a4.1 4.1 0 1 1-8.2 0c0-1.9 1-3 1.9-4 .3 1.4 1 2.2 1.8 2.4-.5-2.1 0-4.4.4-6.5Z" fill="#e0482c" />
  </svg>
);

/** Share image for a place: one message set large, today's level, on the six-step scale used on the site. */
export function shareImage(name: string, d: Danger, fonts: Awaited<ReturnType<typeof ogFonts>>, lang: Lang = "bg") {
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
            <div style={{ display: "flex", background: "#1f5b3e", borderRadius: 14, padding: 5 }}>{SHIELD_SMALL}</div>
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
