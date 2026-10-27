"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Minus, Plus, Maximize } from "lucide-react";
import { MAP_H, MAP_W, OBLASTS, UNITS_PER_KM, project } from "@/data/oblasts";
import { PLACES } from "@/data/places";

// A plain SVG map of Bulgaria's 28 oblasts. No tiles and no map library: it draws instantly and
// works offline. With `zoomable` it pans and zooms by drag, pinch, wheel, double tap and buttons.
//
// Performance: during a gesture the viewBox is written straight to the DOM (no React render);
// React only re-renders when the gesture ends, which is when markers are re-clustered.

export type MapPoint = { id: string; lat: number; lon: number; label: string };

const MAJOR = new Set(["София", "Пловдив", "Варна", "Бургас", "Русе", "Плевен", "Стара Загора", "Благоевград"]);
const MAX_ZOOM = 40;

type VB = { x: number; y: number; w: number };

/** Keep the view inside the country; centre it on an axis where the view is wider than the map. */
function clampVB(v: VB, r: number): VB {
  const wMax = Math.max(MAP_W, MAP_H / r);
  const w = Math.min(wMax, Math.max(MAP_W / MAX_ZOOM, v.w));
  const h = w * r;
  const x = w >= MAP_W ? (MAP_W - w) / 2 : Math.min(MAP_W - w, Math.max(0, v.x));
  const y = h >= MAP_H ? (MAP_H - h) / 2 : Math.min(MAP_H - h, Math.max(0, v.y));
  return { x, y, w };
}
const fullVB = (r: number) => clampVB({ x: 0, y: 0, w: Infinity }, r);

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
  /** Size the box with CSS (e.g. an aspect ratio); the map fits inside it. */
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 600, h: 600 * (MAP_H / MAP_W) });
  const r = size.h / size.w;
  const [vb, setVb] = useState<VB>(() => fullVB(MAP_H / MAP_W));
  const live = useRef(vb); // the view while a gesture is running
  const upp = vb.w / size.w; // SVG units per CSS pixel at the committed zoom
  const zoom = MAP_W / vb.w;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // When the box changes shape, keep the zoom but re-fit the view to the new proportions.
  const [lastR, setLastR] = useState(r);
  if (lastR !== r) {
    setLastR(r);
    setVb((v) => clampVB(v, r));
  }
  useEffect(() => {
    live.current = vb;
  }, [vb]);

  const paint = (v: VB) => {
    live.current = v;
    svg.current?.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.w * r}`);
  };
  const commit = useCallback(() => setVb({ ...live.current }), []);

  /** Zoom by `factor` keeping the point under (fx, fy) (0..1 of the box) fixed. */
  const zoomBy = (factor: number, fx = 0.5, fy = 0.5, from = live.current) => {
    const px = from.x + fx * from.w;
    const py = from.y + fy * from.w * r;
    const w = from.w / factor;
    return clampVB({ w, x: px - fx * w, y: py - fy * w * r }, r);
  };

  // --- gestures -----------------------------------------------------------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{ start: VB; sx: number; sy: number; moved: boolean; dist?: number; mx?: number; my?: number } | null>(null);
  const lastTap = useRef(0);
  const suppress = useRef(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !zoomable) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      paint(zoomBy(Math.exp(-e.deltaY * 0.002), (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height));
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(commit, 120);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
    // paint/zoomBy read refs and the current ratio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomable, r, commit]);

  const down = (e: React.PointerEvent) => {
    if (!zoomable) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) g.current = { start: live.current, sx: e.clientX, sy: e.clientY, moved: false };
    else if (pts.length === 2) {
      const [a, b] = pts;
      for (const id of pointers.current.keys()) box.current!.setPointerCapture(id);
      g.current = { start: live.current, sx: 0, sy: 0, moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
  };

  const move = (e: React.PointerEvent) => {
    const cur = g.current;
    if (!zoomable || !cur || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = box.current!.getBoundingClientRect();
    const k = cur.start.w / rect.width;
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      const dx = e.clientX - cur.sx;
      const dy = e.clientY - cur.sy;
      if (!cur.moved && Math.hypot(dx, dy) < 8) return;
      // Capture only once it is a drag, so plain taps still reach the regions and markers.
      if (!cur.moved) box.current!.setPointerCapture(e.pointerId);
      cur.moved = true;
      paint(clampVB({ ...cur.start, x: cur.start.x - dx * k, y: cur.start.y - dy * k }, r));
    } else if (pts.length >= 2 && cur.dist && cur.mx != null && cur.my != null) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // The map point that was under the fingers' midpoint stays under it.
      const ax = cur.start.x + ((cur.mx - rect.left) / rect.width) * cur.start.w;
      const ay = cur.start.y + ((cur.my - rect.top) / rect.height) * cur.start.w * r;
      const w = cur.start.w * (cur.dist / Math.max(1, dist));
      paint(clampVB({ w, x: ax - ((mx - rect.left) / rect.width) * w, y: ay - ((my - rect.top) / rect.height) * w * r }, r));
    }
  };

  const up = (e: React.PointerEvent) => {
    if (!zoomable || !pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const cur = g.current;
    const left = [...pointers.current.values()];
    if (cur?.moved) {
      suppress.current = true;
      setTimeout(() => (suppress.current = false), 0);
    } else if (e.type === "pointerup" && left.length === 0) {
      // Double tap zooms in where you tapped.
      const now = performance.now();
      if (now - lastTap.current < 300) {
        const rect = box.current!.getBoundingClientRect();
        paint(zoomBy(2, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height));
        lastTap.current = 0;
      } else lastTap.current = now;
    }
    // A finger left after a pinch carries on as a drag from where it is.
    g.current = left.length === 1 ? { start: live.current, sx: left[0].x, sy: left[0].y, moved: true } : null;
    if (left.length === 0) commit();
  };

  /** Runs a tap action unless the pointer was just used to drag or pinch. */
  const tap = (fn: () => void) => {
    if (!suppress.current) fn();
  };

  // --- markers ------------------------------------------------------------------------------
  const projected = useMemo(() => (points ?? []).map((p) => ({ p, xy: project(p.lat, p.lon) })), [points]);
  const clusters = useMemo(() => {
    const cell = 30 * upp;
    const groups = new Map<string, { x: number; y: number; pts: MapPoint[]; xs: number[]; ys: number[] }>();
    for (const { p, xy } of projected) {
      const key = `${Math.floor(xy[0] / cell)}:${Math.floor(xy[1] / cell)}`;
      const c = groups.get(key);
      if (c) {
        c.pts.push(p);
        c.xs.push(xy[0]);
        c.ys.push(xy[1]);
        c.x = c.xs.reduce((s, v) => s + v, 0) / c.xs.length;
        c.y = c.ys.reduce((s, v) => s + v, 0) / c.ys.length;
      } else groups.set(key, { x: xy[0], y: xy[1], pts: [p], xs: [xy[0]], ys: [xy[1]] });
    }
    return [...groups.values()];
  }, [projected, upp]);

  /** Tapping a group zooms to it; if it cannot get any closer, the group opens as a list. */
  const openCluster = (c: (typeof clusters)[number]) => {
    if (c.pts.length === 1 || !zoomable) return onPoints?.(c.pts);
    const minX = Math.min(...c.xs);
    const maxX = Math.max(...c.xs);
    const minY = Math.min(...c.ys);
    const maxY = Math.max(...c.ys);
    const span = Math.max(maxX - minX, (maxY - minY) / r, MAP_W / MAX_ZOOM);
    const w = span * 3;
    if (zoom >= MAX_ZOOM * 0.95 || w >= live.current.w * 0.9) return onPoints?.(c.pts);
    const next = clampVB({ w, x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - (w * r) / 2 }, r);
    paint(next);
    commit();
  };

  const towns = useMemo(
    () => PLACES.filter((p) => zoom >= 2.2 || MAJOR.has(p.name)).map((p) => ({ name: p.name, xy: project(p.lat, p.lon) })),
    [zoom],
  );

  const meXY = me ? project(me.lat, me.lon) : null;
  const sel = selected ? OBLASTS.find((o) => o.code === selected) : null;
  const fontPx = 12 * upp;
  const dark = !!fill; // coloured regions: dark labels on a light halo

  return (
    <div
      ref={box}
      className={`relative overflow-hidden ${zoomable ? "touch-none select-none" : ""} ${className}`}
      style={className.includes("aspect-") || className.includes("h-") ? undefined : { aspectRatio: `${MAP_W} / ${MAP_H}` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <svg
        ref={svg}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.w * r}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={ariaLabel}
        className="absolute inset-0 block size-full"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {OBLASTS.map((o) => {
          const interactive = !!onRegion;
          return (
            <path
              key={o.code}
              d={o.d}
              fillRule="evenodd"
              className={interactive ? "cursor-pointer outline-none hover:opacity-85 focus-visible:opacity-85" : undefined}
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
                    onClick: () => tap(() => onRegion(o.code)),
                    onKeyDown: onKey(() => onRegion(o.code)),
                  }
                : { "aria-hidden": true })}
            />
          );
        })}

        {sel && <path d={sel.d} fillRule="evenodd" fill="none" stroke="var(--content)" strokeWidth={2.5 * upp} strokeLinejoin="round" pointerEvents="none" />}

        {cities && (
          <g aria-hidden pointerEvents="none">
            {towns.map(({ name, xy: [x, y] }) => (
              <g key={name}>
                <circle cx={x} cy={y} r={2.5 * upp} fill={dark ? "#16201a" : "var(--muted)"} />
                <text
                  x={x}
                  y={y - 6 * upp}
                  textAnchor="middle"
                  fontSize={fontPx}
                  fontWeight={500}
                  fill={dark ? "#16201a" : "var(--muted)"}
                  stroke={dark ? "rgba(255,255,255,0.8)" : "var(--surface)"}
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
              <circle cx={meXY[0]} cy={meXY[1]} r={me.radiusKm * UNITS_PER_KM} fill="none" stroke="#1f6fd1" strokeWidth={1.5 * upp} strokeDasharray={`${5 * upp} ${4 * upp}`} />
            )}
            <circle cx={meXY[0]} cy={meXY[1]} r={6.5 * upp} fill="#1f6fd1" stroke="#fff" strokeWidth={2 * upp} />
          </g>
        )}

        {/* Handlers below read refs only when tapped, never while rendering. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {clusters.map((c) => {
          const n = c.pts.length;
          // At the closest zoom a group that still overlaps fans out so each fire can be tapped.
          if (n > 1 && zoomable && zoom >= MAX_ZOOM * 0.95) {
            const ring = 16 * upp;
            return (
              <g key={c.pts[0].id}>
                {c.pts.map((p, i) => {
                  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
                  const x = c.x + Math.cos(a) * ring;
                  const y = c.y + Math.sin(a) * ring;
                  return (
                    <g key={p.id} role="button" tabIndex={0} aria-label={p.label} className="cursor-pointer outline-none" onClick={() => tap(() => onPoints?.([p]))} onKeyDown={onKey(() => onPoints?.([p]))}>
                      <line x1={c.x} y1={c.y} x2={x} y2={y} stroke="var(--muted)" strokeWidth={1 * upp} />
                      <circle cx={x} cy={y} r={14 * upp} fill="transparent" />
                      <circle cx={x} cy={y} r={5.5 * upp} fill="var(--ember)" stroke="var(--card)" strokeWidth={1.5 * upp} />
                    </g>
                  );
                })}
              </g>
            );
          }
          const rad = (n > 1 ? 10 + Math.min(5, Math.log2(n) * 1.6) : 5.5) * upp;
          return (
            <g
              key={c.pts[0].id}
              role="button"
              tabIndex={0}
              aria-label={n === 1 ? c.pts[0].label : `${n} огнища едно до друго`}
              className="cursor-pointer outline-none"
              onClick={() => tap(() => openCluster(c))}
              onKeyDown={onKey(() => openCluster(c))}
            >
              <circle cx={c.x} cy={c.y} r={22 * upp} fill="transparent" />
              <circle cx={c.x} cy={c.y} r={rad} fill="var(--ember)" stroke="var(--card)" strokeWidth={1.5 * upp} pointerEvents="none" />
              {n > 1 && (
                <text x={c.x} y={c.y} dy="0.35em" textAnchor="middle" fontSize={fontPx} fontWeight={600} fill="#fff" pointerEvents="none" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {n}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {zoomable && (
        <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl bg-card/95 ring-1 ring-line backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => (paint(zoomBy(2)), commit())}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Приближи"
            className="grid size-11 place-items-center active:bg-line disabled:opacity-35"
          >
            <Plus size={20} strokeWidth={2} aria-hidden />
          </button>
          <button
            onClick={() => (paint(zoomBy(0.5)), commit())}
            disabled={zoom <= 1.01}
            aria-label="Отдалечи"
            className="grid size-11 place-items-center border-t border-line active:bg-line disabled:opacity-35"
          >
            <Minus size={20} strokeWidth={2} aria-hidden />
          </button>
          <button
            onClick={() => (paint(fullVB(r)), commit())}
            disabled={zoom <= 1.01}
            aria-label="Цяла България"
            className="grid size-11 place-items-center border-t border-line active:bg-line disabled:opacity-35"
          >
            <Maximize size={17} strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
