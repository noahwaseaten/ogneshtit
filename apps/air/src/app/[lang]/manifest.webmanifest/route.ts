import { manifestResponse, langParams } from "@shtit/core/document";
import { isLang, pick } from "@shtit/core/i18n/lang";

// The web app manifest, in the visitor's language (src/proxy.ts rewrites /manifest.webmanifest here).
export const generateStaticParams = langParams;

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/manifest.webmanifest">) {
  const { lang } = await ctx.params;
  if (!isLang(lang)) return new Response("Not found", { status: 404 });
  const t = pick(lang);
  const icon = [{ src: "/app-icon/192", sizes: "192x192" }];
  return manifestResponse("air", lang, ["Какъв е въздухът днес и кога е най-чист.", "How clean the air is today and when it is cleanest."], {
    shortcuts: [
      { name: t("Карта на датчиците", "Sensor map"), url: "/karta", icons: icon },
      { name: t("Градовете днес", "Cities today"), url: "/gradove", icons: icon },
      { name: t("Как да се пазя", "How to protect myself"), url: "/pomogni", icons: icon },
    ],
  });
}
