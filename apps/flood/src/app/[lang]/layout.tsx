import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/onest";
import "../globals.css";
import { Chrome } from "@/components/Chrome";
import { AppDocument, appMetadata, appViewport, langParams } from "@shtit/core/document";
import { isLang } from "@shtit/core/i18n/lang";

export const generateStaticParams = langParams;

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return appMetadata("flood", lang, {
    title: ["ВодоЩит: опасност от наводнение днес", "Flood Shield: flood danger today"],
    description: [
      "Опасност от наводнение днес за всяко място в България: реките по прогнозата на GloFAS, дъжд и топене на сняг, предупреждения на НИМХ и какво да направите.",
      "Today's flood danger anywhere in Bulgaria: rivers from the GloFAS forecast, rain and melting snow, official warnings and what to do.",
    ],
  });
}

export const viewport = appViewport("flood");

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <AppDocument app="flood" lang={lang}>
      <Chrome>{children}</Chrome>
    </AppDocument>
  );
}
