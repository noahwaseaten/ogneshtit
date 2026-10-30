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
  return appMetadata("air", lang, {
    title: ["ВъздухоЩит: какъв е въздухът днес", "Air Shield: how is the air today"],
    description: [
      "Какъв е въздухът днес и по часове за всяко място в България, кога е най-чист за разходка и проветряване, какво мерят гражданските датчици наоколо и как да се пазите от смога.",
      "How clean the air is today and hour by hour anywhere in Bulgaria, the cleanest time for a walk or airing the room, what citizen sensors nearby measure and how to protect yourself from smog.",
    ],
  });
}

export const viewport = appViewport("air");

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <AppDocument app="air" lang={lang}>
      <Chrome>{children}</Chrome>
    </AppDocument>
  );
}
