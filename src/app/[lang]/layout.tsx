import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/onest";
import "../globals.css";
import { Sidebar, TabBar, TopBar } from "@/components/Shell";
import { RegisterSW } from "@/components/RegisterSW";
import { LangProvider } from "@/i18n/client";
import { APP_NAME, LANGS, isLang, pick } from "@/i18n/lang";

const SITE = "https://ogneshtit.noahwaseaten.com";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = pick(lang);
  const name = APP_NAME[lang];
  const description = t(
    "Опасност от горски пожар днес, пожари наблизо по данни от спътник, проверка на камиони с дървесина и сигнали за незаконна сеч. За всеки в България.",
    "Today's forest fire danger anywhere in Bulgaria, fires spotted by satellite near you, timber truck checks and illegal logging reports.",
  );
  return {
    metadataBase: new URL(SITE),
    title: { default: t("ОгнеЩит: опасност от горски пожар днес", "Fire Shield: forest fire danger today"), template: `%s · ${name}` },
    description,
    applicationName: name,
    manifest: "/manifest.webmanifest",
    icons: { icon: "/app-icon/192", apple: "/app-icon/apple" },
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    alternates: { languages: { bg: `${SITE}/bg`, en: `${SITE}/en` } },
    openGraph: { type: "website", locale: t("bg_BG", "en_GB"), siteName: name, title: name, description, url: SITE },
    twitter: { card: "summary_large_image", title: name, description },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1411" },
  ],
};

// Applies a theme the person picked before the first paint, so there is no flash of the other one.
const THEME_SCRIPT = `try{var t=localStorage.getItem("ogneshtit:theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <LangProvider lang={lang}>
          <Sidebar />
          <TopBar />
          <div className="lg:pl-[248px]">
            <main className="mx-auto max-w-xl px-4 pb-[calc(var(--tabbar-h)_+_env(safe-area-inset-bottom)_+_32px)] pt-4 lg:max-w-[1180px] lg:px-10 lg:pb-16 lg:pt-10">
              {children}
            </main>
          </div>
          <TabBar />
          <RegisterSW />
        </LangProvider>
      </body>
    </html>
  );
}
