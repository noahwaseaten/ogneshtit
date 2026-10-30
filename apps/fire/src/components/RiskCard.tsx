"use client";

import { useState } from "react";
import { CloudRain, Droplets, Thermometer, Wind, ShieldAlert, RotateCw, Share2, Check, ChevronDown } from "lucide-react";
import { DANGERS, dangerByKey, dangerText, windFrom, windShort } from "@/lib/danger";
import type { Loc } from "@shtit/core/client";
import type { RiskResponse } from "@/lib/risk";
import { oblastAt } from "@shtit/core/oblast";
import { OBLASTS } from "@shtit/core/data/oblasts";
import { useI18n } from "@shtit/core/i18n/client";
import { APP_NAME } from "@/brand";
import { placeName } from "@shtit/core/i18n/names";

export function RiskCard({
  data,
  loading,
  error,
  offline,
  onRetry,
  loc,
}: {
  data: RiskResponse | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  onRetry: () => void;
  loc: Loc;
}) {
  const { t, lang, nf, agoLong, inPlace } = useI18n();

  if (!data) {
    if (loading) return <div className="skeleton h-[300px] rounded-[20px]" aria-label={t("Зареждаме опасността за днес", "Loading today's danger")} />;
    return (
      <div className="rounded-[20px] bg-card p-5">
        <p className="font-display text-lg font-semibold">{t("Не успяхме да изчислим опасността", "We couldn't work out the danger")}</p>
        <p className="pt-1 text-[15px] text-muted">{error}</p>
        <button
          onClick={onRetry}
          className="pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content"
        >
          <RotateCw size={18} strokeWidth={2} aria-hidden />
          {t("Опитай пак", "Try again")}
        </button>
      </div>
    );
  }

  const today = data.today;
  const d = dangerByKey(today.danger);
  const dt = dangerText(d, lang);
  const place = loc.source === "gps" ? t("около вас", "around you") : inPlace(placeName(loc.label, lang));
  const rainless = data.daysSinceRain;
  const daysWord =
    rainless == null
      ? null
      : rainless === 0
      ? t("Вали днес", "Rain today")
      : rainless === 1
        ? t("1 ден без дъжд", "1 day without rain")
        : t(`${rainless} дни без дъжд`, `${rainless} days without rain`);

  return (
    <section aria-labelledby="risk-title" className="enter">
      {/* Signature element: the day's danger, as big and plain as a road sign. */}
      <div className="relative overflow-hidden rounded-[24px] p-5 lg:p-6" style={{ background: d.color, color: d.onColor }}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="risk-title" className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em] lg:text-[52px]">
            {dt.label}
            <span className="sr-only"> {t(`опасност от пожар днес ${place}`, `fire danger today ${place}`)}</span>
          </h2>
          <ShareButton
            text={t(`Опасност от горски пожар днес ${place}: ${dt.label.toLowerCase()}.`, `Forest fire danger today ${place}: ${dt.label.toLowerCase()}.`)}
            loc={loc}
          />
        </div>
        <p aria-hidden className="pt-1 text-[17px] font-semibold">
          {t(`опасност от пожар днес ${place}`, `fire danger today ${place}`)}
        </p>
        <p className="max-w-[34ch] pt-3 text-[16px] leading-snug opacity-95">{dt.meaning}</p>

        {/* Where today sits among the six levels. */}
        <div className="pt-5" role="img" aria-label={t(`Ниво ${d.index + 1} от 6`, `Level ${d.index + 1} of 6`)}>
          <div className="flex gap-1">
            {DANGERS.map((c) => (
              <span
                key={c.key}
                className="h-2 flex-1 rounded-full"
                style={{ background: "currentColor", opacity: c.index === d.index ? 1 : c.index < d.index ? 0.45 : 0.18 }}
              />
            ))}
          </div>
          <div className="flex justify-between pt-1.5 text-[12px] font-medium tabular-nums opacity-85">
            <span>{t(`Ниво ${d.index + 1} от 6`, `Level ${d.index + 1} of 6`)}</span>
            <span>{t("Ниска до изключителна", "Low to exceptional")}</span>
          </div>
        </div>

        <ul
          className="grid grid-cols-2 gap-x-3 gap-y-2 pt-5 text-[15px] font-medium tabular-nums [&>li]:whitespace-nowrap [&_svg]:shrink-0"
          aria-label={t("Времето днес по обяд", "Today's weather at midday")}
        >
          <li className="inline-flex items-center gap-2">
            <Thermometer size={18} strokeWidth={1.75} aria-hidden />
            {today.temp}°C
          </li>
          <li className="inline-flex items-center gap-2">
            <Droplets size={18} strokeWidth={1.75} aria-hidden />
            {t("Влажност", "Humidity")} {today.rh}%
          </li>
          <li className="inline-flex items-center gap-2">
            <Wind size={18} strokeWidth={1.75} aria-hidden />
            <span aria-hidden>
              {today.wind} {t("км/ч", "km/h")}, {windShort(today.windDir, lang)}
            </span>
            <span className="sr-only">
              {t(`Вятър ${today.wind} км/ч от ${windFrom(today.windDir, "bg")}`, `Wind ${today.wind} km/h from the ${windFrom(today.windDir, "en")}`)}
            </span>
          </li>
          {daysWord && (
            <li className="inline-flex items-center gap-2">
              <CloudRain size={18} strokeWidth={1.75} aria-hidden />
              {daysWord}
            </li>
          )}
        </ul>
      </div>

      <div className="flex gap-3 px-1 pt-4">
        <ShieldAlert size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-content" aria-hidden />
        <p className="text-[16px] leading-snug">{dt.advice}</p>
      </div>

      <details className="group px-1 pt-3">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-medium text-accent [&::-webkit-details-marker]:hidden">
          {t("Как се изчислява?", "How is this worked out?")}
          <ChevronDown size={16} strokeWidth={2} className="transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        {lang === "bg" ? (
          <div className="flex flex-col gap-2 pb-1 text-[15px] leading-snug text-muted">
            <p>
              Ползваме канадския индекс за пожарна опасност (FWI). С него работи и Европейската система за информация за
              горските пожари (EFFIS), със същите шест нива.
            </p>
            <p>
              Индексът следи колко са изсъхнали тревата, листата и почвата през последните седмици и колко силен е вятърът
              днес. Смятаме го от времето по обяд за последните 45 дни и прогнозата напред. Днешната стойност е{" "}
              <span className="font-medium text-content tabular-nums">{nf(today.fwi, 1)}</span>; ниво „висока“ започва от 21,3.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-1 text-[15px] leading-snug text-muted">
            <p>
              We use the Canadian Fire Weather Index (FWI). The European Forest Fire Information System (EFFIS) uses it too,
              with the same six levels.
            </p>
            <p>
              The index tracks how dry the grass, leaves and soil have become over the past weeks and how strong the wind is
              today. We work it out from the midday weather for the last 45 days and the forecast ahead. Today&apos;s value is{" "}
              <span className="font-medium text-content tabular-nums">{nf(today.fwi, 1)}</span>; the &quot;high&quot; level starts at 21.3.
            </p>
          </div>
        )}
      </details>

      <p className="px-1 pt-2 text-[13px] leading-snug text-muted">
        {offline ? (
          <span className="font-medium text-ember">
            {t(`Нямате връзка. Показваме данните от ${agoLong(data.updated)}.`, `You're offline. Showing data from ${agoLong(data.updated)}.`)}
          </span>
        ) : data.approx ? (
          <>
            {t(
              "Основната метео услуга не отговаря. Това е приблизителна оценка по прогнозата на MET Norway.",
              "The main weather service isn't answering. This is an estimate from the MET Norway forecast.",
            )}
          </>
        ) : (
          <>{t(`Обновено ${agoLong(data.updated)}.`, `Updated ${agoLong(data.updated)}.`)}</>
        )}
      </p>
    </section>
  );
}

