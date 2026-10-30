"use client";

import { AlertsCard, PrefControl } from "@shtit/core/ui/AlertsCard";
import { useI18n } from "@shtit/core/i18n/client";
import { DEFAULT_PREFS, type Prefs } from "@/lib/alert-prefs";

/**
 * ОгнеЩит's alerts: one danger alert a day at most, new fires within a chosen distance, and only orange or red
 * weather warnings. Nothing at night.
 */
export function Alerts({ help = false }: { help?: boolean }) {
  const { t } = useI18n();
  return (
    <AlertsCard<Prefs>
      help={help}
      defaults={DEFAULT_PREFS}
      copy={{
        off: t(
          "Само когато опасността е висока, има нов огън наблизо или оранжев код. Никога през нощта.",
          "Only when the danger is high, a new fire is spotted nearby or there's an orange warning. Never at night.",
        ),
        on: t("Пишем ви само при опасност или нов огън наблизо, никога през нощта.", "We only message you about danger or a new fire nearby, never at night."),
      }}
      controls={(prefs, save) => (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-medium">{t("Опасност от пожар", "Fire danger")}</p>
            <PrefControl
              label={t("Опасност от пожар", "Fire danger")}
              value={prefs.danger}
              options={[
                ["off", t("Не", "Off")],
                ["high", t("От висока", "High+")],
                ["veryhigh", t("От много висока", "Very high+")],
              ]}
              onChange={(v) => save({ ...prefs, danger: v })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-medium">{t("Нов огън от спътник", "New fire seen by satellite")}</p>
            <PrefControl
              label={t("Нов огън от спътник", "New fire seen by satellite")}
              value={prefs.firesKm}
              options={[
                [0, t("Не", "Off")],
                [10, t("10 км", "10 km")],
                [25, t("25 км", "25 km")],
                [50, t("50 км", "50 km")],
              ]}
              onChange={(v) => save({ ...prefs, firesKm: v })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-medium">{t("Оранжев и червен код на НИМХ", "Orange and red weather warnings")}</p>
            <PrefControl
              label={t("Предупреждения на НИМХ", "Weather warnings")}
              value={prefs.warnings ? "on" : "off"}
              options={[
                ["off", t("Не", "Off")],
                ["on", t("Да", "On")],
              ]}
              onChange={(v) => save({ ...prefs, warnings: v === "on" })}
            />
          </div>
        </>
      )}
    />
  );
}
