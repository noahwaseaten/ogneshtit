import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { Logo, REPO, ThemeControl } from "@/components/Shell";
import { InstallHelp } from "@/components/InstallHelp";
import { Alerts } from "@/components/Alerts";

export const metadata: Metadata = {
  title: "За ОгнеЩит",
  description: "Кой е направил ОгнеЩит, откъде са данните и настройки.",
};

const SOURCES = [
  ["Open-Meteo", "време и въздух", "https://open-meteo.com"],
  ["NASA FIRMS", "огън от спътник", "https://firms.modaps.eosdis.nasa.gov"],
  ["ИАГ", "пожари, превозни билети", "https://www.iag.bg"],
  ["НИМХ", "предупреждения", "https://meteoalarm.org"],
  ["EFFIS", "нива на опасност", "https://forest-fire.emergency.copernicus.eu"],
];

const row = "flex min-h-12 items-center justify-between gap-3 px-4 py-3";

export default function Za() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col items-center gap-2 pt-4 text-center">
        <Logo size={56} />
        <h1 className="font-display text-[28px] font-bold leading-tight">ОгнеЩит</h1>
        <p className="text-[16px] text-muted">
          Направено от{" "}
          <a href="https://noahwaseaten.com/" target="_blank" rel="noreferrer" className="font-semibold text-content underline decoration-line underline-offset-4 hover:decoration-current">
            Камен
          </a>
        </p>
      </header>

      <section aria-labelledby="look" className="flex flex-col gap-2">
        <h2 id="look" className="px-1 text-[17px] font-semibold">
          Тема
        </h2>
        <ThemeControl />
      </section>

      <InstallHelp />

      <Alerts />

      <section aria-labelledby="data" className="flex flex-col gap-2">
        <h2 id="data" className="px-1 text-[17px] font-semibold">
          Откъде са данните
        </h2>
        <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
          {SOURCES.map(([name, what, href]) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noreferrer" className={`${row} hover:bg-line/40`}>
                <span className="text-[16px] font-medium">{name}</span>
                <span className="flex items-center gap-1.5 text-[14px] text-muted">
                  {what}
                  <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="px-1 text-[14px] leading-snug text-muted">
          ОгнеЩит не е официален източник. Нищо за вас не се пази на сървър: мястото и настройките стоят само в телефона.
        </p>
      </section>

      <a href={REPO} target="_blank" rel="noreferrer" className={`${row} rounded-[20px] bg-card hover:bg-line/40`}>
        <span className="text-[16px] font-medium">Отворен код в GitHub</span>
        <ArrowUpRight size={16} strokeWidth={2} className="text-muted" aria-hidden />
      </a>
    </div>
  );
}
