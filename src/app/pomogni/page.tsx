import type { Metadata } from "next";
import { Phone, Truck, Axe, ArrowUpRight } from "lucide-react";
import { MyCoords } from "@/components/MyCoords";

export const metadata: Metadata = { title: "Помогни · Гората днес" };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-line text-[14px] font-semibold tabular-nums">
        {n}
      </span>
      <span className="pt-0.5 text-[16px] leading-snug">{children}</span>
    </li>
  );
}

function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="pressable mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content"
    >
      {children}
      <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
    </a>
  );
}

export default function Pomogni() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold tracking-[-0.01em]">Какво да направите</h1>

      {/* Emergency first: biggest target, highest contrast. */}
      <section aria-labelledby="fire-title" className="rounded-[28px] bg-[#8a1a12] p-5 text-white">
        <h2 id="fire-title" className="font-display text-[24px] font-semibold">
          Виждате дим или огън?
        </h2>
        <a
          href="tel:112"
          className="pressable mt-4 flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white text-[22px] font-bold text-[#8a1a12]"
        >
          <Phone size={26} strokeWidth={2.25} aria-hidden />
          Обади се на 112
        </a>
        <p className="pt-3 text-[15px] leading-snug opacity-95">
          Обаждането работи и без мобилни данни. Кажете къде сте, какво гори и накъде отива димът.
        </p>
        <div className="pt-4">
          <MyCoords />
        </div>
        <p className="pt-4 text-[15px] leading-snug opacity-95">
          Не се опитвайте да гасите голям пожар. Отдалечете се — огънят тръгва най-бързо нагоре по склона и по
          посока на вятъра.
        </p>
      </section>

      <section aria-labelledby="truck-title" className="rounded-[28px] bg-card p-5 shadow-[var(--shadow)]">
        <div className="flex items-center gap-3">
          <Truck size={26} strokeWidth={1.5} aria-hidden />
          <h2 id="truck-title" className="font-display text-[20px] font-semibold">
            Камион с дървесина?
          </h2>
        </div>
        <ol className="mt-4 flex flex-col gap-3">
          <Step n={1}>Запишете номера на камиона и ремаркето. Снимайте товара, ако е безопасно.</Step>
          <Step n={2}>Потърсете номера в публичния регистър на превозните билети на ИАГ.</Step>
          <Step n={3}>
            Билетът важи <strong className="font-semibold">12 часа и за един курс</strong>. Сравнете вида дърва и
            количеството с това, което виждате.
          </Step>
        </ol>
        <OutLink href="https://www.iag.bg/tickets/lang/1/index">Провери в регистъра на ИАГ</OutLink>
      </section>

      <section aria-labelledby="cut-title" className="rounded-[28px] bg-card p-5 shadow-[var(--shadow)]">
        <div className="flex items-center gap-3">
          <Axe size={26} strokeWidth={1.5} aria-hidden />
          <h2 id="cut-title" className="font-display text-[20px] font-semibold">
            Незаконна сеч или бракониерство?
          </h2>
        </div>
        <p className="pt-3 text-[16px] leading-snug">
          Подайте сигнал в „Защити гората“ — приложение на Гората.бг и Изпълнителната агенция по горите. Сигналът
          стига до горските инспектори, а отговорът им се публикува.
        </p>
        <OutLink href="https://app.gorata.bg/new-report">Подай сигнал</OutLink>
      </section>
    </div>
  );
}
