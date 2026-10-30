import { brandImage, OG_SIZE } from "@shtit/core/og-image";
import { LANGS, langFrom, pick } from "@shtit/core/i18n/lang";

export const alt = "ВодоЩит / Flood Shield";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function OgImage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return brandImage(
    "flood",
    lang,
    t("Ще излезе ли реката днес?", "Will the river flood today?"),
    t("Реките по прогнозата на GloFAS, дъжд и топене на сняг, какво да направите", "Rivers from the GloFAS forecast, rain and melting snow, what to do"),
  );
}
