import { manifestResponse, langParams } from "@shtit/core/document";
import { isLang, pick } from "@shtit/core/i18n/lang";

// The web app manifest, in the visitor's language (src/proxy.ts rewrites /manifest.webmanifest here).
export const generateStaticParams = langParams;

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/manifest.webmanifest">) {
  const { lang } = await ctx.params;
  if (!isLang(lang)) return new Response("Not found", { status: 404 });
  const t = pick(lang);
  const icon = [{ src: "/app-icon/192", sizes: "192x192" }];
  return manifestResponse("fire", lang, ["Опасност от горски пожар днес, пожари наблизо и какво да направите.", "Forest fire danger today, fires near you and what to do."], {
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
  });
}
