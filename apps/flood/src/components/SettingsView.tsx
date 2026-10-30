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
    key: "glofas",
    name: ["GloFAS (Copernicus)", "GloFAS (Copernicus)"],
    what: ["Прогноза за реките, 51 варианта за 15 дни, чрез Open-Meteo", "River forecast, 51 runs over 15 days, through Open-Meteo"],
    href: "https://global-flood.emergency.copernicus.eu",
  },
  { key: "weather", name: ["Open-Meteo", "Open-Meteo"], what: ["Дъжд, сняг и температура", "Rain, snow and temperature"], href: "https://open-meteo.com" },
  { key: "warnings", name: ["НИМХ", "NIMH"], what: ["Предупреждения за времето", "Weather warnings"], href: "https://meteoalarm.org" },
  { key: "danube", name: ["ИА „Проучване и поддържане на река Дунав“", "Danube agency (АППД)"], what: ["Измерени нива на Дунав и прогноза", "Measured Danube levels and forecast"], href: "https://www.appd-bg.org/hidrology" },
  { key: null, name: ["Басейнови дирекции", "River basin directorates"], what: ["Контакти за сигнали", "Contacts for reports"], href: "https://www.moew.government.bg" },
  { key: null, name: ["ГДПБЗН", "Fire and rescue service"], what: ["Какво да правим при наводнение", "What to do in a flood"], href: "https://mvr.bg/gdpbzn/info-center/pravila-povedenie/pri-navodnenia" },
  { key: null, name: ["Natural Earth", "Natural Earth"], what: ["Реки и граници на картата", "Rivers and borders on the map"], href: "https://www.naturalearthdata.com" },
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
          "ВодоЩит не е официален източник и не заменя предупрежденията на НИМХ и указанията на властите. Речните стойности са от модел, не от водомерни станции. Всеки източник има запазено копие от последните 6 часа; когато го ползваме, пишем го и казваме от кога е.",
          "Flood Shield is not an official source and does not replace official warnings or instructions from the authorities. River values come from a model, not from gauges. Every source has a copy saved within the last 6 hours; when we use it, we say so and how old it is.",
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
        <SettingsRow icon={<Phone strokeWidth={1.75} aria-hidden />} title={t("При наводнение звъннете на 112", "In a flood, call 112")} href="tel:112" />
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
  const color = !s.ok ? "var(--d-veryhigh)" : degraded ? "var(--d-moderate)" : "var(--d-low)";
  const text = !s.ok
    ? t("не отговаря, а няма и запазено копие", "not responding, and no saved copy")
    : s.mode === "backup"
      ? t(`не отговаря; ползваме копие от ${ago(s.backupFrom ?? when ?? "")}`, `not responding; using a copy from ${ago(s.backupFrom ?? when ?? "")}`)
      : when
        ? t(`обновено ${ago(when)}`, `updated ${ago(when)}`)
        : t("работи", "working");
  return (
    <span className="flex items-start gap-1.5 pt-1 text-[13px] tabular-nums text-content">
      <span className="mt-[5px] size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      {text}
    </span>
  );
}
