import { brandImage, OG_SIZE } from "@shtit/core/og-image";
import { LANGS, langFrom, pick } from "@shtit/core/i18n/lang";

export const alt = "Щит / Shield";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function OgImage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return brandImage("hub", lang, t("Огън и вода, днес, за вашето място", "Fire and water, today, for your place"), t("ОгнеЩит за горските пожари, ВодоЩит за наводненията", "Fire Shield for forest fires, Flood Shield for floods"));
}
