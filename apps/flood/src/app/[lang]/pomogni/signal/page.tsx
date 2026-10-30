import type { Metadata } from "next";
import { PageCard } from "@/lib/discord";
import { ReportForm } from "@/components/ReportForm";
import { BackLink } from "@shtit/core/ui/BackLink";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/pomogni/signal">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Сигнал за река", "Report a river problem"),
    description: t("Запушено корито, отпадъци, изземване на пясък или повредена дига: сигнал до басейновата дирекция.", "A blocked bed, rubbish, sand digging or a damaged dike: a report to the river basin directorate."),
  };
}

export default async function Page({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageCard lang={lang} title={t("Сигнал за река", "Report a river problem")} body={t("Подгответе сигнал до басейновата дирекция със снимки и точни координати.", "Prepare a report for the river basin directorate with photos and exact coordinates.")} path="/pomogni/signal" />
      <BackLink href="/pomogni" label={t("Помогни", "Help")} />
      <h1 className="sr-only">{t("Сигнал за река", "Report a river problem")}</h1>
      <ReportForm />
    </div>
  );
}
