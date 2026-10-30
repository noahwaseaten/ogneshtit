import type { Metadata } from "next";
import { PageCard } from "@/lib/discord";
import { CityRanking } from "@/components/Cities";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/gradove">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Градовете днес", "Cities today"),
    description: t("Областните градове от най-мръсния до най-чистия въздух днес, по прогнозата на Copernicus.", "Bulgaria's oblast centres from the dirtiest to the cleanest air today, from the Copernicus forecast."),
  };
}

export default async function Page({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageCard lang={lang} title={t("Градовете днес", "Cities today")} body={t("Областните градове от най-мръсния до най-чистия въздух днес.", "Oblast centres from the dirtiest to the cleanest air today.")} path="/gradove" />
      <header className="flex flex-col gap-1 px-1 pt-2">
        <h1 className="font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">{t("Градовете днес", "Cities today")}</h1>
        <p className="max-w-[60ch] text-[16px] leading-snug text-muted">
          {t(
            "Най-високото ниво на фини прахови частици през деня (7 до 22 ч.) във всеки областен град. Часовете за вашето място са на началния екран.",
            "The highest fine-particle level in daytime (7:00 to 22:00) in each oblast centre. The hours for your own place are on the home screen.",
          )}
        </p>
      </header>
      <CityRanking />
    </div>
  );
}
