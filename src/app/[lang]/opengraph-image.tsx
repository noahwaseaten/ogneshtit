import { ImageResponse } from "next/og";
import { SHIELD, ogFonts } from "@/lib/og";
import { APP_NAME, LANGS, langFrom, pick } from "@/i18n/lang";

export const alt = "ОгнеЩит / Fire Shield";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function OgImage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#1f5b3e", color: "#f3f5f1", fontFamily: "Onest, Onest Latin" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {SHIELD}
          <div style={{ fontSize: 56, fontWeight: 700 }}>{APP_NAME[lang]}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{t("Може ли да пламне гората днес?", "Could the forest catch fire today?")}</div>
          <div style={{ fontSize: 32, fontWeight: 500, opacity: 0.85 }}>
            {t("Опасност от пожар, огън от спътник и сигнали за незаконна сеч", "Fire danger, fires seen by satellite and illegal logging reports")}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
