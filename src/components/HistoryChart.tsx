"use client";

import { useState } from "react";
import { HISTORY, HISTORY_SOURCE } from "@/data/history";

const nf = (n: number) => Math.round(n).toLocaleString("bg-BG");
const avg = HISTORY.reduce((s, r) => s + r.ha, 0) / HISTORY.length;

export function HistoryChart() {
  const [sel, setSel] = useState(HISTORY.length - 1);
  const max = Math.max(...HISTORY.map((r) => r.ha));
  const r = HISTORY[sel];
  const ratio = r.ha / avg;

  return (
    <section aria-labelledby="hist-title" className="enter">
      <h2 id="hist-title" className="px-1 font-display text-[20px] font-semibold">
        Колко гора изгаря всяка година
      </h2>

      <div className="mt-3 rounded-[20px] bg-card p-4 shadow-[var(--shadow)]">
        <div className="flex items-baseline justify-between gap-3 tabular-nums">
          <p>
            <span className="font-display text-[28px] font-bold">{nf(r.ha)}</span>{" "}
            <span className="text-[15px] text-muted">ха през {r.year}</span>
          </p>
          <p className="text-right text-[14px] text-muted">{nf(r.fires)} пожара</p>
        </div>
        <p className="pt-0.5 text-[14px] tabular-nums text-muted">
          {ratio >= 1.15
            ? `${ratio.toLocaleString("bg-BG", { maximumFractionDigits: 1 })} пъти над средното за 2010–2024`
            : ratio <= 0.85
              ? "под средното за 2010–2024"
              : "около средното за 2010–2024"}
        </p>

        {/* Each bar is a button: tap to read the year. Line marks the 15-year average. */}
        <div className="relative mt-4 flex h-[120px] items-end gap-[3px]" role="group" aria-label="Изгоряла горска площ по години">
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted/60"
            style={{ bottom: `${(avg / max) * 100}%` }}
            aria-hidden
          />
          {HISTORY.map((row, i) => (
            <button
              key={row.year}
              onClick={() => setSel(i)}
              aria-pressed={i === sel}
              aria-label={`${row.year}: ${nf(row.ha)} хектара, ${row.fires} пожара`}
              className="group relative flex h-full flex-1 items-end"
            >
              <span
                className="w-full rounded-t-[4px] transition-colors duration-150"
                style={{
                  height: `${Math.max(2, (row.ha / max) * 100)}%`,
                  background: i === sel ? "var(--ember)" : "var(--muted)",
                  opacity: i === sel ? 1 : 0.35,
                }}
              />
            </button>
          ))}
        </div>
        <div className="flex justify-between pt-1.5 text-[12px] tabular-nums text-muted" aria-hidden>
          <span>{HISTORY[0].year}</span>
          <span>{HISTORY[HISTORY.length - 1].year}</span>
        </div>
      </div>
      <p className="px-1 pt-2 text-[13px] leading-snug text-muted">
        Засегнати горски територии. Източник: {HISTORY_SOURCE}. Пунктираната линия е средното.
      </p>
    </section>
  );
}
