import type { Metadata } from "next";
import { SettingsView } from "@/components/SettingsView";
import { isLang, pick } from "@/i18n/lang";

export async function generateMetadata({ params }: PageProps<"/[lang]/nastroiki">): Promise<Metadata> {
  const { lang } = await params;
  const t = pick(isLang(lang) ? lang : "bg");
  return {
    title: t("Настройки", "Settings"),
    description: t("Език, тема, известия, инсталиране и откъде са данните.", "Language, theme, alerts, installing the app and where the data comes from."),
  };
}

export default function Settings() {
  return <SettingsView />;
}
