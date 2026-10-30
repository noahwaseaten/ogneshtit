"use client";

import { AlertsCard, PrefControl } from "@shtit/core/ui/AlertsCard";
import { useI18n } from "@shtit/core/i18n/client";
import { DEFAULT_PREFS, type Prefs } from "@/lib/alert-prefs";

/** ВъздухоЩит's alerts: at most one a morning, when today's air at the place is forecast to reach the chosen band. */
export function Alerts({ help = false }: { help?: boolean }) {
  const { t } = useI18n();
  return (
    <AlertsCard<Prefs>
      help={help}
      defaults={DEFAULT_PREFS}
      copy={{
        off: t(
          "Една сутрешна бележка в дните със замърсен въздух, с часовете, когато е най-чист. Никога повече от веднъж на ден.",
          "One morning note on polluted days, with the hours when the air is cleanest. Never more than once a day.",
        ),
        on: t("Пишем ви само сутрин в дните със замърсен въздух.", "We only message you in the morning on polluted days."),
      }}
      controls={(prefs, save) => (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-medium">{t("Пиши ми, когато въздухът ще е", "Message me when the air will be")}</p>
            <PrefControl
              label={t("Ниво за известие", "Level for an alert")}
              value={prefs.level}
              options={[
                ["off", t("Не", "Off")],
                ["moderate", t("Умерено+", "Moderate+")],
                ["poor", t("Лошо+", "Poor+")],
                ["verypoor", t("Много лошо+", "Very poor+")],
              ]}
              onChange={(v) => save({ ...prefs, level: v })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-medium">{t("Съвети за", "Advice for")}</p>
            <PrefControl
              label={t("Съвети за", "Advice for")}
              value={prefs.sensitive ? "sensitive" : "everyone"}
              options={[
                ["everyone", t("Всички", "Everyone")],
                ["sensitive", t("Деца, възрастни, астма", "Children, elderly, asthma")],
              ]}
              onChange={(v) => save({ ...prefs, sensitive: v === "sensitive" })}
            />
          </div>
        </>
      )}
    />
  );
}
