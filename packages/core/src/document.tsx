import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { BRANDS, type AppId } from "./brand";
import { THEME_SCRIPT } from "./client";
import { LangProvider } from "./i18n/client";
import { LANGS, pick, type Lang } from "./i18n/lang";
import { BrandProvider } from "./ui/Brand";
import { RegisterSW } from "./ui/RegisterSW";

// What every app's root layout shares: the <html> frame, providers, theme before paint, service worker,
// analytics and the metadata that names the app.

export function langParams() {
  return LANGS.map((lang) => ({ lang }));
}

export function appMetadata(app: AppId, lang: Lang, { title, description }: { title: [string, string]; description: [string, string] }): Metadata {
  const b = BRANDS[app];
  const t = pick(lang);
  const name = b.name[lang];
  const desc = t(...description);
  return {
    metadataBase: new URL(b.url),
    title: { default: t(...title), template: `%s · ${name}` },
    description: desc,
    applicationName: name,
    manifest: "/manifest.webmanifest",
    icons: { icon: "/app-icon/192", apple: "/app-icon/apple" },
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    alternates: { languages: { bg: `${b.url}/bg`, en: `${b.url}/en` } },
    openGraph: { type: "website", locale: t("bg_BG", "en_GB"), siteName: name, title: name, description: desc, url: b.url },
    twitter: { card: "summary_large_image", title: name, description: desc },
  };
}

export function appViewport(app: AppId): Viewport {
  const s = BRANDS[app].surface;
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: s.light },
      { media: "(prefers-color-scheme: dark)", color: s.dark },
    ],
  };
}

export function AppDocument({ app, lang, children, offline = true }: { app: AppId; lang: Lang; children: React.ReactNode; offline?: boolean }) {
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <BrandProvider app={app}>
          <LangProvider lang={lang}>
            {children}
            {offline && <RegisterSW />}
          </LangProvider>
        </BrandProvider>
        <Analytics />
      </body>
    </html>
  );
}

/** The web app manifest for one app, in one language. `extra` adds shortcuts and the share target. */
export function manifestResponse(app: AppId, lang: Lang, description: [string, string], extra: Record<string, unknown> = {}) {
  const b = BRANDS[app];
  const t = pick(lang);
  const manifest = {
    name: b.name[lang],
    short_name: b.name[lang],
    description: t(...description),
    id: "/",
    lang,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: b.surface.light,
    theme_color: b.color,
    categories: ["weather", "utilities", "news"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    ...extra,
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" },
  });
}
