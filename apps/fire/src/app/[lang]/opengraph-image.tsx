import { brandImage, OG_SIZE } from "@shtit/core/og-image";
import { LANGS, langFrom, pick } from "@shtit/core/i18n/lang";

export const alt = "ОгнеЩит / Fire Shield";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function OgImage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return brandImage(
    "fire",
    lang,
    t("Може ли да пламне гората днес?", "Could the forest catch fire today?"),
    t("Опасност от пожар, огън от спътник и сигнали за незаконна сеч", "Fire danger, fires seen by satellite and illegal logging reports"),
  );
}
