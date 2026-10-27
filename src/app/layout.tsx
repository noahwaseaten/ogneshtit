import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "./globals.css";
import { Sidebar, TabBar, TopBar } from "@/components/Shell";
import { RegisterSW } from "@/components/RegisterSW";

const SITE = "https://ogneshtit.noahwaseaten.com";
const DESCRIPTION =
  "Опасност от горски пожар днес, пожари наблизо по данни от спътник, проверка на камиони с дървесина и сигнали за незаконна сеч. За всеки в България.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "ОгнеЩит: опасност от горски пожар днес", template: "%s · ОгнеЩит" },
  description: DESCRIPTION,
  applicationName: "ОгнеЩит",
  icons: { icon: "/app-icon/192", apple: "/app-icon/apple" },
  appleWebApp: { capable: true, title: "ОгнеЩит", statusBarStyle: "default" },
  openGraph: { type: "website", locale: "bg_BG", siteName: "ОгнеЩит", title: "ОгнеЩит", description: DESCRIPTION, url: SITE },
  twitter: { card: "summary_large_image", title: "ОгнеЩит", description: DESCRIPTION },
};

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bg" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Sidebar />
        <TopBar />
        <div className="lg:pl-[248px]">
          <main className="mx-auto max-w-xl px-4 pb-[calc(var(--tabbar-h)_+_env(safe-area-inset-bottom)_+_32px)] pt-4 lg:max-w-[1180px] lg:px-10 lg:pb-16 lg:pt-10">
            {children}
          </main>
        </div>
        <TabBar />
        <RegisterSW />
      </body>
    </html>
  );
}
