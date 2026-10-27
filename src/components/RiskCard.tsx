"use client";

import { useState } from "react";
import { CloudRain, Droplets, Thermometer, Wind, ShieldAlert, RotateCw, Share2, Check, ChevronDown } from "lucide-react";
import { DANGERS, dangerByKey, windFrom } from "@/lib/danger";
import { inPlace, nf, timeAgoLong, weekday, type Loc } from "@/lib/client";
import type { RiskResponse } from "@/lib/risk";
import { oblastAt } from "@/lib/oblast";
import { OBLASTS } from "@/data/oblasts";

const daysWord = (n: number) => (n === 0 ? "Вали днес" : n === 1 ? "1 ден без дъжд" : `${n} дни без дъжд`);

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
  if (!data) {
    if (loading) return <div className="skeleton h-[300px] rounded-[28px]" aria-label="Зареждаме опасността за днес" />;
    return (
      <div className="rounded-[28px] bg-card p-5 shadow-[var(--shadow)]">
        <p className="font-display text-lg font-semibold">Не успяхме да изчислим опасността</p>
        <p className="pt-1 text-[15px] text-muted">{error}</p>
        <button
          onClick={onRetry}
          className="pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content"
        >
          <RotateCw size={18} strokeWidth={2} aria-hidden />
          Опитай пак
        </button>
      </div>
    );
  }

  const t = data.today;
  const d = dangerByKey(t.danger);
  const place = loc.source === "gps" ? "около вас" : inPlace(loc.label);

  return (
    <section aria-labelledby="risk-title" className="enter">
      {/* Signature element: the day's danger, as big and plain as a road sign. */}
      <div className="relative overflow-hidden rounded-[28px] p-5 lg:p-6" style={{ background: d.color, color: d.onColor }}>
        <div className="flex items-start justify-between gap-3">
          <p id="risk-title" className="pt-1 text-[15px] font-medium opacity-90">
            Опасност от пожар днес {place}
          </p>
          <ShareButton text={`Опасност от горски пожар днес ${place}: ${d.label.toLowerCase()}.`} loc={loc} />
        </div>
        <p className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em] lg:text-[52px]">{d.label}</p>
        <p className="max-w-[34ch] pt-2 text-[16px] font-medium leading-snug opacity-95">{d.meaning}</p>

        {/* Where today sits among the six levels. */}
        <div className="pt-5" role="img" aria-label={`Ниво ${d.index + 1} от 6`}>
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
            <span>Ниво {d.index + 1} от 6</span>
            <span>Ниска до изключителна</span>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 pt-5 text-[15px] font-medium tabular-nums" aria-label="Времето днес по обяд">
          <li className="inline-flex items-center gap-2">
            <Thermometer size={18} strokeWidth={1.75} aria-hidden />
            {t.temp}°C
          </li>
          <li className="inline-flex items-center gap-2">
            <Droplets size={18} strokeWidth={1.75} aria-hidden />
            Влажност {t.rh}%
          </li>
          <li className="inline-flex items-center gap-2">
            <Wind size={18} strokeWidth={1.75} aria-hidden />
            <span>
              {t.wind} км/ч <span className="opacity-85">от {windFrom(t.windDir)}</span>
            </span>
          </li>
          <li className="inline-flex items-center gap-2">
            <CloudRain size={18} strokeWidth={1.75} aria-hidden />
            {daysWord(data.daysSinceRain)}
          </li>
        </ul>
      </div>

      <div className="flex gap-3 px-1 pt-4">
        <ShieldAlert size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-content" aria-hidden />
        <p className="text-[16px] leading-snug">{d.advice}</p>
      </div>

      <details className="group px-1 pt-3">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-medium text-accent [&::-webkit-details-marker]:hidden">
          Как се изчислява?
          <ChevronDown size={16} strokeWidth={2} className="transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-col gap-2 pb-1 text-[15px] leading-snug text-muted">
          <p>
            Ползваме канадския индекс за пожарна опасност (FWI). С него работи и Европейската система за информация за
            горските пожари (EFFIS), със същите шест нива.
          </p>
          <p>
            Индексът следи колко са изсъхнали тревата, листата и почвата през последните седмици и колко силен е вятърът
            днес. Смятаме го от времето по обяд за последните 45 дни и прогнозата напред. Днешната стойност е{" "}
            <span className="font-medium text-content tabular-nums">{nf(t.fwi, 1)}</span>; ниво „висока“ започва от 21,3.
          </p>
        </div>
      </details>

      <p className="px-1 pt-2 text-[13px] leading-snug text-muted">
        {offline ? (
          <span className="font-medium text-ember">Нямате връзка. Показваме данните от {timeAgoLong(data.updated)}.</span>
        ) : (
          <>Обновено {timeAgoLong(data.updated)}.</>
        )}
      </p>
    </section>
  );
}

/** Shares a link whose preview image shows today's level and the next days for this place.
 *  A GPS position is never shared: it is replaced by the centre of its oblast. */
function ShareButton({ text, loc }: { text: string; loc: Loc }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const o = loc.source === "gps" ? oblastAt(loc.lat, loc.lon) : null;
    const c = o ? OBLASTS.find((x) => x.code === o.code)! : null;
    const q = new URLSearchParams(
      c
        ? { lat: c.lat.toFixed(2), lon: c.lon.toFixed(2), n: `област ${c.name.replace(/ (град|област)$/, "")}` }
        : { lat: loc.lat.toFixed(2), lon: loc.lon.toFixed(2), n: loc.label },
    );
    const url = `${window.location.origin}/s?${q}`;
    try {
      if (navigator.share) await navigator.share({ title: "ОгнеЩит", text, url });
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
      aria-label={done ? "Копирано" : "Сподели"}
      className="pressable relative -mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/10"
    >
      <Share2 size={20} strokeWidth={2} aria-hidden className="swap absolute" data-hidden={done} />
      <Check size={20} strokeWidth={2.25} aria-hidden className="swap absolute" data-hidden={!done} />
    </button>
  );
}

export function Forecast({ data }: { data: RiskResponse }) {
  return (
    <section aria-labelledby="fc-title" className="enter">
      <h2 id="fc-title" className="px-1 font-display text-[20px] font-semibold">
        Следващите 5 дни
      </h2>
      <ol className="mt-3 grid grid-cols-5 gap-2">
        {data.forecast.map((f) => {
          const d = dangerByKey(f.danger);
          return (
            <li key={f.date} className="flex flex-col items-center gap-2 rounded-2xl bg-card px-1 py-3 shadow-[var(--shadow)]">
              <span className="text-[13px] font-medium capitalize text-muted">{weekday(f.date)}</span>
              {/* Colour plus a level number: never colour alone. */}
              <span
                className="grid size-9 place-items-center rounded-full text-[15px] font-bold tabular-nums"
                style={{ background: d.color, color: d.onColor }}
                aria-hidden
              >
                {d.index + 1}
              </span>
              <span className="text-center text-[12px] font-medium leading-tight">{d.label}</span>
              <span className="text-[12px] tabular-nums text-muted" aria-hidden>
                {f.temp}°
              </span>
              <span className="sr-only">
                {weekday(f.date)}: опасност {d.label.toLowerCase()}, {f.temp} градуса
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
