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
  return appMetadata("fire", lang, {
    title: ["ОгнеЩит: опасност от горски пожар днес", "Fire Shield: forest fire danger today"],
    description: [
      "Опасност от горски пожар днес, пожари наблизо по данни от спътник, проверка на камиони с дървесина и сигнали за незаконна сеч. За всеки в България.",
      "Today's forest fire danger anywhere in Bulgaria, fires spotted by satellite near you, timber truck checks and illegal logging reports.",
    ],
  });
}

export const viewport = appViewport("fire");

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <AppDocument app="fire" lang={lang}>
      <Chrome>{children}</Chrome>
    </AppDocument>
  );
}
