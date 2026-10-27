import type { Metadata } from "next";
import { TruckCheck } from "@/components/TruckCheck";
import { BackLink } from "@/components/BackLink";

export const metadata: Metadata = {
  title: "Провери камион с дървесина",
  description: "Проверете дали камион с дърва или трупи има валиден превозен билет в регистъра на ИАГ.",
};

export default function Kamion() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <BackLink href="/pomogni" label="Помогни" />
      <TruckCheck />
    </div>
  );
}
