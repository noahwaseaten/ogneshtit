import type { Metadata } from "next";
import { ReportForm } from "@/components/ReportForm";
import { BackLink } from "@/components/BackLink";

export const metadata: Metadata = {
  title: "Сигнал за незаконна сеч",
  description: "Подгответе сигнал със снимки и точни координати и го изпратете до регионалната дирекция по горите.",
};

export default function Signal() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <BackLink href="/pomogni" label="Помогни" />
      <ReportForm />
    </div>
  );
}
