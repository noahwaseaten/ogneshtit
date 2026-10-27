"use client";

import { Monitor, Moon, Phone, Sun } from "lucide-react";
import { useJson, useTheme } from "@/lib/client";
import { setLanguage, useI18n } from "@/i18n/client";
import type { StatusResponse, SourceStatus } from "@/app/api/status/route";
import { Alerts } from "./Alerts";
import { InstallHelp } from "./InstallHelp";
import { GithubIcon, Segmented, SettingsGroup, SettingsRow } from "./Settings";
import { REPO } from "./Shell";

type Source = { key: SourceStatus["key"] | null; name: [string, string]; what: [string, string]; href: string };
const SOURCES: Source[] = [
  { key: "weather", name: ["Open-Meteo", "Open-Meteo"], what: ["Време, опасност и въздух", "Weather, danger and air"], href: "https://open-meteo.com" },
  { key: "fires", name: ["NASA FIRMS", "NASA FIRMS"], what: ["Огън от спътник", "Fire seen by satellite"], href: "https://firms.modaps.eosdis.nasa.gov" },
  { key: "iag", name: ["ИАГ", "Executive Forest Agency"], what: ["Пожари, превозни билети, дирекции", "Fires, transport tickets, directorates"], href: "https://www.iag.bg" },
  { key: "warnings", name: ["НИМХ", "NIMH"], what: ["Предупреждения за времето", "Weather warnings"], href: "https://meteoalarm.org" },
  { key: null, name: ["EFFIS", "EFFIS"], what: ["Скалата за опасност", "The danger scale"], href: "https://forest-fire.emergency.copernicus.eu" },
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
          "ОгнеЩит не е официален източник. Ако някой източник не отговаря, показваме последните данни, които имаме, и пишем от кога са.",
          "Fire Shield is not an official source. If a source isn't responding, we show the last data we have and say how old it is.",
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

/** "обновено преди 5 мин" with a green dot, or "Не отговаря" with a red one. Words carry the meaning, not only colour. */
function SourceState({ s, loading }: { s?: SourceStatus; loading: boolean }) {
  const { t, ago } = useI18n();
  if (loading) return <span className="block pt-1 text-[13px] text-muted">{t("Проверяваме…", "Checking…")}</span>;
  if (!s) return null;
  const when = s.updated;
  return (
    <span className="flex items-center gap-1.5 pt-1 text-[13px] tabular-nums text-content">
      <span className="size-2 rounded-full" style={{ background: s.ok ? "var(--d-low)" : "var(--d-veryhigh)" }} aria-hidden />
      {s.ok ? (when ? t(`обновено ${ago(when)}`, `updated ${ago(when)}`) : t("работи", "working")) : t("не отговаря", "not responding")}
    </span>
  );
}
