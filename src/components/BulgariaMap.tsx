"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MAP_H, MAP_W, OBLASTS, UNITS_PER_KM, project } from "@/data/oblasts";

// A plain SVG map of Bulgaria's 28 oblasts. No tiles and no map library: it draws instantly,
// works offline, and keeps the person's attention on the data instead of on roads and labels.

export type MapPoint = { id: string; lat: number; lon: number; label: string };

const CITIES = [
  { name: "София", lat: 42.698, lon: 23.322 },
  { name: "Пловдив", lat: 42.142, lon: 24.749 },
  { name: "Варна", lat: 43.214, lon: 27.915 },
  { name: "Бургас", lat: 42.505, lon: 27.463 },
  { name: "Русе", lat: 43.836, lon: 25.965 },
  { name: "Плевен", lat: 43.417, lon: 24.607 },
  { name: "Ст. Загора", lat: 42.426, lon: 25.635 },
  { name: "Благоевград", lat: 42.021, lon: 23.094 },
];

/** SVG units per CSS pixel, so markers keep the same on-screen size at any width. */
function useUnitsPerPx() {
  const ref = useRef<SVGSVGElement>(null);
  const [upp, setUpp] = useState(MAP_W / 600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      if (w > 0) setUpp(MAP_W / w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, upp] as const;
}

const onKey = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

export function BulgariaMap({
  ariaLabel,
  fill,
  regionName,
  selected,
  onRegion,
  points,
  onPoints,
  me,
  cities = true,
}: {
  ariaLabel: string;
  fill?: (code: string) => string;
  regionName?: (code: string) => string; // accessible label for a tappable region
  selected?: string | null;
  onRegion?: (code: string) => void;
  points?: MapPoint[];
  onPoints?: (pts: MapPoint[]) => void;
  me?: { lat: number; lon: number; radiusKm?: number } | null;
  cities?: boolean;
}) {
  const [ref, upp] = useUnitsPerPx();

  // Group points that would overlap on screen into one marker with a count.
  const clusters = useMemo(() => {
    const cell = 26 * upp;
    const groups = new Map<string, { x: number; y: number; pts: MapPoint[] }>();
    for (const p of points ?? []) {
      const [x, y] = project(p.lat, p.lon);
      const key = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
      const g = groups.get(key);
      if (g) {
        g.x = (g.x * g.pts.length + x) / (g.pts.length + 1);
        g.y = (g.y * g.pts.length + y) / (g.pts.length + 1);
        g.pts.push(p);
      } else groups.set(key, { x, y, pts: [p] });
    }
    return [...groups.values()];
  }, [points, upp]);

  const meXY = me ? project(me.lat, me.lon) : null;
  const sel = selected ? OBLASTS.find((o) => o.code === selected) : null;
  const fontPx = 12 * upp;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      role="group"
      aria-label={ariaLabel}
      className="block h-auto w-full select-none"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <g>
        {OBLASTS.map((o) => {
          const interactive = !!onRegion;
          return (
            <path
              key={o.code}
              d={o.d}
              fillRule="evenodd"
              className={`region ${interactive ? "cursor-pointer outline-none hover:opacity-85 focus-visible:opacity-85" : ""}`}
              fill={fill ? fill(o.code) : "var(--land)"}
              stroke="var(--land-line)"
              strokeWidth={1 * upp}
              strokeLinejoin="round"
              {...(interactive
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": regionName ? regionName(o.code) : o.name,
                    "aria-pressed": selected === o.code,
                    onClick: () => onRegion(o.code),
                    onKeyDown: onKey(() => onRegion(o.code)),
                  }
                : { "aria-hidden": true })}
            />
          );
        })}
      </g>

      {/* The selected oblast gets a strong outline drawn on top, so its whole border shows. */}
      {sel && (
        <path d={sel.d} fillRule="evenodd" fill="none" stroke="var(--content)" strokeWidth={2.5 * upp} strokeLinejoin="round" pointerEvents="none" />
      )}

      {cities && (
        <g aria-hidden pointerEvents="none">
          {CITIES.map((c) => {
            const [x, y] = project(c.lat, c.lon);
            return (
              <g key={c.name}>
                <circle cx={x} cy={y} r={2.5 * upp} fill="var(--muted)" />
                <text
                  x={x}
                  y={y - 6 * upp}
                  textAnchor="middle"
                  fontSize={fontPx}
                  fontWeight={500}
                  fill="var(--muted)"
                  stroke="var(--surface)"
                  strokeWidth={3 * upp}
                  paintOrder="stroke"
                >
                  {c.name}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {meXY && (
        <g aria-hidden pointerEvents="none">
          {me?.radiusKm && (
            <circle
              cx={meXY[0]}
              cy={meXY[1]}
              r={me.radiusKm * UNITS_PER_KM}
              fill="#1f6fd1"
              fillOpacity={0.06}
              stroke="#1f6fd1"
              strokeOpacity={0.7}
              strokeWidth={1.5 * upp}
              strokeDasharray={`${5 * upp} ${4 * upp}`}
            />
          )}
          <circle cx={meXY[0]} cy={meXY[1]} r={7 * upp} fill="#1f6fd1" stroke="#fff" strokeWidth={2.5 * upp} />
        </g>
      )}

      <g>
        {clusters.map((c) => {
          const n = c.pts.length;
          const r = (n > 1 ? 11 + Math.min(6, Math.log2(n) * 2) : 6) * upp;
          const label = n === 1 ? c.pts[0].label : `${n} огнища на едно място. Покажи ги`;
          return (
            <g
              key={c.pts[0].id}
              role="button"
              tabIndex={0}
              aria-label={label}
              className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-[var(--accent)]"
              onClick={() => onPoints?.(c.pts)}
              onKeyDown={onKey(() => onPoints?.(c.pts))}
            >
              {/* Invisible 44 px hit area around every marker. */}
              <circle cx={c.x} cy={c.y} r={22 * upp} fill="transparent" />
              <circle cx={c.x} cy={c.y} r={r + 5 * upp} fill="var(--ember)" fillOpacity={0.18} pointerEvents="none" />
              <circle cx={c.x} cy={c.y} r={r} fill="var(--ember)" stroke="#fff" strokeWidth={1.75 * upp} pointerEvents="none" />
              {n > 1 && (
                <text
                  x={c.x}
                  y={c.y}
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize={fontPx}
                  fontWeight={700}
                  fill="#fff"
                  pointerEvents="none"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {n}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
