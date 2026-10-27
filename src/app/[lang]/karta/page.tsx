import type { Metadata } from "next";
import { PageCard } from "@/lib/discord";
import { MapView } from "@/components/MapView";
import { langFrom, pick } from "@/i18n/lang";

type Props = PageProps<"/[lang]/karta">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Карта", "Map"),
    description: t(
      "Огън, засечен от спътник през последните 48 часа, опасността днес по области и изгорялата гора тази година.",
      "Fire spotted by satellite in the last 48 hours, today's danger by oblast and the forest burnt this year.",
    ),
  };
}

export default async function Page({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <>
      <PageCard lang={lang} title={t("Карта на пожарите", "Fire map")} body={t(
      "Огън, засечен от спътник през последните 48 часа, опасността днес по области и изгорялата гора тази година.",
      "Fire spotted by satellite in the last 48 hours, today's danger by oblast and the forest burnt this year.",
    )} path="/karta" />
      <MapView />
    </>
  );
}
