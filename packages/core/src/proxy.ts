import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, isLang, type Lang } from "./i18n/lang";

// Every page exists twice, under /bg/... and /en/..., prerendered. Visitors keep the short URLs
// (/karta, /pomogni) and this rewrites them to the right language:
//   1. ?l=bg or ?l=en (shared links and links between the apps carry the language, so it carries over)
//   2. the "lang" cookie, set when the person picks a language in Settings
//   3. the country: Bulgaria gets Bulgarian, everyone else English
export function langRewrite(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (/^\/(bg|en)(\/|$)/.test(pathname) || pathname.startsWith("/api/") || pathname.startsWith("/app-icon/")) return NextResponse.next();
  if (pathname.includes(".") && pathname !== "/manifest.webmanifest") return NextResponse.next();

  const param = searchParams.get("l");
  const cookie = req.cookies.get(LANG_COOKIE)?.value;
  const country = (req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const lang: Lang = isLang(param) ? param : isLang(cookie) ? cookie : country === "BG" || !country ? "bg" : "en";

  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.rewrite(url);
  // A language picked through a link from another Щит app sticks, like one picked in Settings.
  if (isLang(param) && param !== cookie) res.cookies.set(LANG_COOKIE, param, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}

/**
 * Permanent move from an old address (MOVED_FROM, e.g. ogneshtit.noahwaseaten.com) to the app's address.
 * Pages redirect; the service worker, icons and API stay where they are, so apps installed from the old address
 * keep their alerts and can still update. Off unless MOVED_FROM is set, so nothing moves before the new DNS works.
 */
export function movedRedirect(req: NextRequest, to: string) {
  const from = process.env.MOVED_FROM?.trim();
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0];
  if (!from || host !== from) return null;
  const { pathname, search } = req.nextUrl;
  if (pathname === "/sw.js" || pathname.startsWith("/api/") || pathname.startsWith("/app-icon/") || pathname.startsWith("/_next/")) return null;
  return NextResponse.redirect(`${to}${pathname}${search}`, 308);
}
