import { Today } from "@/components/Today";
import { DiscordCard, buttons, image, text } from "@/lib/discord";
import { langFrom, pick } from "@shtit/core/i18n/lang";
import { APP_NAME } from "@/brand";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <>
      <DiscordCard
        components={[
          text(
            `## ${APP_NAME[lang]}\n${t(
              "Може ли да се диша навън днес? Въздухът по часове за всяко място в България, кога е най-чист и какво мерят датчиците наоколо.",
              "Is the air OK to breathe today? The air hour by hour anywhere in Bulgaria, when it is cleanest and what sensors nearby measure.",
            )}`,
          ),
          image(`/${lang}/opengraph-image`),
          buttons([t("Въздухът сега", "Air now"), "/"], [t("Градовете", "Cities"), "/gradove"], [t("Как да се пазя", "Protect yourself"), "/pomogni"]),
        ]}
      />
      <Today />
    </>
  );
}
