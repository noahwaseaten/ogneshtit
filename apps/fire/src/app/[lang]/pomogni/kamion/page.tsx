import type { Metadata } from "next";
import { TruckCheck } from "@/components/TruckCheck";
import { BackLink } from "@shtit/core/ui/BackLink";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/pomogni/kamion">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return { title: t("Провери камион с дървесина", "Check a timber truck"), description: t("Проверете дали камион с дърва или трупи има валиден превозен билет в регистъра на ИАГ.", "Check whether a truck carrying firewood or logs has a valid transport ticket in the Executive Forest Agency register.") };
}

export default async function Kamion({ params }: Props) {
  const t = pick(await langFrom(params));
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <BackLink href="/pomogni" label={t("Помогни", "Help")} />
      <TruckCheck />
    </div>
  );
}
