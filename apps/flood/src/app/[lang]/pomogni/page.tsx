import type { Metadata } from "next";
import Link from "next/link";
import { Phone, ChevronRight, Waves, Mail } from "lucide-react";
import { PageCard } from "@/lib/discord";
import { MyCoords } from "@shtit/core/ui/MyCoords";
import { langFrom, pick } from "@shtit/core/i18n/lang";
import { DIRECTORATES } from "@/data/basins";
import { FloodSteps } from "@/components/FloodSteps";

type Props = PageProps<"/[lang]/pomogni">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Помогни", "Help"),
    description: t(
      "Какво да направите преди, по време и след наводнение, 112 с точните ви координати и сигнал за запушена река до басейновата дирекция.",
      "What to do before, during and after a flood, 112 with your exact location, and reporting a blocked river to the basin directorate.",
    ),
  };
}

export default async function Pomogni({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);

  return (
    <div className="flex flex-col gap-6">
      <PageCard
        lang={lang}
        title={t("Какво да направите при наводнение", "What to do in a flood")}
        body={t("Преди, по време и след наводнение, 112 с точните ви координати и сигнал за запушена река.", "Before, during and after a flood, 112 with your exact location, and reporting a blocked river.")}
        path="/pomogni"
      />
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">{t("Помогни", "Help")}</h1>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          {/* Emergency first: biggest target, highest contrast, two lines of advice. */}
          <section aria-labelledby="sos-title" className="rounded-[24px] bg-[#123a5e] p-5 text-white [--sos:#123a5e] lg:p-6">
            <h2 id="sos-title" className="font-display text-[22px] font-semibold">
              {t("Водата се качва?", "Is the water rising?")}
            </h2>
            <p className="pt-1 text-[15px] leading-snug opacity-90">{t("Качете се нагоре: горен етаж, покрив, хълм.", "Go up: an upper floor, the roof, a hill.")}</p>
            <a href="tel:112" className="pressable mt-4 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-white text-[20px] font-bold text-[#123a5e]">
              <Phone size={24} strokeWidth={2.25} aria-hidden />
              {t("Звънни на 112", "Call 112")}
            </a>
            <div className="pt-3">
              <MyCoords />
            </div>
          </section>

          <Link href="/pomogni/signal" className="pressable hover-fill flex min-h-[72px] items-center gap-3.5 rounded-[20px] bg-card px-4 py-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tonal text-accent">
              <Waves size={22} strokeWidth={1.9} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold leading-tight">{t("Подай сигнал за река", "Report a river problem")}</span>
              <span className="block pt-0.5 text-[14px] leading-snug text-muted">{t("Запушено корито, отпадъци, дига", "Blocked bed, rubbish, a dike")}</span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
          </Link>

          <FloodSteps />
        </div>

        <section aria-labelledby="bd-title" className="flex flex-col gap-3">
          <div className="px-1">
            <h2 id="bd-title" className="font-display text-[20px] font-semibold">
              {t("Басейнови дирекции", "River basin directorates")}
            </h2>
            <p className="pt-0.5 text-[14px] leading-snug text-muted">{t("За сигнали за реките. Не са спешна служба.", "For river reports. Not an emergency service.")}</p>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
            {DIRECTORATES.map((d) => (
              <li key={d.basin} className="flex items-center gap-2 py-2 pl-4 pr-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-snug">{lang === "bg" ? d.name.replace(/^Басейнова дирекция „(.*)“$/, "$1") : d.en.replace(" Basin Directorate", "")}</span>
                  <span className="block text-[13px] tabular-nums text-muted">
                    {d.town} · {d.phones[0]}
                  </span>
                </span>
                <a href={`tel:${d.phones[0].replace(/\s/g, "")}`} aria-label={t(`Обади се на ${d.name}`, `Call the ${d.en}`)} className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-tonal text-accent">
                  <Phone size={19} strokeWidth={2} aria-hidden />
                </a>
                <a href={`mailto:${d.email}`} aria-label={t(`Пиши на ${d.email}`, `Email ${d.email}`)} className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-tonal text-accent">
                  <Mail size={19} strokeWidth={2} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
          <p className="px-1 text-[13px] text-muted">{t("От сайтовете на дирекциите, проверено на 30 октомври 2026 г.", "From the directorates' own sites, checked on 30 October 2026.")}</p>
        </section>
      </div>
    </div>
  );
}
