import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "./globals.css";
import { TabBar } from "@/components/TabBar";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Гората днес",
  description: "Опасност от горски пожар днес, възможни пожари наблизо и какво да направите — за всеки в България.",
  applicationName: "Гората днес",
  icons: { icon: "/app-icon/192", apple: "/app-icon/apple" },
  appleWebApp: { capable: true, title: "Гората днес", statusBarStyle: "default" },
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bg">
      <body>
        <main
          className="mx-auto max-w-xl px-4"
          style={{
            paddingTop: "max(16px, env(safe-area-inset-top))",
            paddingBottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 32px)",
          }}
        >
          {children}
        </main>
        <TabBar />
        <RegisterSW />
      </body>
    </html>
  );
}
