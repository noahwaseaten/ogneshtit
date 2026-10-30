import { manifestResponse, langParams } from "@shtit/core/document";
import { isLang, pick } from "@shtit/core/i18n/lang";

// The web app manifest, in the visitor's language (src/proxy.ts rewrites /manifest.webmanifest here).
export const generateStaticParams = langParams;

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/manifest.webmanifest">) {
  const { lang } = await ctx.params;
  if (!isLang(lang)) return new Response("Not found", { status: 404 });
  const t = pick(lang);
  const icon = [{ src: "/app-icon/192", sizes: "192x192" }];
  return manifestResponse("flood", lang, ["Опасност от наводнение днес, реките наблизо и какво да направите.", "Flood danger today, rivers near you and what to do."], {
    shortcuts: [
      { name: t("Реките днес", "Rivers today"), url: "/reki", icons: icon },
      { name: t("Карта", "Map"), url: "/karta", icons: icon },
      { name: t("112 и какво да правя", "112 and what to do"), url: "/pomogni", icons: icon },
      { name: t("Подай сигнал за река", "Report a river problem"), url: "/pomogni/signal", icons: icon },
    ],
  });
}
