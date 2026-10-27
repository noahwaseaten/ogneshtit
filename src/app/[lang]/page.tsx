import { Today } from "@/components/Today";
import { DiscordCard, buttons, image, text } from "@/lib/discord";
import { APP_NAME, langFrom, pick } from "@/i18n/lang";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <>
      <DiscordCard
        components={[
          text(
            `## ${APP_NAME[lang]}\n${t(
              "Може ли да пламне гората днес? Опасност от горски пожар за всяко място в България, огън, засечен от спътник, и сигнали за незаконна сеч.",
              "Could the forest catch fire today? Forest fire danger for anywhere in Bulgaria, fires spotted by satellite and reports of illegal logging.",
            )}`,
          ),
          image(`/${lang}/opengraph-image`),
          buttons([t("Опасност днес", "Danger today"), "/"], [t("Карта на пожарите", "Fire map"), "/karta"], [t("Помогни", "Help"), "/pomogni"]),
        ]}
      />
      <Today />
    </>
  );
}
