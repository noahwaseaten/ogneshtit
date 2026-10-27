import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Truck, Axe, ChevronRight } from "lucide-react";
import { MyCoords } from "@/components/MyCoords";

const ACTIONS = [
  { href: "/pomogni/kamion", Icon: Truck, title: "Провери камион с дървесина", text: "Има ли превозен билет от последните 12 часа" },
  { href: "/pomogni/signal", Icon: Axe, title: "Подай сигнал за незаконна сеч", text: "Със снимки и точни координати, до регионалната дирекция" },
];

export const metadata: Metadata = {
  title: "Помогни",
  description: "Звъннете на 112 с точните си координати, проверете камион с дървесина и подайте сигнал за незаконна сеч.",
};

const RULES = [
  "Палене на огън в гората извън обозначените места и на по-малко от 100 метра от нея.",
  "Изгаряне на стърнища, сухи треви и растителни остатъци.",
  "Хвърляне на фасове и горящи предмети, особено от кола.",
  "Сеч без позволително и превоз на дървесина без превозен билет.",
];

export default function Pomogni() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">Какво можете да направите</h1>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* Emergency first: biggest target, highest contrast. */}
          <section aria-labelledby="fire-title" className="rounded-[24px] bg-[#8a1a12] p-5 text-white lg:row-span-2 lg:p-6">
            <h2 id="fire-title" className="font-display text-[24px] font-semibold">
              Виждате дим или огън?
            </h2>
            <a
              href="tel:112"
              className="pressable mt-4 flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white text-[22px] font-bold text-[#8a1a12]"
            >
              <Phone size={26} strokeWidth={2.25} aria-hidden />
              Звънни на 112
            </a>
            <p className="pt-3 text-[15px] leading-snug opacity-95">
              Обаждането работи и без мобилни данни. Кажете къде сте, какво гори и накъде отива димът.
            </p>
            <div className="pt-4">
              <MyCoords />
            </div>
            <p className="pt-4 text-[15px] leading-snug opacity-95">
              Не гасете сами голям пожар. Отдалечете се встрани и надолу по склона: огънят се движи най-бързо нагоре и по
              посока на вятъра.
            </p>
          </section>

          <nav aria-label="Други действия" className="overflow-hidden rounded-[20px] bg-card">
            <ul className="divide-y divide-line">
              {ACTIONS.map(({ href, Icon, title, text }) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-20 items-center gap-4 px-5 py-4 hover:bg-line/40 active:bg-line">
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
            <div>
              <h2 id="rules-title" className="font-display text-[20px] font-semibold">
                Какво е забранено
              </h2>
            </div>
            <ul className="mt-3 flex flex-col gap-2.5">
              {RULES.map((r) => (
                <li key={r} className="flex gap-3 text-[16px] leading-snug">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--ember)]" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
            <p className="pt-3 text-[14px] leading-snug text-muted">
              Нарушенията се глобяват по Закона за горите, а предизвикването на горски пожар може да е престъпление.
            </p>
          </section>
      </div>
    </div>
  );
}
