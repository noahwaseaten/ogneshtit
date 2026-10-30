"use client";

import { RotateCw } from "lucide-react";
import { Sheet } from "@shtit/core/ui/Sheet";
import { useJson } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { GAUGES } from "@/data/gauges";
import { BASINS, LEVELS, levelByKey, levelText, type RiverForecast } from "@/lib/flood-types";
import { Hydrograph } from "./Hydrograph";
import { LevelChip, gaugeName, useFlow } from "./bits";

/** A river point in full: chart, what the levels mean in m³/s for this river, and its biggest floods since 1984. */
export function RiverSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const g = id ? GAUGES.find((x) => x.id === id) : null;
  return (
    <Sheet
      open={!!g}
      onClose={onClose}
      title={g ? gaugeName(g, lang) : ""}
      description={g ? t(`${BASINS[g.basin].bg}. Прогноза на GloFAS за 15 дни.`, `${BASINS[g.basin].en}. GloFAS 15-day forecast.`) : undefined}
    >
      {g && <RiverDetails id={g.id} />}
    </Sheet>
  );
}

function RiverDetails({ id }: { id: string }) {
  const { t, lang, nf, time, agoLong, inPlace, weekday } = useI18n();
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {d0 && <LevelChip level={d0.level} />}
        <span className="text-[15px] tabular-nums">
          {t("Днес около", "Today about")} <span className="font-semibold">{flow(d0?.median ?? 0)} m³/s</span>
        </span>
      </div>
      {peak.index > levelByKey(d0?.level ?? "low").index && (
        <p className="text-[15px] leading-snug">
          {t(
            `Може да стигне ${levelText(peak, "bg").label.toLowerCase()} опасност ${when(f.peak.date)}.`,
            `May reach ${levelText(peak, "en").label.toLowerCase()} danger ${when(f.peak.date)}.`,
          )}
        </p>
      )}

      <Hydrograph f={f} />

      <section aria-labelledby="thr-title" className="flex flex-col gap-2">
        <h3 id="thr-title" className="text-[16px] font-semibold">
          {t("Какво значат нивата тук", "What the levels mean here")}
        </h3>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface text-[14px] tabular-nums">
          <li className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span>{t("Обичайно за месеца", "Usual for the month")}</span>
            <span className="font-medium">{flow(g.normal[month])} m³/s</span>
          </li>
          {LEVELS.slice(1).map((l) => {
            const q = l.key === "moderate" ? g.high[month] : l.key === "high" ? g.q2 : l.key === "veryhigh" ? g.q5 : g.q20;
            return (
              <li key={l.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <LevelChip level={l.key} size="sm" />
                  <span className="text-[13px] leading-tight text-muted">
                    {l.key === "moderate"
                      ? t("над 9 от 10 дни в месеца", "above 9 in 10 days of the month")
                      : l.key === "high"
                        ? t("веднъж на 2 години", "once in 2 years")
                        : l.key === "veryhigh"
                          ? t("веднъж на 5 години", "once in 5 years")
                          : t("веднъж на 20 години", "once in 20 years")}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap font-medium">
                  {t("от", "from")} {flow(q)} m³/s
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-[13px] leading-snug text-muted">
          {t(
            `Ден стига ниво, когато поне 3 от 10 прогнози на GloFAS минат прага. Праговете са от най-високата вода на всяка година, ${g.years.replace("-", " до ")}.`,
            `A day reaches a level when at least 3 in 10 GloFAS runs pass the line. The lines come from the highest water of each year, ${g.years.replace("-", " to ")}.`,
          )}
        </p>
      </section>

      <section aria-labelledby="rec-title" className="flex flex-col gap-2">
        <h3 id="rec-title" className="text-[16px] font-semibold">
          {t(`Най-високата вода от ${year(g.years)} г.`, `Highest water since ${year(g.years)}`)}
        </h3>
        <ol className="flex flex-col gap-1.5 text-[14px] tabular-nums">
          {g.records.map((rec, i) => (
            <li key={rec.date} className="flex items-center justify-between gap-3">
              <span>
                <span className="mr-2 text-muted">{i + 1}.</span>
                {time(rec.date + "T12:00:00Z", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="font-medium">{flow(rec.q)} m³/s</span>
            </li>
          ))}
        </ol>
        <p className="text-[13px] leading-snug text-muted">
          {t(
            `Средно реката тук носи ${flow(g.mean)} m³/s. Стойностите са от модела GloFAS, не от водомерна станция, и се разминават с измерените.`,
            `On average the river carries ${flow(g.mean)} m³/s here. These are GloFAS model values, not gauge readings, and differ from measured ones.`,
          )}
        </p>
      </section>

      <p className="text-[13px] text-muted">
        {r.offline
          ? t(`Нямате връзка. Данни от ${agoLong(f.updated)}.`, `You're offline. Data from ${agoLong(f.updated)}.`)
          : f.backupFrom
            ? t(`GloFAS не отговаря. Запазено копие от ${agoLong(f.backupFrom)}.`, `GloFAS isn't answering. Saved copy from ${agoLong(f.backupFrom)}.`)
            : t(`Обновено ${agoLong(f.updated)}. Шанс за над 2-годишната вода днес: ${nf((d0?.above.q2 ?? 0) * 100)}%.`, `Updated ${agoLong(f.updated)}. Chance of passing the 2-year flow today: ${nf((d0?.above.q2 ?? 0) * 100)}%.`)}
      </p>
    </div>
  );
}
