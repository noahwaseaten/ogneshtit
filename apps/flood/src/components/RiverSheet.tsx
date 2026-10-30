"use client";

import { RotateCw, TrendingUp } from "lucide-react";
import { Sheet } from "@shtit/core/ui/Sheet";
import { useJson } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { GAUGES } from "@/data/gauges";
import { BASINS, LEVELS, levelByKey, levelText, type RiverForecast } from "@/lib/flood-types";
import { Hydrograph } from "./Hydrograph";
import { LevelChip, gaugeName, useFlow } from "./bits";

/** A river point in full: today's flow, the chart, where each level starts on this river and its biggest floods. */
export function RiverSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const g = id ? GAUGES.find((x) => x.id === id) : null;
  return (
    <Sheet
      open={!!g}
      onClose={onClose}
      title={g ? gaugeName(g, lang) : ""}
      description={g ? t(BASINS[g.basin].bg, BASINS[g.basin].en) : undefined}
    >
      {g && <RiverDetails id={g.id} />}
    </Sheet>
  );
}

function RiverDetails({ id }: { id: string }) {
  const { t, lang, time, agoLong, inPlace, weekday } = useI18n();
  const flow = useFlow();
  const g = GAUGES.find((x) => x.id === id)!;
  const r = useJson<RiverForecast & { backupFrom?: string }>(`/api/gauges/${id}`);

  if (!r.data)
    return r.loading ? (
      <div className="skeleton h-[320px] rounded-[20px]" aria-label={t("Зареждаме прогнозата", "Loading the forecast")} />
    ) : (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[15px] text-muted">{r.error}</p>
        <button onClick={r.retry} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content">
          <RotateCw size={18} strokeWidth={2} aria-hidden />
          {t("Опитай пак", "Try again")}
        </button>
      </div>
    );

  const f = r.data;
  const d0 = f.days[0];
  const peak = levelByKey(f.peak.level);
  const month = Number((d0?.date ?? "2000-01").slice(5, 7)) - 1;
  const when = (date: string) => (date === d0?.date ? t("днес", "today") : lang === "bg" ? inPlace(weekday(date, "long")) : `on ${weekday(date, "long")}`);
  const year = (d: string) => d.slice(0, 4);
  const now = levelByKey(d0?.level ?? "low");
  // Each level and the flow where it starts here, highest first.
  const ladder = LEVELS.slice(1)
    .map((l) => ({
      key: l.key,
      q: l.key === "moderate" ? g.high[month] : l.key === "high" ? g.q2 : l.key === "veryhigh" ? g.q5 : g.q20,
      years: l.key === "high" ? 2 : l.key === "veryhigh" ? 5 : l.key === "extreme" ? 20 : null,
    }))
    .reverse();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div className="tabular-nums">
          <p className="text-[13px] font-medium text-muted">{t("Днес", "Today")}</p>
          <p className="font-display text-[34px] font-bold leading-none">
            {flow(d0?.median ?? 0)}
            <span className="pl-1.5 text-[16px] font-semibold text-muted">m³/s</span>
          </p>
        </div>
        {d0 && <LevelChip level={d0.level} />}
      </div>
      {peak.index > now.index && (
        <p className="-mt-2 flex items-center gap-2 text-[15px] font-medium leading-snug">
          <TrendingUp size={18} strokeWidth={2} className="shrink-0" aria-hidden />
          {t(`${levelText(peak, "bg").label} опасност ${when(f.peak.date)}`, `${levelText(peak, "en").label} danger ${when(f.peak.date)}`)}
        </p>
      )}

      <Hydrograph f={f} />

      <section aria-labelledby="thr-title" className="flex flex-col gap-2">
        <h3 id="thr-title" className="px-1 text-[15px] font-semibold text-muted">
          {t("Нивата на тази река, m³/s", "Levels on this river, m³/s")}
        </h3>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface text-[15px] tabular-nums">
          {ladder.map((l) => {
            const lv = levelByKey(l.key);
            return (
              <li key={l.key} className={`flex min-h-11 items-center gap-3 px-3.5 py-2 ${l.key === now.key ? "bg-tonal" : ""}`}>
                <span className="size-3 shrink-0 rounded-full" style={{ background: lv.color }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{levelText(lv, lang).label}</span>
                  {l.years && <span className="pl-1.5 text-[13px] text-muted">{t(`веднъж на ${l.years} г.`, `once in ${l.years} yrs`)}</span>}
                </span>
                <span className="shrink-0 whitespace-nowrap text-muted">
                  {t("от", "from")} <span className="font-semibold text-content">{flow(l.q)}</span>
                </span>
              </li>
            );
          })}
          <li className="flex min-h-11 items-center gap-3 px-3.5 py-2">
            <span className="size-3 shrink-0 rounded-full border-2 border-muted" aria-hidden />
            <span className="flex-1 font-medium">{t("Обичайно за месеца", "Usual for the month")}</span>
            <span className="shrink-0 whitespace-nowrap font-semibold">{flow(g.normal[month])}</span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="rec-title" className="flex flex-col gap-2">
        <h3 id="rec-title" className="px-1 text-[15px] font-semibold text-muted">
          {t(`Най-високата вода от ${year(g.years)} г.`, `Highest since ${year(g.years)}`)}
        </h3>
        <ol className="divide-y divide-line overflow-hidden rounded-2xl bg-surface text-[15px] tabular-nums">
          {g.records.slice(0, 3).map((rec) => (
            <li key={rec.date} className="flex min-h-11 items-center justify-between gap-3 px-3.5 py-2">
              <span>{time(rec.date + "T12:00:00Z", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="font-semibold">{flow(rec.q)} m³/s</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="px-1 text-[13px] leading-snug text-muted">
        {r.offline
          ? t(`Нямате връзка. Данни от ${agoLong(f.updated)}.`, `You're offline. Data from ${agoLong(f.updated)}.`)
          : f.backupFrom
            ? t(`GloFAS не отговаря. Запазено копие от ${agoLong(f.backupFrom)}.`, `GloFAS isn't answering. Saved copy from ${agoLong(f.backupFrom)}.`)
            : t(`Обновено ${agoLong(f.updated)}.`, `Updated ${agoLong(f.updated)}.`)}{" "}
        {t(
          "Стойностите са от модела GloFAS, не от водомер. Ден стига ниво, когато поне 3 от 10 прогнози минат прага.",
          "Values are from the GloFAS model, not a gauge. A day reaches a level when at least 3 in 10 runs pass the line.",
        )}
      </p>
    </div>
  );
}
