import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Truck, Axe, ChevronRight } from "lucide-react";
import { PageCard } from "@/lib/discord";
import { MyCoords } from "@shtit/core/ui/MyCoords";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/pomogni">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Помогни", "Help"),
    description: t(
      "Звъннете на 112 с точните си координати, проверете камион с дървесина и подайте сигнал за незаконна сеч.",
      "Call 112 with your exact location, check a timber truck and report illegal logging.",
    ),
  };
}

export default async function Pomogni({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  const actions = [
    {
      href: "/pomogni/kamion",
      Icon: Truck,
      title: t("Провери камион с дървесина", "Check a timber truck"),
      text: t("Има ли превозен билет от последните 12 часа", "Does it have a transport ticket from the last 12 hours"),
    },
    {
      href: "/pomogni/signal",
      Icon: Axe,
      title: t("Подай сигнал за незаконна сеч", "Report illegal logging"),
      text: t("Със снимки и точни координати, до регионалната дирекция", "With photos and exact coordinates, to the regional directorate"),
    },
  ];
  const rules = t(
    [
      "Палене на огън в гората извън обозначените места и на по-малко от 100 метра от нея.",
      "Изгаряне на стърнища, сухи треви и растителни остатъци.",
      "Хвърляне на фасове и горящи предмети, особено от кола.",
      "Сеч без позволително и превоз на дървесина без превозен билет.",
    ],
    [
      "Lighting a fire in the forest outside marked places, or within 100 metres of it.",
      "Burning stubble, dry grass and plant waste.",
      "Throwing cigarette ends or anything burning, especially from a car.",
      "Cutting trees without a permit and hauling timber without a transport ticket.",
    ],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageCard
        lang={lang}
        title={t("Какво можете да направите", "What you can do")}
        body={t(
          "Звъннете на 112 с точните си координати, проверете камион с дървесина и подайте сигнал за незаконна сеч.",
          "Call 112 with your exact location, check a timber truck and report illegal logging.",
        )}
        path="/pomogni"
      />
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">{t("Какво можете да направите", "What you can do")}</h1>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Emergency first: biggest target, highest contrast. */}
        <section aria-labelledby="fire-title" className="rounded-[24px] bg-[#8a1a12] p-5 text-white lg:row-span-2 lg:p-6">
          <h2 id="fire-title" className="font-display text-[24px] font-semibold">
            {t("Виждате дим или огън?", "See smoke or fire?")}
          </h2>
          <a href="tel:112" className="pressable mt-4 flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white text-[22px] font-bold text-[#8a1a12]">
            <Phone size={26} strokeWidth={2.25} aria-hidden />
            {t("Звънни на 112", "Call 112")}
          </a>
          <p className="pt-3 text-[15px] leading-snug opacity-95">
            {t(
              "Обаждането работи и без мобилни данни. Кажете къде сте, какво гори и накъде отива димът.",
              "The call works without mobile data. Say where you are, what is burning and which way the smoke is going. Operators in Bulgaria also speak English.",
            )}
          </p>
          <div className="pt-4">
            <MyCoords />
          </div>
          <p className="pt-4 text-[15px] leading-snug opacity-95">
            {t(
              "Не гасете сами голям пожар. Отдалечете се встрани и надолу по склона: огънят се движи най-бързо нагоре и по посока на вятъра.",
              "Don't fight a big fire yourself. Move away sideways and downhill: fire moves fastest uphill and with the wind.",
            )}
          </p>
        </section>

        <nav aria-label={t("Други действия", "Other actions")} className="overflow-hidden rounded-[20px] bg-card">
          <ul className="divide-y divide-line">
            {actions.map(({ href, Icon, title, text }) => (
              <li key={href}>
                <Link href={href} className="hover-fill flex min-h-20 items-center gap-4 px-5 py-4">
                  <Icon size={24} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold leading-tight">{title}</span>
                    <span className="block pt-0.5 text-[14px] leading-snug text-muted">{text}</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="rules-title" className="rounded-[20px] bg-card p-5 lg:p-6">
          <h2 id="rules-title" className="font-display text-[20px] font-semibold">
            {t("Какво е забранено", "What's against the law")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {rules.map((r) => (
              <li key={r} className="flex gap-3 text-[16px] leading-snug">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--ember)]" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
          <p className="pt-3 text-[14px] leading-snug text-muted">
            {t(
              "Нарушенията се глобяват по Закона за горите, а предизвикването на горски пожар може да е престъпление.",
              "Breaking these rules means a fine under the Forestry Act, and starting a forest fire can be a crime.",
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
