"use client";

import { AlertTriangle, CheckCircle2, CloudRain, Snowflake, ThermometerSnowflake } from "lucide-react";
import { useJson } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { oblastShort } from "@shtit/core/i18n/names";
import { warningIn, type Warning, type WarningsResponse } from "@shtit/core/warning-types";
import { FLOOD_WARNINGS, type Weather } from "@/lib/flood-types";

/**
 * Rain, snow and melt for the next days: what the rivers will have to carry. Plain amounts, no invented thresholds;
 * the official warnings below carry НИМХ's own judgement.
 */
export function RainSnow({ weather }: { weather: Weather | null }) {
  const { t, nf, weekday, lang, inPlace } = useI18n();
  if (!weather) return null;
  const days = weather.days;
  const next24 = days[0]?.precip ?? 0;
  const next3 = days.slice(0, 3).reduce((s, d) => s + d.precip, 0);
  const wettest = days.reduce((m, d) => (d.precip > m.precip ? d : m), days[0]);
  const snowIn3 = days[Math.min(3, days.length - 1)]?.snowDepth ?? null;
  const melt = snowIn3 != null ? weather.snowNow - snowIn3 : 0;
  const onDay = (d: string) => (d === days[0]?.date ? t("днес", "today") : lang === "bg" ? inPlace(weekday(d, "long")) : `on ${weekday(d, "long")}`);
  const max = Math.max(...days.map((d) => d.precip), 1);

  return (
    <section aria-labelledby="wx-title" className="enter">
      <h2 id="wx-title" className="px-1 font-display text-[20px] font-semibold">
        {t("Дъжд и сняг", "Rain and snow")}
      </h2>
      <div className="mt-3 flex flex-col divide-y divide-line overflow-hidden rounded-[20px] bg-card">
        <div className="flex gap-3 p-4">
          <CloudRain size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold tabular-nums">
              {t(`${nf(next3, 0)} мм за 3 дни`, `${nf(next3, 0)} mm over 3 days`)}
              <span className="font-normal text-muted">{t(`, днес ${nf(next24, 0)} мм`, `, today ${nf(next24, 0)} mm`)}</span>
            </p>
            {wettest && wettest.precip >= 1 && (
              <p className="pt-0.5 text-[14px] leading-snug text-muted tabular-nums">
                {t(`Най-много ${onDay(wettest.date)}: ${nf(wettest.precip, 0)} мм.`, `Most ${onDay(wettest.date)}: ${nf(wettest.precip, 0)} mm.`)}{" "}
                {weather.past3 >= 20 &&
                  t(
                    `През последните 3 дни паднаха ${nf(weather.past3, 0)} мм, затова почвата е мокра и попива по-малко.`,
                    `${nf(weather.past3, 0)} mm fell in the last 3 days, so the ground is wet and soaks up less.`,
                  )}
              </p>
            )}
            {/* Seven small bars: one per day, height = amount. The numbers are in the labels for screen readers. */}
            <ol className="mt-3 grid grid-cols-7 items-end gap-1.5" aria-label={t("Валежи по дни", "Rain and snow by day")}>
              {days.map((d, i) => (
                <li key={d.date} className="flex flex-col items-center gap-1">
                  <span className="text-[11px] tabular-nums text-muted">{d.precip >= 0.5 ? nf(d.precip, 0) : ""}</span>
                  <span className="flex h-12 w-full max-w-7 items-end">
                    <span
                      className="rise w-full rounded-t-[4px] rounded-b-[2px]"
                      style={{ height: `${Math.max(4, (d.precip / max) * 100)}%`, background: d.snow > d.rain ? "var(--muted)" : "var(--water)", opacity: d.precip >= 0.5 ? 1 : 0.25, transitionDelay: `${i * 30}ms` }}
                    />
                  </span>
                  <span className="text-[11px] font-medium capitalize">{i === 0 ? t("Дн", "Tod") : weekday(d.date)}</span>
                  <span className="sr-only">{t(`${nf(d.precip, 1)} мм`, `${nf(d.precip, 1)} mm`)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="flex gap-3 p-4">
          <Snowflake size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold tabular-nums">
              {weather.snowNow >= 1 ? t(`Сняг: ${nf(weather.snowNow)} см`, `Snow: ${nf(weather.snowNow)} cm`) : t("Няма сняг на земята", "No snow on the ground")}
            </p>
            <p className="pt-0.5 text-[14px] leading-snug text-muted tabular-nums">
              {weather.snowNow >= 1 && melt >= 3
                ? t(
                    `До 3 дни се очаква да се стопят около ${nf(melt)} см. Топящият се сняг отива в реките.`,
                    `About ${nf(melt)} cm is expected to melt within 3 days. Melting snow runs into the rivers.`,
                  )
                : weather.snowNow >= 1
                  ? t("Не се очаква голямо топене до 3 дни.", "No big melt expected within 3 days.")
                  : days.some((d) => d.snow >= 1)
                    ? t("Очаква се сняг през седмицата.", "Snow is expected this week.")
                    : t("Тук снегът не е фактор тази седмица.", "Snow is not a factor here this week.")}
            </p>
          </div>
        </div>
        {weather.rainOnSnow.length > 0 && (
          <div className="flex gap-3 p-4">
            <ThermometerSnowflake size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ember" aria-hidden />
            <p className="text-[15px] leading-snug">
              <span className="font-semibold">{t("Дъжд върху сняг", "Rain on snow")}</span>{" "}
              {t(
                `${onDay(weather.rainOnSnow[0])}: дъждът и топящият се сняг стигат до реките заедно. Така започват много зимни наводнения.`,
                `${onDay(weather.rainOnSnow[0])}: rain and melting snow reach the rivers together. Many winter floods start this way.`,
              )}
            </p>
          </div>
        )}
      </div>
      <p className="px-1 pt-2 text-[13px] text-muted">{t("Прогноза Open-Meteo за мястото. Валежите са дъжд и разтопен сняг.", "Open-Meteo forecast for the place. Amounts are rain plus melted snow.")}</p>
    </section>
  );
}

const LEVEL = {
  2: { label: ["Жълт код", "Yellow warning"], bg: "#e3b021", fg: "#1b1b1b" },
  3: { label: ["Оранжев код", "Orange warning"], bg: "#e3741b", fg: "#1b1b1b" },
  4: { label: ["Червен код", "Red warning"], bg: "#c7361f", fg: "#ffffff" },
} as const;

const floodFirst = (a: Warning, b: Warning) => {
  const ia = FLOOD_WARNINGS.indexOf(a.type);
  const ib = FLOOD_WARNINGS.indexOf(b.type);
  return b.level - a.level || (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
};

/** НИМХ warnings for the place's oblast, floods and rain first. */
export function Warnings({ oblast }: { oblast: string | null }) {
  const warn = useJson<WarningsResponse>("/api/warnings");
  const { t, tp, lang, time } = useI18n();
  if (!warn.data) return null;
  const mine = oblast ? warn.data.warnings.filter((w) => warningIn(w, oblast)).sort(floodFirst) : [];
  return (
    <section aria-labelledby="warn-title" className="enter">
      <h2 id="warn-title" className="px-1 font-display text-[20px] font-semibold">
        {t("Предупреждения", "Warnings")}
      </h2>
      <div className="mt-3 flex flex-col divide-y divide-line overflow-hidden rounded-[20px] bg-card">
        {mine.length > 0 ? (
          mine.map((w, i) => {
            const lv = LEVEL[w.level as 2 | 3 | 4] ?? LEVEL[2];
            const text = lang === "en" && w.en ? w.en : w;
            return (
              <div key={i} className="flex gap-3 p-4">
                <AlertTriangle size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[16px] font-semibold">
                    <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: lv.bg, color: lv.fg }}>
                      {tp(lv.label)}
                    </span>
                    {text.event || text.headline}
                  </p>
                  {w.onset && w.expires && (
                    <p className="pt-1 text-[14px] text-muted tabular-nums">
                      {t("От", "From")} {time(w.onset, { weekday: "short", hour: "2-digit", minute: "2-digit" })} {t("до", "to")}{" "}
                      {time(w.expires, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {text.description && <p className="pt-1 text-[14px] leading-snug">{text.description}</p>}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex gap-3 p-4">
            <CheckCircle2 size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--d-low)]" aria-hidden />
            <p className="text-[15px] leading-snug">
              {t(
                `Няма предупреждения на НИМХ${oblast ? ` за област ${oblastShort(oblast, "bg")}` : ""}.`,
                `No warnings from the national weather service${oblast ? ` for ${oblastShort(oblast, "en")} province` : ""}.`,
              )}
            </p>
          </div>
        )}
      </div>
      {warn.data.backupFrom && (
        <p className="px-1 pt-2 text-[13px] text-muted">{t("MeteoAlarm не отговаря; показваме запазено копие.", "MeteoAlarm isn't answering; showing a saved copy.")}</p>
      )}
    </section>
  );
}
