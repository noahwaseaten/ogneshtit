import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/onest";
import "../globals.css";
import { AppDocument, appMetadata, appViewport, langParams } from "@shtit/core/document";
import { isLang } from "@shtit/core/i18n/lang";

export const generateStaticParams = langParams;

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return appMetadata("hub", lang, {
    title: ["Щит: огън и вода, днес, за вашето място", "Shield: fire and water, today, for your place"],
    description: [
      "Безплатни приложения за опасностите в България: ОгнеЩит за горските пожари и ВодоЩит за наводненията. Всяко работи самостоятелно.",
      "Free apps for natural dangers in Bulgaria: Fire Shield for forest fires and Flood Shield for floods. Each works on its own.",
    ],
  });
}

export const viewport = appViewport("hub");

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  // The hub has nothing to keep offline: each app has its own offline copy.
  return (
    <AppDocument app="hub" lang={lang} offline={false}>
      <main className="mx-auto max-w-[1080px] px-4 pb-16 pt-4 lg:px-10 lg:pt-8">{children}</main>
    </AppDocument>
  );
}
