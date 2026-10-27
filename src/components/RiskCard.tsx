"use client";

import { CloudRain, Droplets, Thermometer, Wind, ShieldAlert, RotateCw } from "lucide-react";
import { DANGERS, type DangerKey } from "@/lib/danger";
import { timeAgo, weekday } from "@/lib/client";
import type { RiskResponse } from "@/lib/risk";

const fmt = (n: number) => n.toLocaleString("bg-BG", { maximumFractionDigits: 1 });
const byKey = (k: string) => DANGERS.find((d) => d.key === (k as DangerKey)) ?? DANGERS[0];

export function RiskCard({
  data,
  loading,
  error,
  offline,
  onRetry,
}: {
  data: RiskResponse | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  onRetry: () => void;
}) {
  if (!data) {
    if (loading) return <div className="skeleton h-[260px] rounded-[28px]" aria-label="Зареждане на опасността" />;
    return (
      <div className="rounded-[28px] bg-card p-5 shadow-[var(--shadow)]">
        <p className="font-display text-lg font-semibold">Не успяхме да изчислим опасността</p>
        <p className="pt-1 text-[15px] text-muted">{error}</p>
        <button
          onClick={onRetry}
          className="pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content"
        >
          <RotateCw size={18} strokeWidth={2} aria-hidden />
          Опитай отново
        </button>
      </div>
    );
  }

  const t = data.today;
  const d = byKey(t.danger);
  const effis = data.effis ? byKey(data.effis.danger) : null;

  return (
    <section aria-labelledby="risk-title" className="enter">
      {/* Signature element: the day's danger, as big and plain as a road sign. */}
      <div
        className="relative overflow-hidden rounded-[28px] p-5"
        style={{ background: d.color, color: d.onColor }}
      >
        <p id="risk-title" className="text-[15px] font-medium opacity-90">
          Опасност от пожар днес
        </p>
        <p className="pt-1 font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em]">{d.label}</p>

        {/* Scale: where today sits among the six EFFIS classes. */}
        <div className="pt-4" role="img" aria-label={`Ниво ${d.index + 1} от 6 по скалата на EFFIS`}>
          <div className="flex gap-1">
            {DANGERS.map((c) => (
              <span
                key={c.key}
                className="h-2 flex-1 rounded-full"
                style={{ background: "currentColor", opacity: c.index === d.index ? 1 : c.index < d.index ? 0.45 : 0.18 }}
              />
            ))}
          </div>
          <div className="flex justify-between pt-1.5 text-[12px] font-medium opacity-85">
            <span>Ниска</span>
            <span>Изключителна</span>
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-4 text-[15px] font-medium tabular-nums">
          <li className="inline-flex items-center gap-1.5">
            <Thermometer size={17} strokeWidth={1.75} aria-hidden />
            {t.temp}°
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Droplets size={17} strokeWidth={1.75} aria-hidden />
            {t.rh}% влажност
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Wind size={17} strokeWidth={1.75} aria-hidden />
            {t.wind} км/ч
          </li>
          <li className="inline-flex items-center gap-1.5">
            <CloudRain size={17} strokeWidth={1.75} aria-hidden />
            {data.daysSinceRain === 0
              ? "вали днес"
              : data.daysSinceRain === 1
                ? "1 ден без дъжд"
                : `${data.daysSinceRain} дни без дъжд`}
          </li>
        </ul>
      </div>

      <div className="flex gap-3 px-1 pt-4">
        <ShieldAlert size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-content" aria-hidden />
        <p className="text-[16px] leading-snug">{d.advice}</p>
      </div>

      <p className="px-1 pt-3 text-[13px] leading-snug text-muted tabular-nums">
        Индекс FWI {fmt(t.fwi)} — същата канадска система, която използва EFFIS.
        {effis && <> Прогнозата на EFFIS за тази точка: {effis.label.toLowerCase()} ({fmt(data.effis!.fwi)}).</>}{" "}
        {offline ? <span className="font-medium text-ember">Без връзка — данни от {timeAgo(data.updated)}.</span> : <>Обновено {timeAgo(data.updated)}.</>}
      </p>
    </section>
  );
}

export function Forecast({ data }: { data: RiskResponse }) {
  return (
    <section aria-labelledby="fc-title" className="enter">
      <h2 id="fc-title" className="px-1 font-display text-[20px] font-semibold">
        Следващите дни
      </h2>
      <ol className="mt-3 grid grid-cols-5 gap-2">
        {data.forecast.map((f) => {
          const d = byKey(f.danger);
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
              <span className="sr-only">
                {weekday(f.date)}: {d.label} опасност, {f.temp} градуса
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
