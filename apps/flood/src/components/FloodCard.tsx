"use client";

import { useState } from "react";
import { Check, ChevronDown, RotateCw, Share2, ShieldAlert, Waves, TrendingUp, CalendarClock, Ruler } from "lucide-react";
import type { Loc } from "@shtit/core/client";
import { oblastAt } from "@shtit/core/oblast";
import { OBLASTS } from "@shtit/core/data/oblasts";
import { useI18n } from "@shtit/core/i18n/client";
import { placeName } from "@shtit/core/i18n/names";
import { APP_NAME } from "@/brand";
import { GAUGES } from "@/data/gauges";
import { LEVELS, NEAR_KM, levelByKey, levelText, type PlaceResponse } from "@/lib/flood-types";
import { gaugeName, useFlow, vsNormalText } from "./bits";

/** The day's flood danger for the place, as big and plain as a road sign. */
export function FloodCard({
  data,
  loading,
  error,
  offline,
  onRetry,
  onRiver,
  loc,
}: {
  data: PlaceResponse | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  onRetry: () => void;
  onRiver: (id: string) => void;
  loc: Loc;
}) {
  const { t, lang, nf, agoLong, inPlace, weekday } = useI18n();
  const flow = useFlow();

  if (!data) {
    if (loading) return <div className="skeleton h-[320px] rounded-[20px]" aria-label={t("Зареждаме опасността за днес", "Loading today's danger")} />;
    return <Failed text={error} onRetry={onRetry} />;
  }

  const place = loc.source === "gps" ? t("около вас", "around you") : inPlace(placeName(loc.label, lang));
  const river = data.river;

  if (!river) {
    if (data.riverFailed) return <Failed text={t("Прогнозата за реките не отговаря в момента.", "The river forecast isn't answering right now.")} onRetry={onRetry} />;
    return (
      <section aria-labelledby="risk-title" className="enter rounded-[24px] bg-card p-5 lg:p-6">
        <Waves size={28} strokeWidth={1.75} className="text-accent" aria-hidden />
        <h2 id="risk-title" className="pt-3 font-display text-[26px] font-bold leading-tight">
          {t(`Няма голяма река до ${NEAR_KM} км`, `No large river within ${NEAR_KM} km`)}
        </h2>
        <p className="pt-2 text-[16px] leading-snug">
          {t(
            `Прогнозата за реките (GloFAS) следи големите реки. ${place[0].toUpperCase() + place.slice(1)} наводнение идва най-вече от пороен дъжд и малки потоци, затова гледайте дъжда, снега и предупрежденията по-долу.`,
            `The river forecast (GloFAS) covers large rivers. ${place[0].toUpperCase() + place.slice(1)}, floods come mostly from downpours and small streams, so watch the rain, snow and warnings below.`,
          )}
        </p>
      </section>
    );
  }

  const g = GAUGES.find((x) => x.id === river.gauge)!;
  const d0 = river.days[0];
  const l = levelByKey(d0?.level ?? "low");
  const lt = levelText(l, lang);
  const peak = levelByKey(river.peak.level);
  const month = Number((d0?.date ?? "2000-01").slice(5, 7)) - 1;
  const vs = (d0?.median ?? 0) / Math.max(g.normal[month], 0.01);
  const d3 = river.days[Math.min(3, river.days.length - 1)];
  const change = d0 && d3 ? (d3.median - d0.median) / Math.max(d0.median, 0.1) : 0;
  const when = (date: string) => (date === d0?.date ? t("днес", "today") : lang === "bg" ? inPlace(weekday(date, "long")) : `on ${weekday(date, "long")}`);

  return (
    <section aria-labelledby="risk-title" className="enter">
      <div className="relative overflow-hidden rounded-[24px] p-5 lg:p-6" style={{ background: l.color, color: l.onColor }}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="risk-title" className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em] lg:text-[52px]">
            {lt.label}
            <span className="sr-only"> {t(`опасност от наводнение днес ${place}`, `flood danger today ${place}`)}</span>
          </h2>
          <ShareButton text={t(`Опасност от наводнение днес ${place}: ${lt.label.toLowerCase()}.`, `Flood danger today ${place}: ${lt.label.toLowerCase()}.`)} loc={loc} />
        </div>
        <p aria-hidden className="pt-1 text-[17px] font-semibold">
          {t(`опасност от наводнение днес ${place}`, `flood danger today ${place}`)}
        </p>
        <p className="max-w-[36ch] pt-3 text-[16px] leading-snug opacity-95">{lt.meaning}</p>

        <div className="pt-5" role="img" aria-label={t(`Ниво ${l.index + 1} от 5`, `Level ${l.index + 1} of 5`)}>
          <div className="flex gap-1">
            {LEVELS.map((c) => (
              <span key={c.key} className="h-2 flex-1 rounded-full" style={{ background: "currentColor", opacity: c.index === l.index ? 1 : c.index < l.index ? 0.45 : 0.18 }} />
            ))}
          </div>
          <div className="flex justify-between pt-1.5 text-[12px] font-medium tabular-nums opacity-85">
            <span>{t(`Ниво ${l.index + 1} от 5`, `Level ${l.index + 1} of 5`)}</span>
            <span>{t("Ниска до изключителна", "Low to severe")}</span>
          </div>
        </div>

        <ul className="flex flex-col gap-2 pt-5 text-[15px] font-medium leading-snug tabular-nums [&_svg]:mt-0.5 [&_svg]:shrink-0">
          <li>
            <button onClick={() => onRiver(g.id)} className="-mx-2 flex w-[calc(100%+16px)] items-start gap-2 rounded-xl px-2 py-1 text-left hover:bg-black/10">
              <Waves size={18} strokeWidth={1.75} aria-hidden />
              <span>
                {gaugeName(g, lang)}
                <span className="opacity-85">{river.km >= 1 ? t(`, на ${nf(river.km)} км`, `, ${nf(river.km)} km away`) : ""}</span>
              </span>
            </button>
          </li>
          <li className="flex items-start gap-2">
            <Ruler size={18} strokeWidth={1.75} aria-hidden />
            <span>
              {flow(d0?.median ?? 0)} m³/s, {vsNormalText(vs, t, nf)}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <TrendingUp size={18} strokeWidth={1.75} aria-hidden />
            <span>
              {change > 0.1
                ? t("Расте през следващите 3 дни", "Rising over the next 3 days")
                : change < -0.1
                  ? t("Спада през следващите 3 дни", "Falling over the next 3 days")
                  : t("Без голяма промяна до 3 дни", "Little change over 3 days")}
            </span>
          </li>
          {peak.index > l.index && (
            <li className="flex items-start gap-2">
              <CalendarClock size={18} strokeWidth={1.75} aria-hidden />
              <span>
                {t(`До 15 дни: ${levelText(peak, "bg").label.toLowerCase()} ${when(river.peak.date)}`, `Within 15 days: ${levelText(peak, "en").label.toLowerCase()} ${when(river.peak.date)}`)}
              </span>
            </li>
          )}
        </ul>
      </div>

      <div className="flex gap-3 px-1 pt-4">
        <ShieldAlert size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-content" aria-hidden />
        <p className="text-[16px] leading-snug">{lt.advice}</p>
      </div>

      <details className="group px-1 pt-3">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-medium text-accent [&::-webkit-details-marker]:hidden">
          {t("Как се изчислява?", "How is this worked out?")}
          <ChevronDown size={16} strokeWidth={2} className="transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-col gap-2 pb-1 text-[15px] leading-snug text-muted">
          {lang === "bg" ? (
            <>
              <p>
                Ползваме GloFAS, глобалната система за прогноза на наводнения на Copernicus (ЕС). Всеки ден тя смята 51 варианта на
                следващите седмици за всяка голяма река. Ние гледаме колко от тях минават праговете на реката.
              </p>
              <p>
                Праговете са водата, която тази река има средно веднъж на 2, 5 и 20 години. Изчислили сме ги от най-високата вода на
                всяка година от {g.years.replace("-", " до ")}. Ден стига ниво, когато поне 3 от 10 варианта минат прага, както прави и
                самата GloFAS. Днес над 2-годишната вода са{" "}
                <span className="font-medium text-content tabular-nums">{nf((d0?.above.q2 ?? 0) * 100)}%</span> от вариантите.
              </p>
              <p>Ползваме най-рисковата от реките в радиус {NEAR_KM} км. Малки потоци моделът не вижда.</p>
            </>
          ) : (
            <>
              <p>
                We use GloFAS, the Copernicus (EU) global flood forecast. Every day it works out 51 versions of the coming weeks for each
                large river. We look at how many of them pass the river&apos;s thresholds.
              </p>
              <p>
                The thresholds are the water this river reaches on average once in 2, 5 and 20 years. We worked them out from the highest
                water of each year from {g.years.replace("-", " to ")}. A day reaches a level when at least 3 in 10 versions pass the
                line, as GloFAS itself does. Today{" "}
                <span className="font-medium text-content tabular-nums">{nf((d0?.above.q2 ?? 0) * 100)}%</span> of the versions are above
                the 2-year flow.
              </p>
              <p>We use the riskiest river within {NEAR_KM} km. The model cannot see small streams.</p>
            </>
          )}
        </div>
      </details>

      <p className="px-1 pt-2 text-[13px] leading-snug text-muted">
        {offline ? (
          <span className="font-medium text-ember">
            {t(`Нямате връзка. Показваме данните от ${agoLong(data.updated)}.`, `You're offline. Showing data from ${agoLong(data.updated)}.`)}
          </span>
        ) : data.backupFrom ? (
          t(`GloFAS не отговаря. Показваме запазено копие от ${agoLong(data.backupFrom)}.`, `GloFAS isn't answering. Showing a saved copy from ${agoLong(data.backupFrom)}.`)
        ) : (
          t(`Обновено ${agoLong(river.updated)}. GloFAS се обновява веднъж на ден.`, `Updated ${agoLong(river.updated)}. GloFAS updates once a day.`)
        )}
      </p>
    </section>
  );
}

