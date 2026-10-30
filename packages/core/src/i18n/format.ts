import { localeOf, type Lang } from "./lang";

/** Numbers and dates for one language. Used by useI18n() on the client and directly on the server. */
export function formatters(lang: Lang) {
  const locale = localeOf(lang);
  const bg = lang === "bg";

  const nf = (n: number, digits = 0) => n.toLocaleString(locale, { maximumFractionDigits: digits });

  const time = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleString(locale, { timeZone: "Europe/Sofia", ...opts });

  const weekday = (date: string, style: "short" | "long" = "short") =>
    new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));

  const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

  /** "преди 5 мин" / "5 min ago" */
  const ago = (iso: string) => {
    const m = minutesSince(iso);
    const h = Math.round(m / 60);
    if (m < 60) return bg ? `преди ${m} мин` : `${m} min ago`;
    if (h < 24) return bg ? `преди ${h} ч` : `${h} h ago`;
    const d = Math.round(h / 24);
    return bg ? `преди ${d} дни` : `${d} days ago`;
  };

  /** "преди 5 минути" / "5 minutes ago" */
  const agoLong = (iso: string) => {
    const m = minutesSince(iso);
    if (m < 1) return bg ? "току-що" : "just now";
    const unit = (n: number, bgOne: string, bgMany: string, enOne: string) =>
      bg ? `преди ${n} ${n === 1 ? bgOne : bgMany}` : `${n} ${enOne}${n === 1 ? "" : "s"} ago`;
    if (m < 60) return unit(m, "минута", "минути", "minute");
    const h = Math.round(m / 60);
    if (h < 24) return unit(h, "час", "часа", "hour");
    return unit(Math.round(h / 24), "ден", "дни", "day");
  };

  /** "в София" / "във Варна"; in English "in Sofia". */
  const inPlace = (name: string) => (bg ? `${/^[ВвФф]/.test(name) ? "във" : "в"} ${name}` : `in ${name}`);

  return { lang, locale, nf, time, weekday, ago, agoLong, inPlace };
}

export type Formatters = ReturnType<typeof formatters>;
