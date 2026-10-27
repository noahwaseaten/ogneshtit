"use client";

import { createContext, useContext, useMemo } from "react";
import { formatters } from "./format";
import { LANG_COOKIE, pick, type Lang } from "./lang";

const LangContext = createContext<Lang>("bg");

/** Set once in the root layout from the [lang] segment, so client components know the language. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** t("Bulgarian", "English") plus number and date formatters for the current language. */
export function useI18n() {
  const lang = useLang();
  return useMemo(() => {
    const t = pick(lang);
    /** Same as t, for a [bg, en] pair kept in a table. */
    const tp = <T,>(pair: readonly [T, T]) => t(pair[0], pair[1]);
    return { ...formatters(lang), t, tp };
  }, [lang]);
}

/** Saves the choice for a year and reloads, so every page (and the service worker cache) follows it. */
export function setLanguage(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.location.reload();
}
