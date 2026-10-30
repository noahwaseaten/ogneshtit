"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Radio, Search, X } from "lucide-react";
import { useJson } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { placeName } from "@shtit/core/i18n/names";
import { bandByKey, type CitiesResponse } from "@/lib/air-types";
import { BandChip } from "./Planner";

/** Lower case without accents, so "софия", "Sofia" and "sofiya" all find София. */
const norm = (s: string) => s.toLocaleLowerCase("bg").normalize("NFD").replace(/\p{M}/gu, "");

/**
 * The oblast centres from the dirtiest air to the cleanest, now: measured by the sensors in town when there are enough,
 * else the forecast, worked out exactly like the home screen. Each row has the city, a bar of its PM2.5 against the
 * dirtiest city, and the band as a word. `limit` shows the top few with a link to all; the full list has a search.
 */
export function CityRanking({ limit, highlight }: { limit?: number; highlight?: string }) {
  const { t, lang, nf, agoLong } = useI18n();
  const c = useJson<CitiesResponse>("/api/cities");
  const [q, setQ] = useState("");
  if (!c.data) return c.loading ? <div className="skeleton h-[320px] rounded-[20px]" /> : <p className="px-1 text-[15px] text-ember">{c.error}</p>;
  const pm = (x: CitiesResponse["cities"][number]) => x.now?.pm25 ?? 0;
  const sorted = [...c.data.cities].sort((a, b) => pm(b) - pm(a));
  const max = Math.max(...sorted.map(pm), 1);
  const ranked = sorted.map((city, i) => ({ city, rank: i + 1 }));
  const nq = norm(q.trim());
  const rows = limit ? ranked.slice(0, limit) : nq ? ranked.filter(({ city }) => norm(city.name).includes(nq) || norm(placeName(city.name, "en")).includes(nq)) : ranked;
  return (
    <div className="flex flex-col gap-3">
      {!limit && (
        <label className="relative block">
          <span className="sr-only">{t("Търси град", "Search for a city")}</span>
          <Search size={18} strokeWidth={2} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Търси град", "Search for a city")}
            className="min-h-12 w-full rounded-2xl border border-line bg-card pl-11 pr-12 text-[16px] outline-none placeholder:text-muted focus:border-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label={t("Изчисти", "Clear")} className="pressable absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted">
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          )}
        </label>
      )}
      {rows.length === 0 ? (
        <p className="rounded-[20px] bg-card px-4 py-5 text-center text-[15px] text-muted">{t("Няма такъв областен град.", "No oblast centre by that name.")}</p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
          {rows.map(({ city, rank }) => {
            const b = bandByKey(city.now?.band ?? "good");
            return (
              <li key={city.name} className={`flex min-h-14 items-center gap-3 px-4 py-2.5 ${highlight === city.name ? "bg-tonal" : ""}`}>
                <span className="w-6 shrink-0 text-right text-[14px] font-semibold tabular-nums text-muted">{rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[16px] font-semibold">{placeName(city.name, lang)}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[13px] tabular-nums text-muted">
                      {city.sensors > 0 && <Radio size={13} strokeWidth={2} aria-label={t("измерено", "measured")} />}
                      {nf(pm(city))} µg/m³
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="fill block h-full origin-left rounded-full" style={{ background: b.color, ["--p" as string]: Math.max(0.04, pm(city) / max) }} />
                  </span>
                </span>
                <BandChip band={b.key} size="sm" />
              </li>
            );
          })}
        </ol>
      )}
      <p className="flex items-start gap-1.5 px-1 text-[13px] leading-snug text-muted">
        {c.data.backupFrom ? (
          t(`Прогнозата не отговаря; копие от ${agoLong(c.data.backupFrom)}.`, `The forecast isn't answering; copy from ${agoLong(c.data.backupFrom)}.`)
        ) : (
          <>
            <Radio size={13} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
            {t(
              `Фини прахови частици сега. Със знака: измерено от датчиците в града; без него: прогноза CAMS. Обновено ${agoLong(c.data.updated)}.`,
              `Fine particles now. With the mark: measured by sensors in town; without: CAMS forecast. Updated ${agoLong(c.data.updated)}.`,
            )}
          </>
        )}
      </p>
      {limit && (
        <Link href="/gradove" className="pressable inline-flex min-h-11 items-center gap-1.5 self-start rounded-full bg-tonal px-4 text-[15px] font-semibold">
          {t("Всички градове", "All cities")}
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Link>
      )}
    </div>
  );
}
