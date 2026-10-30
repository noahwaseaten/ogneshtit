import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, isLang, type Lang } from "@shtit/core/i18n/lang";

// Every page exists twice, under /bg/... and /en/..., prerendered. Visitors keep the short URLs
// (/karta, /pomogni) and this rewrites them to the right language:
//   1. ?l=bg or ?l=en (shared links carry the sharer's language, so previews match it)
//   2. the "lang" cookie, set when the person picks a language in Settings
//   3. the country: Bulgaria gets Bulgarian, everyone else English
export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (/^\/(bg|en)(\/|$)/.test(pathname)) return NextResponse.next();
  if (pathname.includes(".") && pathname !== "/manifest.webmanifest") return NextResponse.next();

  const param = searchParams.get("l");
  const cookie = req.cookies.get(LANG_COOKIE)?.value;
  const country = (req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const lang: Lang = isLang(param) ? param : isLang(cookie) ? cookie : country === "BG" || !country ? "bg" : "en";

  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api/|_next/|app-icon/|share-target).*)"],
};
