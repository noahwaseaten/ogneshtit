"use client";

import { ChevronRight } from "lucide-react";
import { useI18n } from "@shtit/core/i18n/client";
import { GAUGES } from "@/data/gauges";
import { levelByKey, levelText, type GaugeStatus } from "@/lib/flood-types";
import { LevelChip, Trend, gaugeName, useFlow } from "./bits";

/** One river point in a list: name, today's level, flow against normal, trend, and the 15-day peak when higher. */
export function RiverRow({ s, km, onClick, inSheet = false }: { s: GaugeStatus; km?: number; onClick: () => void; inSheet?: boolean }) {
  const { t, lang, nf, weekday, inPlace } = useI18n();
  const flow = useFlow();
  const g = GAUGES.find((x) => x.id === s.id);
  if (!g) return null;
  const peak = levelByKey(s.peak.level);
  const higher = peak.index > levelByKey(s.level).index;
  return (
    <button onClick={onClick} className={`hover-fill flex min-h-16 w-full items-center gap-3 py-3 text-left ${inSheet ? "-mx-3 w-[calc(100%+24px)] rounded-xl px-3" : "px-4"}`}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[16px] font-semibold">{gaugeName(g, lang)}</span>
          {km != null && <span className="shrink-0 text-[13px] tabular-nums text-muted">{t(`${nf(km)} км`, `${nf(km)} km`)}</span>}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 pt-0.5 text-[14px] tabular-nums text-muted">
          <span>{flow(s.q)} m³/s</span>
          <span aria-hidden>·</span>
          <Trend trend={s.trend} />
          {higher && (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-content">
                {t(`${levelText(peak, "bg").label.toLowerCase()} ${inPlace(weekday(s.peak.date, "long"))}`, `${levelText(peak, "en").label.toLowerCase()} on ${weekday(s.peak.date, "long")}`)}
              </span>
            </>
          )}
        </span>
      </span>
      <LevelChip level={s.level} size="sm" />
      <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
    </button>
  );
}
