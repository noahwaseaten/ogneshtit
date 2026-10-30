import type { Metadata } from "next";
import Link from "next/link";
import { Phone, ChevronRight, Waves, ArrowUpRight } from "lucide-react";
import { PageCard } from "@/lib/discord";
import { MyCoords } from "@shtit/core/ui/MyCoords";
import { langFrom, pick } from "@shtit/core/i18n/lang";
import { DIRECTORATES } from "@/data/basins";

type Props = PageProps<"/[lang]/pomogni">;

// What to do before, during and after a flood, in plain words. Based on the advice of ГДПБЗН (the fire safety and
// civil protection service of the Ministry of Interior), linked below so people can read the original.
const GDPBZN = "https://mvr.bg/gdpbzn/info-center/pravila-povedenie/pri-navodnenia";

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
  const steps = [
    {
      id: "before",
      title: t("Преди", "Before"),
      items: t(
        [
          "Разберете от общината или от басейновата дирекция дали домът ви е в зона, която се залива.",
          "Пригответе раница: документи, лекарства, фенер, зарядно, радио, топли дрехи и вода и храна за 3 дни.",
          "Уговорете със семейството къде се събирате и по кой път излизате. Запишете важните телефони на хартия.",
          "Следете прогнозата и предупрежденията. При опасност BG-ALERT изпраща съобщение на телефона.",
        ],
        [
          "Ask the municipality or the basin directorate whether your home is in an area that floods.",
          "Pack a bag: documents, medicines, a torch, a charger, a radio, warm clothes, and water and food for 3 days.",
          "Agree with your family where to meet and which way to leave. Write important numbers on paper.",
          "Follow the forecast and warnings. In an emergency BG-ALERT sends a message to your phone.",
        ],
      ),
    },
    {
      id: "during",
      title: t("По време", "During"),
      items: t(
        [
          "Спрете тока и газта, ако водата приближава къщата.",
          "Качете ценните неща колкото може по-високо.",
          "Ако водата се качва, тръгнете с раницата. Ако не можете да излезете, качете се на горния етаж или покрива и звъннете на 112.",
          "Близо до река или дере веднага се качете на по-високо място. Не стойте на мостове и в подлези.",
          "Никога не газете в течаща вода. С кола минавайте само ако водата е под осите, а най-добре изобщо не минавайте.",
        ],
        [
          "Turn off the power and gas if water is coming towards the house.",
          "Move valuables as high as you can.",
          "If the water is rising, leave with your bag. If you can't get out, go to the top floor or the roof and call 112.",
          "Near a river or ravine, move to higher ground at once. Don't stand on bridges or in underpasses.",
          "Never walk through moving water. Only drive through if the water is below the axles, and better not at all.",
        ],
      ),
    },
    {
      id: "after",
      title: t("След", "After"),
      items: t(
        [
          "Върнете се у дома, едва когато властите кажат, че е безопасно.",
          "Не пускайте тока, докато електротехник не провери таблото и уредите.",
          "Не пийте вода от чешмата, ако цветът, мирисът или вкусът са странни. Пийте бутилирана.",
          "Изхвърлете храната, до която е стигнала водата.",
        ],
        [
          "Go home only when the authorities say it is safe.",
          "Don't switch the power back on until an electrician has checked the board and appliances.",
          "Don't drink tap water if its colour, smell or taste is odd. Drink bottled water.",
          "Throw away food that the flood water reached.",
        ],
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageCard
        lang={lang}
        title={t("Какво да направите при наводнение", "What to do in a flood")}
        body={t("Преди, по време и след наводнение, 112 с точните ви координати и сигнал за запушена река.", "Before, during and after a flood, 112 with your exact location, and reporting a blocked river.")}
        path="/pomogni"
      />
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">{t("Какво можете да направите", "What you can do")}</h1>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Emergency first: biggest target, highest contrast. */}
        <section aria-labelledby="sos-title" className="rounded-[24px] bg-[#123a5e] p-5 text-white [--sos:#123a5e] lg:row-span-2 lg:p-6">
          <h2 id="sos-title" className="font-display text-[24px] font-semibold">
            {t("Водата се качва?", "Is the water rising?")}
          </h2>
          <a href="tel:112" className="pressable mt-4 flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white text-[22px] font-bold text-[#123a5e]">
            <Phone size={26} strokeWidth={2.25} aria-hidden />
            {t("Звънни на 112", "Call 112")}
          </a>
          <p className="pt-3 text-[15px] leading-snug opacity-95">
            {t(
              "Обаждането работи и без мобилни данни. Кажете къде сте, колко души сте и докъде е стигнала водата.",
              "The call works without mobile data. Say where you are, how many of you there are and how high the water is. Operators in Bulgaria also speak English.",
            )}
          </p>
          <div className="pt-4">
            <MyCoords />
          </div>
          <p className="pt-4 text-[15px] leading-snug opacity-95">
            {t(
              "Качете се нагоре: горен етаж, покрив или хълм. Не влизайте в течаща вода, дори да изглежда плитка.",
              "Go up: an upper floor, the roof or a hill. Don't step into moving water, even if it looks shallow.",
            )}
          </p>
        </section>

        <nav aria-label={t("Други действия", "Other actions")} className="overflow-hidden rounded-[20px] bg-card">
          <Link href="/pomogni/signal" className="hover-fill flex min-h-20 items-center gap-4 px-5 py-4">
            <Waves size={24} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold leading-tight">{t("Подай сигнал за река", "Report a river problem")}</span>
              <span className="block pt-0.5 text-[14px] leading-snug text-muted">
                {t("Запушено корито, отпадъци, изкопан пясък или повредена дига, до басейновата дирекция", "A blocked bed, rubbish, dug-out gravel or a damaged dike, to the basin directorate")}
              </span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
          </Link>
        </nav>

        <section aria-labelledby="steps-title" className="rounded-[20px] bg-card p-5 lg:p-6">
          <h2 id="steps-title" className="font-display text-[20px] font-semibold">
            {t("Преди, по време и след наводнение", "Before, during and after a flood")}
          </h2>
          <div className="mt-3 flex flex-col gap-5">
            {steps.map((s) => (
              <div key={s.id}>
                <h3 className="text-[16px] font-semibold">{s.title}</h3>
                <ul className="mt-2 flex flex-col gap-2.5">
                  {s.items.map((r) => (
                    <li key={r} className="flex gap-3 text-[16px] leading-snug">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <a href={GDPBZN} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-accent">
            {t("Пълните указания на ГДПБЗН", "The full advice from ГДПБЗН (in Bulgarian)")}
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
          </a>
        </section>

        <section aria-labelledby="bd-title" className="rounded-[20px] bg-card p-5 lg:col-span-2 lg:p-6">
          <h2 id="bd-title" className="font-display text-[20px] font-semibold">
            {t("Басейнови дирекции", "River basin directorates")}
          </h2>
          <p className="pt-1 text-[15px] leading-snug text-muted">
            {t(
              "Те управляват реките и приемат сигнали за запушени корита, отпадъци, изземване на пясък и повредени брегове. Не са спешна служба: при опасност звъннете на 112.",
              "They manage the rivers and take reports about blocked beds, rubbish, sand digging and damaged banks. They are not an emergency service: in danger, call 112.",
            )}
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {DIRECTORATES.map((d) => (
              <li key={d.basin} className="rounded-2xl bg-surface p-4">
                <p className="text-[16px] font-semibold leading-tight">{lang === "bg" ? d.name : d.en}</p>
                <p className="pt-1 text-[14px] text-muted">{d.address}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[15px] font-medium tabular-nums">
                  {d.phones.map((p) => (
                    <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center text-accent">
                      {p}
                    </a>
                  ))}
                  <a href={`mailto:${d.email}`} className="inline-flex min-h-11 items-center text-accent">
                    {d.email}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="pt-3 text-[13px] text-muted">{t("Контактите са от сайтовете на дирекциите, проверени на 30 октомври 2026 г.", "Contacts are from the directorates' own sites, checked on 30 October 2026.")}</p>
        </section>
      </div>
    </div>
  );
}
