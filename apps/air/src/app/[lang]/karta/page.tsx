import type { Metadata } from "next";
import { PageCard } from "@/lib/discord";
import { MapView } from "@/components/MapView";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/karta">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Карта на датчиците", "Sensor map"),
    description: t("Какво мерят гражданските датчици за фини прахови частици в България в момента.", "What citizen fine-particle sensors across Bulgaria measure right now."),
  };
}

export default async function Page({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <>
      <PageCard lang={lang} title={t("Карта на датчиците", "Sensor map")} body={t("Какво мерят гражданските датчици в момента.", "What citizen sensors measure right now.")} path="/karta" />
      <MapView />
    </>
  );
}
