import type { Metadata } from "next";
import { PageCard } from "@/lib/discord";
import { FireStats } from "@/components/FireStats";
import { langFrom, pick } from "@/i18n/lang";

type Props = PageProps<"/[lang]/pozhari">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Пожари по области", "Fires by oblast"),
    description: t(
      "Колко горски пожара е имало във всяка област на България, колко гора е изгоряла и защо. Данни на ИАГ от 2007 г. насам.",
      "How many forest fires each Bulgarian oblast has had, how much forest burnt and why. Official data since 2007.",
    ),
  };
}

export default async function Page({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <>
      <PageCard lang={lang} title={t("Пожари по области", "Fires by oblast")} body={t(
      "Колко горски пожара е имало във всяка област на България, колко гора е изгоряла и защо. Данни на ИАГ от 2007 г. насам.",
      "How many forest fires each Bulgarian oblast has had, how much forest burnt and why. Official data since 2007.",
    )} path="/pozhari" />
      <FireStats />
    </>
  );
}
