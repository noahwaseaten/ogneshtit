import { brandImage, OG_SIZE } from "@shtit/core/og-image";
import { LANGS, langFrom, pick } from "@shtit/core/i18n/lang";

export const alt = "ВъздухоЩит / Air Shield";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function OgImage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return brandImage(
    "air",
    lang,
    t("Може ли да се диша навън днес?", "Is the air OK to breathe today?"),
    t("Смогът по часове, кога е най-чист въздухът, граждански датчици наоколо", "Smog hour by hour, when the air is cleanest, citizen sensors nearby"),
  );
}
