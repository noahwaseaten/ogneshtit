"use client";

import { Monitor, Moon, Phone, Satellite, Sun } from "lucide-react";
import { useAdvanced, useJson, useTheme } from "@shtit/core/client";
import { setLanguage, useI18n } from "@shtit/core/i18n/client";
import type { StatusResponse, SourceStatus } from "@/app/api/status/route";
import { Alerts } from "./Alerts";
import { InstallHelp } from "@shtit/core/ui/InstallHelp";
import { GithubIcon, Segmented, SettingsGroup, SettingsRow, SettingsToggle } from "@shtit/core/ui/Settings";
import { REPO } from "@shtit/core/brand";

type Source = { key: SourceStatus["key"] | null; name: [string, string]; what: [string, string]; href: string };
const SOURCES: Source[] = [
  { key: "weather", name: ["Open-Meteo", "Open-Meteo"], what: ["Време, опасност и въздух", "Weather, danger and air"], href: "https://open-meteo.com" },
  { key: null, name: ["MET Norway", "MET Norway"], what: ["Резервна прогноза, ако Open-Meteo не отговаря", "Backup forecast if Open-Meteo is down"], href: "https://api.met.no" },
  {
    key: "fires",
    name: ["NASA FIRMS", "NASA FIRMS"],
    what: ["Огън от 5 спътника (VIIRS и MODIS)", "Fire from 5 satellites (VIIRS and MODIS)"],
    href: "https://firms.modaps.eosdis.nasa.gov",
  },
  { key: null, name: ["CelesTrak", "CelesTrak"], what: ["Орбити на спътниците, за часовете на преминаване", "Satellite orbits, for pass times"], href: "https://celestrak.org" },
  { key: "iag", name: ["ИАГ", "Executive Forest Agency"], what: ["Пожари, превозни билети, дирекции", "Fires, transport tickets, directorates"], href: "https://www.iag.bg" },
  { key: "warnings", name: ["НИМХ", "NIMH"], what: ["Предупреждения за времето", "Weather warnings"], href: "https://meteoalarm.org" },
  { key: null, name: ["EFFIS", "EFFIS"], what: ["Скалата за опасност", "The danger scale"], href: "https://forest-fire.emergency.copernicus.eu" },
  { key: null, name: ["Photon (OpenStreetMap)", "Photon (OpenStreetMap)"], what: ["Резервно търсене на места", "Backup place search"], href: "https://photon.komoot.io" },
];

export function SettingsView() {
  const { t, tp, lang } = useI18n();
  const [theme, setTheme] = useTheme();
  const [advanced, setAdvanced] = useAdvanced();
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

      <SettingsGroup title={t("За напреднали", "Advanced")}>
        <SettingsToggle
          icon={<Satellite strokeWidth={1.75} aria-hidden />}
          title={t("График на спътниците", "Satellite schedule")}
          subtitle={t(
            "Показва на началния екран кога минава всеки спътник. Подсказките при огньовете се виждат и без това.",
            "Shows on the home screen when each satellite passes. The hints on fires show either way.",
          )}
          checked={advanced}
          onChange={setAdvanced}
        />
      </SettingsGroup>

      <SettingsGroup
        title={t("Данни", "Data")}
        note={t(
          "ОгнеЩит не е официален източник. Всеки източник има резерва: втора услуга или копие на последните данни, запазвано на всеки 6 часа. Когато ползваме резервата, пишем го и казваме от кога са данните.",
          "Fire Shield is not an official source. Every source has a fallback: a second service, or a copy of the latest data saved every 6 hours. When we use it, we say so and how old the data is.",
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
          subtitle={t("Училищен проект за защита на гората, ПГЕА", "A school project on protecting the forest")}
          href="https://noahwaseaten.com/"
          external
        />
        <SettingsRow icon={<GithubIcon />} title={t("Отворен код в GitHub", "Open source on GitHub")} href={REPO} external />
        <SettingsRow icon={<Phone strokeWidth={1.75} aria-hidden />} title={t("При пожар звъннете на 112", "In a fire, call 112")} href="tel:112" />
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
  const degraded = s.ok && (s.mode === "backup" || s.mode === "approx" || (s.failed?.length ?? 0) > 0);
  const color = !s.ok ? "var(--d-veryhigh)" : degraded ? "var(--d-moderate)" : "var(--d-low)";
  const text = !s.ok
    ? t("не отговаря, а няма и запазено копие", "not responding, and no saved copy")
    : s.mode === "backup"
      ? t(`не отговаря; ползваме копие от ${ago(s.backupFrom ?? when ?? "")}`, `not responding; using a copy from ${ago(s.backupFrom ?? when ?? "")}`)
      : s.mode === "approx"
        ? t("не отговаря; ползваме MET Norway", "not responding; using MET Norway")
        : (s.failed?.length ?? 0) > 0
          ? t(`обновено ${ago(when ?? "")}, без ${s.failed!.join(", ")}`, `updated ${ago(when ?? "")}, without ${s.failed!.join(", ")}`)
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