function Failed({ text, onRetry }: { text: string | null; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-[20px] bg-card p-5">
      <p className="font-display text-lg font-semibold">{t("Не успяхме да изчислим опасността", "We couldn't work out the danger")}</p>
      <p className="pt-1 text-[15px] text-muted">{text}</p>
      <button onClick={onRetry} className="pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content">
        <RotateCw size={18} strokeWidth={2} aria-hidden />
        {t("Опитай пак", "Try again")}
      </button>
    </div>
  );
}

/** Shares a link whose preview shows today's level for this place. A GPS position is replaced by its oblast's centre. */
function ShareButton({ text, loc }: { text: string; loc: Loc }) {
  const [done, setDone] = useState(false);
  const { t, lang } = useI18n();
  const share = async () => {
    const o = loc.source === "gps" ? oblastAt(loc.lat, loc.lon) : null;
    const c = o ? OBLASTS.find((x) => x.code === o.code)! : null;
    const q = new URLSearchParams(
      c ? { lat: c.lat.toFixed(2), lon: c.lon.toFixed(2), n: `област ${c.name.replace(/ (град|област)$/, "")}` } : { lat: loc.lat.toFixed(2), lon: loc.lon.toFixed(2), n: loc.label },
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
    <button onClick={share} aria-label={done ? t("Копирано", "Copied") : t("Сподели", "Share")} className="pressable relative -mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/10">
      <Share2 size={20} strokeWidth={2} aria-hidden className="swap absolute" data-hidden={done} />
      <Check size={20} strokeWidth={2.25} aria-hidden className="swap absolute" data-hidden={!done} />
    </button>
  );
}

/**
 * The next 7 days as columns: height and colour show the level, the number and word repeat it, and the share of
 * runs above the 2-year flow is written under each day when there is any.
 */
export function FloodForecast({ data }: { data: PlaceResponse }) {
  const { t, lang, weekday, nf, inPlace } = useI18n();
  const days = data.river?.days.slice(1, 8) ?? [];
  if (!days.length) return null;
  const worst = days.reduce((m, d) => (levelByKey(d.level).index > levelByKey(m.level).index ? d : m), days[0]);
  const w = levelText(levelByKey(worst.level), lang);
  const day = (d: string, i: number) => (i === 0 ? t("Утре", "Tmrw") : weekday(d));
  return (
    <section aria-labelledby="fc-title" className="enter">
      <h2 id="fc-title" className="px-1 font-display text-[20px] font-semibold">
        {t("Следващите 7 дни", "The next 7 days")}
      </h2>
      <p className="px-1 pt-0.5 text-[15px] text-muted">
        {t("Най-висока:", "Highest:")} <span className="font-semibold text-content">{w.label.toLowerCase()}</span>{" "}
        {worst.date === days[0].date ? t("утре", "tomorrow") : lang === "bg" ? inPlace(weekday(worst.date, "long")) : `on ${weekday(worst.date, "long")}`}
      </p>
      <ol className="mt-3 grid grid-cols-7 gap-1 rounded-[28px] bg-card p-1.5">
        {days.map((f, i) => {
          const l = levelByKey(f.level);
          const label = levelText(l, lang).label;
          const chance = Math.round(f.above.q2 * 100);
          return (
            <li key={f.date} className="flex flex-col items-center gap-1.5 rounded-[22px] px-0.5 pb-2 pt-2.5">
              <span className="text-[13px] font-semibold capitalize leading-none">{day(f.date, i)}</span>
              <span className="relative flex h-[104px] w-full max-w-[44px] items-end overflow-hidden rounded-[16px] bg-line/60" aria-hidden>
                <span
                  className="rise flex w-full justify-center rounded-[16px] pt-1.5 font-display text-[17px] font-bold tabular-nums"
                  style={{ height: `${32 + l.index * 17}%`, background: l.color, color: l.onColor, transitionDelay: `${i * 35}ms` }}
                >
                  {l.index + 1}
                </span>
              </span>
              <span className="min-h-[1lh] text-[12px] font-medium tabular-nums text-muted" aria-hidden>
                {chance > 0 ? `${chance}%` : "·"}
              </span>
              <span className="sr-only">
                {t(
                  `${day(f.date, i)}: опасност ${label.toLowerCase()}, ниво ${l.index + 1} от 5, ${nf(chance)}% шанс за над 2-годишната вода`,
                  `${day(f.date, i)}: ${label.toLowerCase()} danger, level ${l.index + 1} of 5, ${nf(chance)}% chance of passing the 2-year flow`,
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="px-1 pt-2 text-[13px] text-muted">{t("Процентът е шансът реката да мине водата, която идва веднъж на 2 години.", "The percentage is the chance the river passes the flow it reaches once in 2 years.")}</p>
    </section>
  );
}
