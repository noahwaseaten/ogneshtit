import { LANG_COOKIE, isLang, pick, type Lang } from "./lang";

/** Language for an API response: the same rule as src/proxy.ts, without the ?l= parameter. */
export function langOf(req: Request): Lang {
  const cookie = /(?:^|;\s*)lang=(bg|en)/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (isLang(cookie)) return cookie;
  const country = (req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  return country === "BG" || !country ? "bg" : "en";
}

/** t("Bulgarian", "English") for the language of this request. */
export const textFor = (req: Request) => pick(langOf(req));

export { LANG_COOKIE };
