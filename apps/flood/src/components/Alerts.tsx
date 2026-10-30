"use client";

import { AlertsCard, PrefControl } from "@shtit/core/ui/AlertsCard";
import { useI18n } from "@shtit/core/i18n/client";
import { DEFAULT_PREFS, type Prefs } from "@/lib/alert-prefs";

/**
 * ВодоЩит's alerts: the river near the place forecast to reach the chosen level within 3 days (once per rise), and
 * НИМХ orange or red warnings about rain, floods, snow or ice. Nothing at night.
 */
export function Alerts({ help = false }: { help?: boolean }) {
  const { t } = useI18n();
  return (
    <AlertsCard<Prefs>
      help={help}
      defaults={DEFAULT_PREFS}
      copy={{
        off: t(
          "Само когато реката до вас може да излезе до 3 дни или има оранжев код за дъжд или наводнение. Никога през нощта.",
          "Only when the river near you may flood within 3 days or there's an orange warning for rain or floods. Never at night.",
        ),
        on: t("Пишем ви само когато реката може да излезе или има опасно време, никога през нощта.", "We only message you when the river may flood or there's dangerous weather, never at night."),
      }}
      controls={(prefs, save) => (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-medium">{t("Реката до вас", "The river near you")}</p>
            <PrefControl
              label={t("Реката до вас", "The river near you")}
              value={prefs.river}
              options={[
                ["off", t("Не", "Off")],
                ["high", t("От висока", "High+")],
                ["veryhigh", t("От много висока", "Very high+")],
              ]}
              onChange={(v) => save({ ...prefs, river: v })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-medium">{t("Оранжев и червен код за дъжд, наводнение, сняг", "Orange and red warnings for rain, floods, snow")}</p>
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
