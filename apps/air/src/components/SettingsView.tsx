"use client";

import { Monitor, Moon, Phone, Sun } from "lucide-react";
import { useJson, useTheme } from "@shtit/core/client";
import { setLanguage, useI18n } from "@shtit/core/i18n/client";
import type { StatusResponse, SourceStatus } from "@/app/api/status/route";
import { Alerts } from "./Alerts";
import { InstallHelp } from "@shtit/core/ui/InstallHelp";
import { GithubIcon, Segmented, SettingsGroup, SettingsRow } from "@shtit/core/ui/Settings";
import { REPO } from "@shtit/core/brand";

type Source = { key: SourceStatus["key"] | null; name: [string, string]; what: [string, string]; href: string };
const SOURCES: Source[] = [
  {
    key: "cams",
    name: ["CAMS (Copernicus)", "CAMS (Copernicus)"],
    what: ["Прогноза за въздуха по часове, чрез Open-Meteo", "Hourly air forecast, through Open-Meteo"],
    href: "https://atmosphere.copernicus.eu",
  },
  { key: "sensors", name: ["sensor.community", "sensor.community"], what: ["Граждански датчици за прахови частици", "Citizen particle sensors"], href: "https://sensor.community" },
  { key: null, name: ["Европейска агенция за околна среда", "European Environment Agency"], what: ["Скалата и съветите за здравето", "The scale and the health advice"], href: "https://airindex.eea.europa.eu/AQI/index.html" },
  { key: null, name: ["МОСВ", "Ministry of Environment and Water"], what: ["Зелен телефон за сигнали", "Green phone for reports"], href: "https://www.moew.government.bg/bg/zelen-telefon-za-podavane-na-signali/" },
  { key: null, name: ["Natural Earth", "Natural Earth"], what: ["Границите на картата", "Borders on the map"], href: "https://www.naturalearthdata.com" },
];

export function SettingsView() {
  const { t, tp, lang } = useI18n();
  const [theme, setTheme] = useTheme();
  const status = useJson<StatusResponse>("/api/status");
  const byKey = new Map((status.data?.sources ?? []).map((s) => [s.key, s]));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold leading-tight tracking-[-0.01em]">{t("Настройки", "Settings")}</h1>

      <SettingsGroup title={t("Външен вид", "Appearance")}>
        <SettingsRow
          title={t("Език", "Language")}
          subtitle={t("По подразбиране според държавата, от която отваряте.", "By default this follows the country you open it from.")}
          below={
            <Segmented
              label={t("Език", "Language")}
              value={lang}
              options={[
                { value: "bg", label: "Български" },
                { value: "en", label: "English" },
              ]}
              onChange={(l) => l !== lang && setLanguage(l)}
            />
          }
        />
        <SettingsRow
          title={t("Тема", "Theme")}
          below={
            <Segmented
              label={t("Тема", "Theme")}
              value={theme}
              options={[
                { value: "system", label: t("Авто", "Auto"), icon: <Monitor size={16} strokeWidth={1.75} aria-hidden /> },
                { value: "light", label: t("Светла", "Light"), icon: <Sun size={16} strokeWidth={1.75} aria-hidden /> },
                { value: "dark", label: t("Тъмна", "Dark"), icon: <Moon size={16} strokeWidth={1.75} aria-hidden /> },
              ]}
              onChange={setTheme}
            />
          }
        />
      </SettingsGroup>

      <Alerts />

      <InstallHelp />

      <SettingsGroup
        title={t("Данни", "Data")}
        note={t(
          "ВъздухоЩит не е официален източник. Гражданските датчици са евтини и при мъгла показват повече; прогнозата е модел. Всеки източник има запазено копие от последните 6 часа; когато го ползваме, пишем го и казваме от кога е.",
          "Air Shield is not an official source. Citizen sensors are low-cost and read high in fog; the forecast is a model. Every source has a copy saved within the last 6 hours; when we use it, we say so and how old it is.",
        )}
      >
        {SOURCES.map((s) => (
          <SettingsRow
            key={s.href}
            title={tp(s.name)}
            subtitle={
              <>
                {tp(s.what)}
                {s.key && <SourceState s={byKey.get(s.key)} loading={status.loading} />}
              </>
            }
            href={s.href}
            external
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title={t("За приложението", "About")}>
        <SettingsRow
          title={t("Направено от Камен", "Made by Noah")}
          subtitle={t("Част от Щит: въздух, вода и огън", "Part of Shield: air, water and fire")}
          href="https://noahwaseaten.com/"
          external
        />
        <SettingsRow icon={<GithubIcon />} title={t("Отворен код в GitHub", "Open source on GitHub")} href={REPO} external />
        <SettingsRow icon={<Phone strokeWidth={1.75} aria-hidden />} title={t("При затруднено дишане звъннете на 112", "If someone can't breathe, call 112")} href="tel:112" />
      </SettingsGroup>
    </div>
  );
}

/**
 * "обновено преди 5 мин" with a green dot; an amber dot when a fallback is in use; a red one when nothing works.
 * Words carry the meaning, not only colour.
 */
function SourceState({ s, loading }: { s?: SourceStatus; loading: boolean }) {
  const { t, ago } = useI18n();
  if (loading) return <span className="block pt-1 text-[13px] text-muted">{t("Проверяваме…", "Checking…")}</span>;
  if (!s) return null;
  const when = s.updated;
  const degraded = s.ok && s.mode === "backup";
  const color = !s.ok ? "var(--b-poor)" : degraded ? "var(--b-moderate)" : "var(--d-low)";
  const text = !s.ok
    ? t("не отговаря, а няма и запазено копие", "not responding, and no saved copy")
    : s.mode === "backup"
      ? t(`не отговаря; ползваме копие от ${ago(s.backupFrom ?? when ?? "")}`, `not responding; using a copy from ${ago(s.backupFrom ?? when ?? "")}`)
      : when
        ? t(`обновено ${ago(when)}`, `updated ${ago(when)}`) + (s.count ? t(`, ${s.count} датчика`, `, ${s.count} sensors`) : "")
        : t("работи", "working");
  return (
    <span className="flex items-start gap-1.5 pt-1 text-[13px] tabular-nums text-content">
      <span className="mt-[5px] size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      {text}
    </span>
  );
}
