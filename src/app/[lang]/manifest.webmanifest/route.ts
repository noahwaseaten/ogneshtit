import { APP_NAME, LANGS, isLang, pick } from "@/i18n/lang";

// The web app manifest, in the visitor's language (src/proxy.ts rewrites /manifest.webmanifest here).
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/manifest.webmanifest">) {
  const { lang } = await ctx.params;
  if (!isLang(lang)) return new Response("Not found", { status: 404 });
  const t = pick(lang);
  const icon = [{ src: "/app-icon/192", sizes: "192x192" }];
  const manifest = {
    name: APP_NAME[lang],
    short_name: APP_NAME[lang],
    description: t(
      "Опасност от горски пожар днес, пожари наблизо и какво да направите.",
      "Forest fire danger today, fires near you and what to do.",
    ),
    id: "/",
    lang,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f3f5f1",
    theme_color: "#1f5b3e",
    categories: ["weather", "utilities", "news"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: t("Карта на огъня", "Fire map"), url: "/karta", icons: icon },
      { name: t("112 и координати", "112 and your location"), url: "/pomogni", icons: icon },
      { name: t("Провери камион", "Check a truck"), url: "/pomogni/kamion", icons: icon },
      { name: t("Подай сигнал", "Report logging"), url: "/pomogni/signal", icons: icon },
    ],
    // Photos shared from the gallery land in the report form (Android and desktop Chrome).
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "title", text: "text", files: [{ name: "photos", accept: ["image/*"] }] },
    },
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" },
  });
}
