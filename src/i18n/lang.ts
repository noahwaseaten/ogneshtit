// Two languages: Bulgarian for people in Bulgaria, English for everyone else (see src/proxy.ts).
// Text lives next to the code that shows it, as a pair: t("Bulgarian", "English").

export const LANGS = ["bg", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const isLang = (x: unknown): x is Lang => x === "bg" || x === "en";

/** Cookie set when the person picks a language in Settings. Wins over the country guess. */
export const LANG_COOKIE = "lang";

/** BCP 47 locale for numbers and dates. */
export const localeOf = (lang: Lang) => (lang === "bg" ? "bg-BG" : "en-GB");

/** The app's name in each language. */
export const APP_NAME: Record<Lang, string> = { bg: "ОгнеЩит", en: "Fire Shield" };

/** Picks the text for a language: pick(lang)("Здравей", "Hello"). Works for JSX too. */
export const pick =
  (lang: Lang) =>
  <T,>(bg: T, en: T): T =>
    lang === "bg" ? bg : en;

/** The language from a page's params (`/[lang]/...`), falling back to Bulgarian. */
export async function langFrom(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params;
  return isLang(lang) ? lang : "bg";
}
