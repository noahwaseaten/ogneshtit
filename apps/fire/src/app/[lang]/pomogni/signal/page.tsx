import type { Metadata } from "next";
import { ReportForm } from "@/components/ReportForm";
import { BackLink } from "@shtit/core/ui/BackLink";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/pomogni/signal">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return { title: t("Сигнал за незаконна сеч", "Report illegal logging"), description: t("Подгответе сигнал със снимки и точни координати и го изпратете до регионалната дирекция по горите.", "Put together a report with photos and exact coordinates and send it to the regional forest directorate.") };
}

export default async function Signal({ params }: Props) {
  const t = pick(await langFrom(params));
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <BackLink href="/pomogni" label={t("Помогни", "Help")} />
      <ReportForm />
    </div>
  );
}
