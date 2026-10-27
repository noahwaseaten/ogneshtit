"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Minus, Plus, Maximize } from "lucide-react";
import { MAP_H, MAP_W, OBLASTS, UNITS_PER_KM, project } from "@/data/oblasts";
import { PLACES } from "@/data/places";

// A plain SVG map of Bulgaria's 28 oblasts. No tiles and no map library: it draws instantly,
// works offline, and keeps attention on the data. With `zoomable`, it pans and zooms by drag,
// pinch, wheel and the +/− buttons; markers keep their on-screen size and clusters split apart.

export type MapPoint = { id: string; lat: number; lon: number; label: string; color?: string };

const MAJOR = new Set(["София", "Пловдив", "Варна", "Бургас", "Русе", "Плевен", "Стара Загора", "Благоевград"]);
const MAX_ZOOM = 12;

type VB = { x: number; y: number; w: number };
const FULL: VB = { x: 0, y: 0, w: MAP_W };
const ratio = MAP_H / MAP_W;

function clamp(v: VB): VB {
  const w = Math.min(MAP_W, Math.max(MAP_W / MAX_ZOOM, v.w));
  const h = w * ratio;
  return { w, x: Math.min(MAP_W - w, Math.max(0, v.x)), y: Math.min(MAP_H - h, Math.max(0, v.y)) };
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
  zoomable = false,
  className = "",
}: {
  ariaLabel: string;
  fill?: (code: string) => string;
  regionName?: (code: string) => string;
  selected?: string | null;
  onRegion?: (code: string) => void;
  points?: MapPoint[];
  onPoints?: (pts: MapPoint[]) => void;
  me?: { lat: number; lon: number; radiusKm?: number } | null;
  cities?: boolean;
  zoomable?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [px, setPx] = useState(600); // rendered width in CSS px
  const [vb, setVb] = useState<VB>(FULL);
  const upp = vb.w / px; // SVG units per CSS pixel at the current zoom
  const zoom = MAP_W / vb.w;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e.contentRect.width > 0 && setPx(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- pan and zoom -----------------------------------------------------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ vb: VB; moved: boolean; start?: { x: number; y: number }; dist?: number; mid?: { x: number; y: number } } | null>(null);
  const suppressClick = useRef(false);

  const toSvg = (cx: number, cy: number, v: VB) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: v.x + ((cx - r.left) / r.width) * v.w, y: v.y + ((cy - r.top) / r.height) * v.w * ratio };
  };
  const zoomAt = (factor: number, cx?: number, cy?: number) =>
    setVb((v) => {
      const r = ref.current!.getBoundingClientRect();
      const p = cx == null ? { x: v.x + v.w / 2, y: v.y + (v.w * ratio) / 2 } : toSvg(cx, cy!, v);
      const w = v.w / factor;
      const fx = cx == null ? 0.5 : (cx - r.left) / r.width;
      const fy = cy == null ? 0.5 : (cy! - r.top) / r.height;
      return clamp({ w, x: p.x - fx * w, y: p.y - fy * w * ratio });
    });

  useEffect(() => {
    const el = ref.current;
    if (!el || !zoomable) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
    // zoomAt only reads refs and setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomable]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!zoomable) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) gesture.current = { vb, moved: false, start: { x: e.clientX, y: e.clientY } };
    if (pts.length === 2) {
      const [a, b] = pts;
      gesture.current = { vb, moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!zoomable || !pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.entries()];
    const g = gesture.current;
    const r = ref.current!.getBoundingClientRect();
    const k = g.vb.w / r.width;
    if (pts.length === 1 && g.start) {
      const dx = e.clientX - g.start.x;
      const dy = e.clientY - g.start.y;
      if (!g.moved && Math.hypot(dx, dy) < 6) return;
      if (!g.moved) {
        g.moved = true;
        ref.current!.setPointerCapture(e.pointerId);
      }
      setVb(clamp({ ...g.vb, x: g.vb.x - dx * k, y: g.vb.y - dy * k }));
    } else if (pts.length === 2 && g.dist && g.mid) {
      const other = pts.find(([id]) => id !== e.pointerId)![1];
      const dist = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const mid = { x: (e.clientX + other.x) / 2, y: (e.clientY + other.y) / 2 };
      const w = g.vb.w * (g.dist / dist);
      const anchor = { x: g.vb.x + ((g.mid.x - r.left) / r.width) * g.vb.w, y: g.vb.y + ((g.mid.y - r.top) / r.height) * g.vb.w * ratio };
      setVb(clamp({ w, x: anchor.x - ((mid.x - r.left) / r.width) * w, y: anchor.y - ((mid.y - r.top) / r.height) * w * ratio }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!zoomable) return;
    pointers.current.delete(e.pointerId);
    if (gesture.current?.moved) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
    }
    const left = [...pointers.current.values()];
    // After a pinch, the remaining finger continues as a drag from where it is now.
    gesture.current = left.length === 1 ? { vb, moved: true, start: left[0] } : null;
  };
  const guard = (fn: () => void) => () => {
    if (!suppressClick.current) fn();
  };

  // --- clustering in screen space -----------------------------------------------------------
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

  const towns = useMemo(
    () => PLACES.filter((p) => zoom >= 2.2 || MAJOR.has(p.name)).map((p) => ({ name: p.name, xy: project(p.lat, p.lon) })),
    [zoom],
  );

  const meXY = me ? project(me.lat, me.lon) : null;
  const sel = selected ? OBLASTS.find((o) => o.code === selected) : null;
  const fontPx = 12 * upp;

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={ref}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.w * ratio}`}
        role="group"
        aria-label={ariaLabel}
        className={`block h-auto w-full select-none ${zoomable ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
        style={{ WebkitTapHighlightColor: "transparent" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
                      onClick: guard(() => onRegion(o.code)),
                      onKeyDown: onKey(() => onRegion(o.code)),
                    }
                  : { "aria-hidden": true })}
              />
            );
          })}
        </g>

        {sel && (
          <path d={sel.d} fillRule="evenodd" fill="none" stroke="var(--content)" strokeWidth={2.5 * upp} strokeLinejoin="round" pointerEvents="none" />
        )}

        {cities && (
          <g aria-hidden pointerEvents="none">
            {towns.map(({ name, xy: [x, y] }) => (
              <g key={name}>
                <circle cx={x} cy={y} r={2.5 * upp} fill={fill ? "#16201a" : "var(--muted)"} />
                {/* On coloured regions labels are dark on a light halo, so they read on every fill. */}
                <text
                  x={x}
                  y={y - 6 * upp}
                  textAnchor="middle"
                  fontSize={fontPx}
                  fontWeight={500}
                  fill={fill ? "#16201a" : "var(--muted)"}
                  stroke={fill ? "rgba(255,255,255,0.8)" : "var(--surface)"}
                  strokeWidth={3 * upp}
                  strokeLinejoin="round"
                  style={{ paintOrder: "stroke" }}
                >
                  {name}
                </text>
              </g>
            ))}
          </g>
        )}

        {meXY && (
          <g aria-hidden pointerEvents="none">
            {me?.radiusKm && (
              <circle
                cx={meXY[0]}
                cy={meXY[1]}
                r={me.radiusKm * UNITS_PER_KM}
                fill="none"
                stroke="#1f6fd1"
                strokeWidth={1.5 * upp}
                strokeDasharray={`${5 * upp} ${4 * upp}`}
              />
            )}
            <circle cx={meXY[0]} cy={meXY[1]} r={6.5 * upp} fill="#1f6fd1" stroke="#fff" strokeWidth={2 * upp} />
          </g>
        )}

        <g>
          {clusters.map((c) => {
            const n = c.pts.length;
            const r = (n > 1 ? 10 + Math.min(5, Math.log2(n) * 1.6) : 5.5) * upp;
            const label = n === 1 ? c.pts[0].label : `${n} огнища на едно място. Покажи ги`;
            return (
              <g
                key={c.pts[0].id}
                role="button"
                tabIndex={0}
                aria-label={label}
                className="cursor-pointer outline-none"
                onClick={guard(() => onPoints?.(c.pts))}
                onKeyDown={onKey(() => onPoints?.(c.pts))}
              >
                <circle cx={c.x} cy={c.y} r={22 * upp} fill="transparent" />
                <circle cx={c.x} cy={c.y} r={r} fill={c.pts[0].color ?? "var(--ember)"} stroke="var(--card)" strokeWidth={1.5 * upp} pointerEvents="none" />
                {n > 1 && (
                  <text x={c.x} y={c.y} dy="0.35em" textAnchor="middle" fontSize={fontPx} fontWeight={600} fill="#fff" pointerEvents="none" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {n}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {zoomable && (
        <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-xl border border-line bg-card shadow-[var(--shadow)]">
          <button onClick={() => zoomAt(1.6)} disabled={zoom >= MAX_ZOOM} aria-label="Приближи" className="grid size-11 place-items-center disabled:opacity-40 hover:bg-line/50">
            <Plus size={18} strokeWidth={2} aria-hidden />
          </button>
          <button onClick={() => zoomAt(1 / 1.6)} disabled={zoom <= 1} aria-label="Отдалечи" className="grid size-11 place-items-center border-t border-line disabled:opacity-40 hover:bg-line/50">
            <Minus size={18} strokeWidth={2} aria-hidden />
          </button>
          {zoom > 1.01 && (
            <button onClick={() => setVb(FULL)} aria-label="Цяла България" className="grid size-11 place-items-center border-t border-line hover:bg-line/50">
              <Maximize size={16} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
