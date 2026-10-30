import type { Metadata } from "next";
import { PageCard } from "@/lib/discord";
import { MapView } from "@/components/MapView";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/karta">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Карта на реките", "River map"),
    description: t("Главните реки на България и прогнозата за тях до 15 дни, и предупрежденията на НИМХ по области.", "Bulgaria's main rivers with their 15-day forecast, and official weather warnings by province."),
  };
}

export default async function Page({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <>
      <PageCard lang={lang} title={t("Карта на реките", "River map")} body={t("Главните реки и прогнозата за тях до 15 дни, и предупрежденията по области.", "The main rivers with their 15-day forecast, and warnings by province.")} path="/karta" />
      <MapView />
    </>
  );
}
