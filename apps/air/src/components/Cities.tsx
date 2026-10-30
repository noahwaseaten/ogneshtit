"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useJson } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { placeName } from "@shtit/core/i18n/names";
import { bandByKey, type CitiesResponse } from "@/lib/air-types";
import { BandChip } from "./Planner";

/**
 * The oblast centres from the dirtiest air to the cleanest, for today's daytime (CAMS). Each row has the city, the bar of
 * its worst PM2.5 today against the dirtiest city, and the band as a word. `limit` shows the top few with a link to all.
 */
export function CityRanking({ limit, highlight }: { limit?: number; highlight?: string }) {
  const { t, lang, nf, agoLong } = useI18n();
  const c = useJson<CitiesResponse>("/api/cities");
  if (!c.data) return c.loading ? <div className="skeleton h-[320px] rounded-[20px]" /> : <p className="px-1 text-[15px] text-ember">{c.error}</p>;
  const sorted = [...c.data.cities].sort((a, b) => b.dayPm25 - a.dayPm25);
  const rows = limit ? sorted.slice(0, limit) : sorted;
  const max = Math.max(...sorted.map((x) => x.dayPm25), 1);
  return (
    <div className="flex flex-col gap-2">
      <ol className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
        {rows.map((city, i) => {
          const b = bandByKey(city.dayMax);
          return (
            <li key={city.name} className={`flex min-h-14 items-center gap-3 px-4 py-2.5 ${highlight === city.name ? "bg-tonal" : ""}`}>
              <span className="w-6 shrink-0 text-right text-[14px] font-semibold tabular-nums text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[16px] font-semibold">{placeName(city.name, lang)}</span>
                  <span className="shrink-0 text-[13px] tabular-nums text-muted">
                    {t(`до ${nf(city.dayPm25)} µg/m³`, `up to ${nf(city.dayPm25)} µg/m³`)}
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden>
                  <span className="fill block h-full origin-left rounded-full" style={{ background: b.color, ["--p" as string]: Math.max(0.04, city.dayPm25 / max) }} />
                </span>
              </span>
              <BandChip band={city.dayMax} size="sm" />
            </li>
          );
        })}
      </ol>
      <p className="px-1 text-[13px] text-muted">
        {c.data.backupFrom
          ? t(`Прогнозата не отговаря; копие от ${agoLong(c.data.backupFrom)}.`, `The forecast isn't answering; copy from ${agoLong(c.data.backupFrom)}.`)
          : t(`Най-лошото през деня днес, по прогнозата на CAMS. Обновено ${agoLong(c.data.updated)}.`, `Worst in daytime today, from the CAMS forecast. Updated ${agoLong(c.data.updated)}.`)}
      </p>
      {limit && (
        <Link href="/gradove" className="inline-flex min-h-11 items-center gap-1 self-start px-1 text-[15px] font-medium text-accent">
          {t("Всички градове", "All cities")}
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Link>
      )}
    </div>
  );
}
