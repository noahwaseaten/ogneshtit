"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Backpack,
  Ban,
  CarFront,
  Droplets,
  House,
  Map as MapIcon,
  MountainSnow,
  PlugZap,
  Radio,
  Users,
  Utensils,
  Zap,
  ArrowUpFromLine,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@shtit/core/i18n/client";
import { Segmented } from "@shtit/core/ui/Settings";

// What to do before, during and after a flood, in short lines. Based on the advice of ГДПБЗН (the fire safety and civil
// protection service of the Ministry of Interior), linked below so people can read the original.
const GDPBZN = "https://mvr.bg/gdpbzn/info-center/pravila-povedenie/pri-navodnenia";

type Step = { Icon: LucideIcon; bg: string; en: string };
const STEPS: Record<"before" | "during" | "after", Step[]> = {
  before: [
    { Icon: MapIcon, bg: "Питайте общината дали домът ви е в зона, която се залива.", en: "Ask the municipality whether your home is in an area that floods." },
    { Icon: Backpack, bg: "Раница: документи, лекарства, фенер, зарядно, топли дрехи, вода и храна за 3 дни.", en: "A bag: documents, medicines, a torch, a charger, warm clothes, water and food for 3 days." },
    { Icon: Users, bg: "Уговорете със семейството къде се събирате. Запишете телефоните на хартия.", en: "Agree with your family where to meet. Write the numbers on paper." },
    { Icon: Radio, bg: "Следете предупрежденията. BG-ALERT пише на телефона при опасност.", en: "Follow the warnings. BG-ALERT messages your phone in an emergency." },
  ],
  during: [
    { Icon: PlugZap, bg: "Спрете тока и газта, ако водата приближава.", en: "Turn off the power and gas if the water is coming." },
    { Icon: ArrowUpFromLine, bg: "Качете ценните неща високо. Ако водата се качва, тръгнете.", en: "Move valuables up high. If the water keeps rising, leave." },
    { Icon: MountainSnow, bg: "До река или дере: веднага на по-високо. Не стойте на мостове и в подлези.", en: "By a river or ravine: go to higher ground at once. Stay off bridges and out of underpasses." },
    { Icon: Ban, bg: "Не газете в течаща вода, дори да изглежда плитка.", en: "Never walk into moving water, even if it looks shallow." },
    { Icon: CarFront, bg: "Не карайте през вода на пътя.", en: "Don't drive through water on the road." },
  ],
  after: [
    { Icon: House, bg: "Върнете се у дома, когато властите кажат, че е безопасно.", en: "Go home only when the authorities say it is safe." },
    { Icon: Zap, bg: "Не пускайте тока, преди електротехник да провери.", en: "Don't switch the power on until an electrician has checked." },
    { Icon: Droplets, bg: "Ако водата от чешмата е със странен цвят или мирис, пийте бутилирана.", en: "If tap water looks or smells odd, drink bottled water." },
    { Icon: Utensils, bg: "Изхвърлете храната, до която е стигнала водата.", en: "Throw away food the flood water reached." },
  ],
};

/** Before, during and after a flood: one list at a time behind a segmented control, an icon per line. */
export function FloodSteps() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<keyof typeof STEPS>("before");
  return (
    <section aria-labelledby="steps-title" className="flex flex-col gap-3">
      <h2 id="steps-title" className="px-1 font-display text-[20px] font-semibold">
        {t("При наводнение", "In a flood")}
      </h2>
      <Segmented
        label={t("Кога", "When")}
        value={phase}
        options={[
          { value: "before", label: t("Преди", "Before") },
          { value: "during", label: t("По време", "During") },
          { value: "after", label: t("След", "After") },
        ]}
        onChange={setPhase}
      />
      <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card" aria-live="polite">
        {STEPS[phase].map(({ Icon, bg, en }) => (
          <li key={en} className="flex items-center gap-3.5 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-tonal text-accent">
              <Icon size={20} strokeWidth={1.9} aria-hidden />
            </span>
            <span className="text-[16px] leading-snug">{t(bg, en)}</span>
          </li>
        ))}
      </ul>
      <a href={GDPBZN} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 self-start px-1 text-[15px] font-medium text-accent">
        {t("Пълните указания на ГДПБЗН", "Full advice from ГДПБЗН (in Bulgarian)")}
        <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
      </a>
    </section>
  );
}
