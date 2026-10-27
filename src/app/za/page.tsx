import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Logo, REPO, ThemeControl } from "@/components/Shell";

export const metadata: Metadata = {
  title: "За приложението",
  description: "Откъде са данните в ОгнеЩит, какво пазим и как да промените темата.",
};

const SOURCES = [
  { name: "Open-Meteo", what: "Времето за последните 45 дни и прогнозата, качеството на въздуха, търсенето на населени места", href: "https://open-meteo.com" },
  { name: "NASA FIRMS", what: "Огнища, засечени от спътниците VIIRS през последните 48 часа", href: "https://firms.modaps.eosdis.nasa.gov" },
  { name: "Изпълнителна агенция по горите", what: "Горските пожари по области от 2007 г., превозните билети, контактите на регионалните дирекции", href: "https://www.iag.bg" },
  { name: "НИМХ чрез MeteoAlarm", what: "Предупрежденията за опасно време", href: "https://meteoalarm.org" },
  { name: "EFFIS", what: "Нивата на опасност, с които сравняваме индекса за пожарна опасност", href: "https://forest-fire.emergency.copernicus.eu" },
  { name: "Natural Earth", what: "Границите на областите", href: "https://www.naturalearthdata.com" },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] bg-card p-5 shadow-[var(--shadow)] lg:p-6">
      <h2 className="font-display text-[20px] font-semibold">{title}</h2>
      <div className="pt-3">{children}</div>
    </section>
  );
}

export default function Za() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3 px-1 pt-2">
        <Logo size={44} />
        <div>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em]">ОгнеЩит</h1>
          <p className="text-[15px] text-muted">Горските пожари в България, на разбираем език.</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <Card title="Тема">
            <ThemeControl />
            <p className="pt-2 text-[14px] text-muted">„Авто“ следва настройката на телефона или компютъра.</p>
          </Card>

          <Card title="Какво прави приложението">
            <div className="flex flex-col gap-3 text-[16px] leading-snug">
              <p>Казва колко лесно може да пламне гората днес там, където сте, и какво да внимавате.</p>
              <p>Показва къде спътниците са засекли огън през последните два дни.</p>
              <p>Проверява дали камион с дървесина има превозен билет и помага да подадете сигнал за незаконна сеч.</p>
              <p>Работи и без интернет: последните данни и екранът с 112 се пазят в телефона.</p>
            </div>
          </Card>

          <Card title="Какво пазим">
            <p className="text-[16px] leading-snug">
              Нищо на сървър. Избраното място, темата и последните данни стоят само на вашето устройство. Координатите
              закръгляме до около 1 км, преди да поискаме прогнозата. Сигналите се изпращат от вашия имейл или телефон,
              не от нас.
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Откъде са данните">
            <ul className="-mx-1 flex flex-col">
              {SOURCES.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="flex min-h-12 items-start justify-between gap-3 rounded-xl px-1 py-2 hover:bg-line/50">
                    <span>
                      <span className="block text-[16px] font-medium">{s.name}</span>
                      <span className="block text-[14px] leading-snug text-muted">{s.what}</span>
                    </span>
                    <ExternalLink size={16} strokeWidth={2} className="mt-1 shrink-0 text-muted" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <p className="pt-3 text-[14px] leading-snug text-muted">
              ОгнеЩит не е официален източник. При опасност следвайте указанията на 112, ГДПБЗН и горските служители.
            </p>
          </Card>

          <Card title="Отворен код">
            <p className="text-[16px] leading-snug">
              Кодът е публичен под лиценз MIT. Грешки и идеи може да пишете в GitHub.
            </p>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-line px-4 text-[15px] font-semibold"
            >
              Към GitHub
              <ExternalLink size={16} strokeWidth={2} aria-hidden />
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}
