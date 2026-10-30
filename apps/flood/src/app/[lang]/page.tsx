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
              "Ще излезе ли реката? Опасност от наводнение за всяко място в България по прогнозата на GloFAS, дъжд и топене на сняг, и какво да направите.",
              "Will the river flood? Flood danger anywhere in Bulgaria from the GloFAS forecast, rain and melting snow, and what to do.",
            )}`,
          ),
          image(`/${lang}/opengraph-image`),
          buttons([t("Опасност днес", "Danger today"), "/"], [t("Реките", "Rivers"), "/reki"], [t("Помогни", "Help"), "/pomogni"]),
        ]}
      />
      <Today />
    </>
  );
}