/** Shares a link whose preview image shows today's level for this place, in the sharer's language.
 *  A GPS position is never shared: it is replaced by the centre of its oblast. */
function ShareButton({ text, loc }: { text: string; loc: Loc }) {
  const [done, setDone] = useState(false);
  const { t, lang } = useI18n();
  const share = async () => {
    const o = loc.source === "gps" ? oblastAt(loc.lat, loc.lon) : null;
    const c = o ? OBLASTS.find((x) => x.code === o.code)! : null;
    const q = new URLSearchParams(
      c
        ? { lat: c.lat.toFixed(2), lon: c.lon.toFixed(2), n: `област ${c.name.replace(/ (град|област)$/, "")}` }
        : { lat: loc.lat.toFixed(2), lon: loc.lon.toFixed(2), n: loc.label },
    );
    q.set("l", lang);
    const url = `${window.location.origin}/s?${q}`;
    try {
      if (navigator.share) await navigator.share({ title: APP_NAME[lang], text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }
    } catch {}
  };
  return (
    <button
      onClick={share}
      aria-label={done ? t("Копирано", "Copied") : t("Сподели", "Share")}
      className="pressable relative -mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/10"
    >
      <Share2 size={20} strokeWidth={2} aria-hidden className="swap absolute" data-hidden={done} />
      <Check size={20} strokeWidth={2.25} aria-hidden className="swap absolute" data-hidden={!done} />
    </button>
  );
}

/**
 * The next five days as five columns. Each column's height and colour show the level (1 to 6), so the
 * week reads at a glance; the number and the word repeat it, so colour is never the only signal.
 */
export function Forecast({ data }: { data: RiskResponse }) {
  const { t, lang, weekday, inPlace } = useI18n();
  // The worst day, named in a sentence under the heading: "Най-висока: екстремна в събота".
  const worstAt = data.forecast.reduce((m, f, i) => (dangerByKey(f.danger).index > dangerByKey(data.forecast[m].danger).index ? i : m), 0);
  const w = dangerText(dangerByKey(data.forecast[worstAt].danger), lang);
  const day = (i: number) => (i === 0 ? t("Утре", "Tomorrow") : weekday(data.forecast[i].date));
  const when = worstAt === 0 ? t("утре", "tomorrow") : lang === "bg" ? inPlace(weekday(data.forecast[worstAt].date, "long")) : `on ${weekday(data.forecast[worstAt].date, "long")}`;
  return (
    <section aria-labelledby="fc-title" className="enter">
      <h2 id="fc-title" className="px-1 font-display text-[20px] font-semibold">
        {t("Следващите 5 дни", "The next 5 days")}
      </h2>
      <p className="px-1 pt-0.5 text-[15px] text-muted">
        {t("Най-висока:", "Highest:")} <span className="font-semibold text-content">{w.label.toLowerCase()}</span> {when}
      </p>
      <ol className="mt-3 grid grid-cols-5 gap-1.5 rounded-[28px] bg-card p-2">
        {data.forecast.map((f, i) => {
          const d = dangerByKey(f.danger);
          const label = dangerText(d, lang).label;
          return (
            <li key={f.date} className="flex flex-col items-center gap-2 rounded-[22px] px-0.5 pb-2.5 pt-3">
              <span className="text-[14px] font-semibold capitalize leading-none">{day(i)}</span>
              <span className="relative flex h-[120px] w-full max-w-[52px] items-end overflow-hidden rounded-[18px] bg-line/60" aria-hidden>
                <span
                  className="rise flex w-full justify-center rounded-[18px] pt-2 font-display text-[20px] font-bold tabular-nums"
                  style={{ height: `${30 + d.index * 14}%`, background: d.color, color: d.onColor, transitionDelay: `${i * 40}ms` }}
                >
                  {d.index + 1}
                </span>
              </span>
              <span className="min-h-[2lh] text-center text-[12px] font-semibold leading-tight [text-wrap:balance]" aria-hidden>
                {label}
              </span>
              <span className="text-[13px] font-medium tabular-nums text-muted" aria-hidden>
                {f.temp}°
              </span>
              <span className="sr-only">
                {t(
                  `${day(i)}: опасност ${label.toLowerCase()}, ниво ${d.index + 1} от 6, ${f.temp} градуса`,
                  `${day(i)}: ${label.toLowerCase()} danger, level ${d.index + 1} of 6, ${f.temp} degrees`,
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
