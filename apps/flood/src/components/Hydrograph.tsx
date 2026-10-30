"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@shtit/core/i18n/client";
import { levelByKey, levelText, type RiverForecast } from "@/lib/flood-types";
import { useFlow } from "./bits";

// The river over 45 days: what GloFAS saw for the past 30 (solid line) and the next 15 as the spread of its 51 runs
// (median dashed; half the runs inside the darker band, all of them inside the light one). Horizontal lines mark the
// flows expected once in 2, 5 and 20 years, labelled in text colour with a tick in the level's colour.

// Drawn at the width it is shown at, so labels stay 11 px on a phone and on a desktop.
const H = 220;
const PAD = { l: 8, r: 8, t: 14, b: 26 };

export function Hydrograph({ f }: { f: RiverForecast }) {
  const { t, lang, time } = useI18n();
  const flow = useFlow();
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e.contentRect.width > 0 && setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pts = useMemo(() => {
    const past = f.past.slice(-30).map((p) => ({ date: p.date, q: p.q, lo: p.q, hi: p.q, min: p.q, max: p.q, future: false }));
    const fut = f.days.map((d) => ({ date: d.date, q: d.median, lo: d.p25, hi: d.p75, min: d.min, max: d.max, future: true }));
    return [...past, ...fut];
  }, [f]);

  if (pts.length < 2) return null;
  const top = Math.max(...pts.map((p) => p.max));
  // Show a threshold line only when it is within reach of the data, so a calm river does not shrink to a flat line.
  const lines = [
    { key: "high", q: f.thresholds.q2, years: 2 },
    { key: "veryhigh", q: f.thresholds.q5, years: 5 },
    { key: "extreme", q: f.thresholds.q20, years: 20 },
  ].filter((l) => l.q <= top * 1.6);
  const yMax = Math.max(top, ...lines.map((l) => l.q)) * 1.08 || 1;
  const x = (i: number) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r);
  const y = (q: number) => PAD.t + (1 - q / yMax) * (H - PAD.t - PAD.b);
  const firstFuture = pts.findIndex((p) => p.future);
  const path = (sel: (p: (typeof pts)[number]) => number, from = 0, to = pts.length) =>
    pts
      .slice(from, to)
      .map((p, i) => `${i ? "L" : "M"}${x(i + from).toFixed(1)} ${y(sel(p)).toFixed(1)}`)
      .join("");
  const band = (lo: (p: (typeof pts)[number]) => number, hi: (p: (typeof pts)[number]) => number) => {
    const s = Math.max(firstFuture - 1, 0);
    const upper = pts.slice(s).map((p, i) => `${i ? "L" : "M"}${x(i + s).toFixed(1)} ${y(hi(p)).toFixed(1)}`).join("");
    const lower = pts
      .slice(s)
      .map((p, i) => [i + s, lo(p)] as const)
      .reverse()
      .map(([i, v]) => `L${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join("");
    return `${upper}${lower}Z`;
  };
  const day = (d: string, long = false) => time(d + "T12:00:00Z", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
  // Until the chart is touched the readout shows the forecast's highest day, so there is always a number to read.
  const peakAt = pts.reduce((m, p, i) => (p.future && p.q > pts[m].q ? i : m), Math.max(firstFuture, 0));
  const sel = hover ?? peakAt;
  const h = pts[sel];
  const peak = f.days.reduce((m, d) => (d.median > m.median ? d : m), f.days[0]);

  return (
    <figure className="flex flex-col gap-2">
      <p className="flex min-h-[1lh] flex-wrap items-baseline gap-x-2 text-[14px] leading-snug tabular-nums" aria-live="polite">
        <span className="font-semibold">
          {hover == null && <span className="text-muted">{t("Най-много ", "Peak ")}</span>}
          {sel === firstFuture ? t("днес", "today") : day(h.date, true)}
        </span>
        <span>
          {flow(h.q)} m³/s
          {h.future && h.hi > h.lo && <span className="text-muted">{` · ${flow(h.lo)} ${t("до", "to")} ${flow(h.hi)}`}</span>}
        </span>
      </p>
      <div ref={box}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block touch-pan-y select-none"
        role="img"
        aria-label={t(
          `Водно количество за последните 30 дни и прогноза за 15 дни. Сега около ${flow(f.days[0]?.median ?? 0)} m³/s, най-много около ${flow(peak?.median ?? 0)} m³/s на ${day(peak?.date ?? "")}.`,
          `River flow for the past 30 days and a 15-day forecast. Now about ${flow(f.days[0]?.median ?? 0)} m³/s, highest about ${flow(peak?.median ?? 0)} m³/s on ${day(peak?.date ?? "")}.`,
        )}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(pts.length - 1, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (pts.length - 1)))));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {/* recessive baseline */}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="var(--line)" strokeWidth={1} />
        {lines.map((l) => {
          const lv = levelByKey(l.key);
          return (
            <g key={l.key}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(l.q)} y2={y(l.q)} stroke="var(--muted)" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 4" />
              <rect x={PAD.l} y={y(l.q) - 9} width={4} height={8} rx={1} fill={lv.color} />
              <text x={PAD.l + 8} y={y(l.q) - 3} fontSize={11} fill="var(--muted)">
                {t(`веднъж на ${l.years} г.`, `once in ${l.years} yrs`)} · {levelText(lv, lang).label.toLowerCase()}
              </text>
            </g>
          );
        })}
        {firstFuture > 0 && (
          <>
            <path d={band((p) => p.min, (p) => p.max)} fill="var(--accent)" fillOpacity={0.1} />
            <path d={band((p) => p.lo, (p) => p.hi)} fill="var(--accent)" fillOpacity={0.2} />
            <line x1={x(firstFuture)} x2={x(firstFuture)} y1={PAD.t} y2={H - PAD.b} stroke="var(--content)" strokeOpacity={0.35} strokeWidth={1} />
            <text x={x(firstFuture) + 4} y={PAD.t + 8} fontSize={11} fontWeight={600} fill="var(--content)">
              {t("днес", "today")}
            </text>
          </>
        )}
        <path d={path((p) => p.q, 0, Math.max(firstFuture, 1))} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={path((p) => p.q, Math.max(firstFuture - 1, 0))} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover!)} x2={x(hover!)} y1={PAD.t} y2={H - PAD.b} stroke="var(--content)" strokeOpacity={0.5} strokeWidth={1} />
            <circle cx={x(hover!)} cy={y(h.q)} r={5} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
        <text x={PAD.l} y={H - 8} fontSize={11} fill="var(--muted)">
          {day(pts[0].date)}
        </text>
        <text x={W - PAD.r} y={H - 8} fontSize={11} fill="var(--muted)" textAnchor="end">
          {day(pts[pts.length - 1].date)}
        </text>
      </svg>
      </div>
      <figcaption className="flex gap-x-4 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-accent" aria-hidden />
          {t("досега", "so far")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-accent" aria-hidden />
          {t("прогноза", "forecast")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-accent/25" aria-hidden />
          {t("вероятен обхват", "likely range")}
        </span>
      </figcaption>
    </figure>
  );
}
