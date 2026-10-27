"use client";

import { Code, Database, Globe, Heart, Monitor, Moon, Palette, ShieldAlert, Sun } from "lucide-react";
import { useTheme } from "@/lib/client";
import { setLanguage, useI18n } from "@/i18n/client";
import { APP_NAME } from "@/i18n/lang";
import { Alerts } from "./Alerts";
import { InstallHelp } from "./InstallHelp";
import { ButtonGroup, SettingsGroup, SettingsRow } from "./Settings";
import { Logo, REPO } from "./Shell";

const SOURCES = [
  { name: "Open-Meteo", what: ["време и въздух", "weather and air"], href: "https://open-meteo.com" },
  { name: "NASA FIRMS", what: ["огън от спътник", "fire seen by satellite"], href: "https://firms.modaps.eosdis.nasa.gov" },
  { name: ["ИАГ", "Executive Forest Agency"], what: ["пожари, превозни билети", "fires, transport tickets"], href: "https://www.iag.bg" },
  { name: ["НИМХ", "NIMH"], what: ["предупреждения за времето", "weather warnings"], href: "https://meteoalarm.org" },
  { name: "EFFIS", what: ["нива на опасност", "danger levels"], href: "https://forest-fire.emergency.copernicus.eu" },
] as const;

export function SettingsView() {
  const { t, tp, lang } = useI18n();
  const [theme, setTheme] = useTheme();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-7 pb-4">
      <header className="flex items-center gap-4 px-1 pt-2">
        <Logo size={52} />
        <div className="min-w-0">
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em]">{t("Настройки", "Settings")}</h1>
          <p className="text-[15px] text-muted">{APP_NAME[lang]}</p>
        </div>
      </header>

      <SettingsGroup title={t("Външен вид", "Appearance")}>
        <SettingsRow
          icon={Globe}
          title={t("Език", "Language")}
          subtitle={t("По подразбиране според държавата, от която отваряте.", "By default this follows the country you open it from.")}
          below={
            <ButtonGroup
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
          icon={Palette}
          title={t("Тема", "Theme")}
          subtitle={t("Автоматично следва светлата или тъмната тема на устройството.", "Auto follows your device's light or dark mode.")}
          below={
            <ButtonGroup
              label={t("Тема", "Theme")}
              value={theme}
              options={[
                { value: "system", label: t("Авто", "Auto"), icon: Monitor },
                { value: "light", label: t("Светла", "Light"), icon: Sun },
                { value: "dark", label: t("Тъмна", "Dark"), icon: Moon },
              ]}
              onChange={setTheme}
            />
          }
        />
      </SettingsGroup>

      <Alerts />

      <InstallHelp />

      <SettingsGroup
        title={t("За приложението", "About")}
        note={t(
          "ОгнеЩит не е официален източник. Нищо за вас не се пази на сървър: мястото и настройките стоят само в телефона.",
          "Fire Shield is not an official source. Nothing about you is kept on a server: your place and settings stay on your phone.",
        )}
      >
        <SettingsRow
          icon={Heart}
          title={t("Направено от Камен", "Made by Noah")}
          subtitle={t("Училищен проект за защита на гората, ПГЕА", "A school project on protecting the forest")}
          href="https://noahwaseaten.com/"
          external
        />
        <SettingsRow icon={Code} title={t("Отворен код в GitHub", "Open source on GitHub")} subtitle="noahwaseaten/ogneshtit" href={REPO} external />
        <SettingsRow
          icon={ShieldAlert}
          title={t("При пожар звъннете на 112", "In a fire, call 112")}
          subtitle={t("Единният европейски номер за спешни случаи", "The single European emergency number")}
          href="tel:112"
        />
      </SettingsGroup>

      <SettingsGroup title={t("Откъде са данните", "Where the data comes from")}>
        {SOURCES.map((s) => {
          const name = typeof s.name === "string" ? s.name : tp(s.name);
          return <SettingsRow key={s.href} icon={Database} title={name} subtitle={tp(s.what)} href={s.href} external />;
        })}
      </SettingsGroup>
    </div>
  );
}
