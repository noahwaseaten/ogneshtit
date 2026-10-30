import type { Metadata } from "next";
import { PageCard } from "@/lib/discord";
import { RiversView } from "@/components/RiversView";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/reki">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Реките днес", "Rivers today"),
    description: t(
      "Всяка голяма река в България: водата днес спрямо обичайното, прогноза за 15 дни, най-високата вода от 1984 г. и измерените нива на Дунав.",
      "Every large river in Bulgaria: today's flow against usual, a 15-day forecast, the highest water since 1984 and measured Danube levels.",
    ),
  };
}

export default async function Page({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <>
      <PageCard lang={lang} title={t("Реките днес", "Rivers today")} body={t("Водата днес, прогноза за 15 дни и измерените нива на Дунав.", "Today's flow, a 15-day forecast and measured Danube levels.")} path="/reki" />
      <RiversView />
    </>
  );
}
