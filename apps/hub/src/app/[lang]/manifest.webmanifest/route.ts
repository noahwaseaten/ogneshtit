import { manifestResponse, langParams } from "@shtit/core/document";
import { isLang } from "@shtit/core/i18n/lang";

export const generateStaticParams = langParams;

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/manifest.webmanifest">) {
  const { lang } = await ctx.params;
  if (!isLang(lang)) return new Response("Not found", { status: 404 });
  return manifestResponse("hub", lang, ["ОгнеЩит и ВодоЩит на едно място.", "Fire Shield and Flood Shield in one place."]);
}
