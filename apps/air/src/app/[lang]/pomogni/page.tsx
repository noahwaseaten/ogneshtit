import type { Metadata } from "next";
import { Phone, ArrowUpRight, Flame, Wind, Users } from "lucide-react";
import { PageCard } from "@/lib/discord";
import { langFrom, pick } from "@shtit/core/i18n/lang";

type Props = PageProps<"/[lang]/pomogni">;

const EEA_BG = "https://www.eea.europa.eu/en/europe-environment-2025/countries/bulgaria/health-impacts-of-air-pollution";
const EEA_INDEX = "https://airindex.eea.europa.eu/AQI/index.html";
const EURONEWS = "https://www.euronews.com/2025/01/20/which-countries-have-the-deadliest-air-pollution-in-europe";
const MOEW_GREEN = "https://www.moew.government.bg/bg/zelen-telefon-za-podavane-na-signali/";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = pick(await langFrom(params));
  return {
    title: t("Как да се пазите", "Protect yourself"),
    description: t(
      "Защо зимата въздухът в България е мръсен, как да се пазите вие и децата и къде да подадете сигнал за горене на отпадъци.",
      "Why Bulgaria's winter air is dirty, how to protect yourself and your children, and where to report waste burning.",
    ),
  };
}

export default async function Pomogni({ params }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  const protect = t(
    [
      "Гледайте „Кога да излезете“ на началния екран: разходка, тичане и проветряване правете в часовете с най-чист въздух.",
      "В часовете с най-мръсен въздух дръжте прозорците затворени.",
      "Децата, възрастните и хората с астма, сърдечни или белодробни болести са по-чувствителни. Изберете „Деца, възрастни, астма“ на началния екран, за да виждате съветите за тях.",
      "Ако усетите кашлица, смъдене в очите или гърлото, намалете усилените занимания навън. Това е съветът на Европейската агенция за околна среда.",
    ],
    [
      "Check \"When to go out\" on the home screen: walk, run and air the room in the hours with the cleanest air.",
      "Keep the windows shut in the hours with the dirtiest air.",
      "Children, older people and people with asthma, heart or lung disease are more sensitive. Choose \"Children, elderly, asthma\" on the home screen to see advice for them.",
      "If you start coughing or your eyes or throat sting, cut down on hard exercise outdoors. That is the European Environment Agency's advice.",
    ],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageCard
        lang={lang}
        title={t("Как да се пазите от смога", "Protect yourself from smog")}
        body={t("Защо зимата въздухът е мръсен, как да се пазите и къде да подадете сигнал.", "Why winter air is dirty, how to protect yourself and where to report.")}
        path="/pomogni"
      />
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">{t("Как да се пазите", "Protect yourself")}</h1>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="why-title" className="rounded-[24px] bg-accent p-5 text-accent-content lg:p-6">
          <Wind size={26} strokeWidth={1.75} aria-hidden />
          <h2 id="why-title" className="pt-3 font-display text-[24px] font-semibold">
            {t("Защо зимата?", "Why winter?")}
          </h2>
          <p className="pt-2 text-[16px] leading-snug opacity-95">
            {t(
              "Най-много фини прахови частици в България идват от отоплението в домовете: печки на дърва и въглища. Затова зимата въздухът в градовете и селата е най-мръсен.",
              "Most fine particles in Bulgaria come from heating homes: wood and coal stoves. That is why the air in towns and villages is dirtiest in winter.",
            )}
          </p>
          <p className="pt-3 text-[16px] leading-snug opacity-95">
            {t(
              "България има най-високата в ЕС смъртност, свързана с фините прахови частици: 158 преждевременни смъртни случая на 100 000 души.",
              "Bulgaria has the EU's highest death rate linked to fine particles: 158 premature deaths per 100,000 people.",
            )}
          </p>
          <p className="flex flex-wrap gap-2 pt-4">
            <a href={EEA_BG} target="_blank" rel="noreferrer" className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/15 px-4 text-[14px] font-semibold">
              {t("EEA за България", "EEA on Bulgaria")}
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
            </a>
            <a href={EURONEWS} target="_blank" rel="noreferrer" className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/35 px-4 text-[14px] font-semibold">
              {t("Euronews по данни на EEA", "Euronews on EEA data")}
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
            </a>
          </p>
        </section>

        <section aria-labelledby="protect-title" className="rounded-[20px] bg-card p-5 lg:p-6">
          <Users size={24} strokeWidth={1.75} className="text-accent" aria-hidden />
          <h2 id="protect-title" className="pt-3 font-display text-[20px] font-semibold">
            {t("Вие и децата", "You and your children")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {protect.map((r) => (
              <li key={r} className="flex gap-3 text-[16px] leading-snug">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
          <a href={EEA_INDEX} target="_blank" rel="noreferrer" className="pressable mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[15px] font-semibold">
            {t("Европейският индекс за качество на въздуха", "The European Air Quality Index")}
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
          </a>
        </section>

        <section aria-labelledby="burn-title" className="rounded-[20px] bg-card p-5 lg:p-6">
          <Flame size={24} strokeWidth={1.75} className="text-accent" aria-hidden />
          <h2 id="burn-title" className="pt-3 font-display text-[20px] font-semibold">
            {t("Някой гори отпадъци?", "Someone burning rubbish?")}
          </h2>
          <p className="pt-2 text-[16px] leading-snug">
            {t(
              "Пластмаса, гуми и боклук в печката замърсяват въздуха на цялата улица. Подайте сигнал до отдел „Екология“ на общината или до регионалната инспекция по околна среда (РИОСВ) през зеления телефон на МОСВ.",
              "Plastic, tyres and rubbish in a stove pollute the air of the whole street. Report it to the municipality's ecology department, or to the regional environment inspectorate (РИОСВ) through the environment ministry's green phone.",
            )}
          </p>
          <a href={MOEW_GREEN} target="_blank" rel="noreferrer" className="pressable mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-tonal px-4 text-[15px] font-semibold">
            {t("Зелените телефони на МОСВ и РИОСВ", "Green phones of МОСВ and РИОСВ (in Bulgarian)")}
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
          </a>
        </section>

        <section aria-labelledby="sos-title" className="rounded-[20px] bg-card p-5 lg:p-6">
          <h2 id="sos-title" className="font-display text-[20px] font-semibold">
            {t("Някой се задушава?", "Someone can't breathe?")}
          </h2>
          <p className="pt-2 text-[16px] leading-snug">
            {t("Не чакайте да мине. Звъннете на 112.", "Don't wait for it to pass. Call 112.")}
          </p>
          <a href="tel:112" className="pressable mt-4 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#c7361f] text-[20px] font-bold text-white">
            <Phone size={24} strokeWidth={2.25} aria-hidden />
            {t("Звънни на 112", "Call 112")}
          </a>
        </section>
      </div>
    </div>
  );
}
