"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Minus, Plus, Maximize, LocateFixed } from "lucide-react";
import { MAP_H, MAP_W, OBLASTS, UNITS_PER_KM, project } from "@/data/oblasts";
import { PLACES } from "@/data/places";
import { useI18n } from "@/i18n/client";
import { placeName } from "@/i18n/names";

// A plain SVG map of Bulgaria's 28 oblasts. No tiles and no map library: it draws instantly and
// works offline. With `zoomable` it pans and zooms by drag, pinch, wheel, double tap and buttons.
//
// Performance: during a gesture the viewBox is written straight to the DOM (no React render);
// React only re-renders when the gesture ends, which is when markers are re-clustered.

/** `color` and `rank` let points say how fresh they are; a group takes the colour of its lowest rank. */
export type MapPoint = { id: string; lat: number; lon: number; label: string; color?: string; rank?: number; faded?: boolean };
/** Floating map control surface. */
const ctl = "bg-card shadow-[0_1px_4px_rgb(0_0_0/0.25)] transition-colors duration-150";

const lead = (pts: MapPoint[]) => [...pts].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))[0];
const pointColor = (pts: MapPoint[]) => lead(pts)?.color ?? "var(--ember)";
const pointOpacity = (pts: MapPoint[]) => (pts.every((p) => p.faded) ? 0.55 : 1);

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
  const { t, lang } = useI18n();
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

  // The viewBox is written to the DOM at once; React re-renders at most once per frame so markers
  // and town names follow the zoom live without re-rendering on every pointer event.
  const frame = useRef<number | null>(null);
  const paint = (v: VB) => {
    if (frame.current == null)
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setVb({ ...live.current });
      });
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

  // --- gestures (modelled on Google Maps on phones) -------------------------------------------
  // one finger drag pans and flings · pinch zooms around the fingers · double tap zooms in ·
  // two-finger tap zooms out · double tap and drag up/down zooms with one thumb.
  type Gesture = {
    start: VB;
    sx: number;
    sy: number;
    moved: boolean;
    t0: number;
    mode: "pan" | "pinch" | "quickzoom";
    dist?: number;
    mx?: number;
    my?: number;
    maxPointers: number;
    samples: { t: number; x: number; y: number }[];
  };
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<Gesture | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const suppress = useRef(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef<number | null>(null);

  // Follow view changes that come from outside a gesture (the box resizing), never during one.
  useEffect(() => {
    if (!g.current && !anim.current && frame.current == null) live.current = vb;
  }, [vb]);

  const stopAnim = () => {
    if (anim.current) cancelAnimationFrame(anim.current);
    anim.current = null;
  };

  /** Smoothly move to a view: position eases, zoom eases in log space (as map apps do). */
  const animateTo = (target: VB, ms = 280) => {
    stopAnim();
    const from = { ...live.current };
    const t0 = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = ease(t);
      const w = Math.exp(Math.log(from.w) + (Math.log(target.w) - Math.log(from.w)) * e);
      paint({ w, x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e });
      if (t < 1) anim.current = requestAnimationFrame(step);
      else {
        anim.current = null;
        commit();
      }
    };
    anim.current = requestAnimationFrame(step);
  };

  /** Keep moving after a quick drag, slowing down like a real surface. */
  const fling = (vx: number, vy: number) => {
    stopAnim();
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const k = live.current.w / (box.current?.getBoundingClientRect().width || 1);
      const before = live.current;
      const next = clampVB({ ...before, x: before.x - vx * dt * k, y: before.y - vy * dt * k }, r);
      paint(next);
      const decay = Math.pow(0.995, dt);
      vx *= decay;
      vy *= decay;
      const stuck = next.x === before.x && next.y === before.y;
      if (Math.hypot(vx, vy) > 0.02 && !stuck) anim.current = requestAnimationFrame(step);
      else {
        anim.current = null;
        commit();
      }
    };
    anim.current = requestAnimationFrame(step);
  };

  const rel = (x: number, y: number) => {
    const rect = box.current!.getBoundingClientRect();
    return { fx: (x - rect.left) / rect.width, fy: (y - rect.top) / rect.height, rect };
  };

  useEffect(() => {
    const el = box.current;
    if (!el || !zoomable) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      stopAnim();
      const { fx, fy } = rel(e.clientX, e.clientY);
      paint(zoomBy(Math.exp(-e.deltaY * 0.002), fx, fy));
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(commit, 120);
    };
    // iOS Safari zooms the whole page on pinch unless its gesture events are cancelled.
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", stop);
    el.addEventListener("gesturechange", stop);
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", stop);
      el.removeEventListener("gesturechange", stop);
      el.removeEventListener("touchmove", stop);
    };
    // the handlers read refs and the current ratio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomable, r, commit]);

  const down = (e: React.PointerEvent) => {
    if (!zoomable) return;
    stopAnim();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const now = performance.now();
    if (pts.length === 1) {
      const lt = lastTap.current;
      const second = !!lt && now - lt.t < 300 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 40;
      g.current = { start: live.current, sx: e.clientX, sy: e.clientY, moved: false, t0: now, mode: second ? "quickzoom" : "pan", maxPointers: 1, samples: [{ t: now, x: e.clientX, y: e.clientY }] };
      if (second) box.current!.setPointerCapture(e.pointerId);
    } else if (pts.length === 2) {
      const [a, b] = pts;
      for (const id of pointers.current.keys()) box.current!.setPointerCapture(id);
      g.current = {
        start: live.current,
        sx: 0,
        sy: 0,
        moved: false,
        t0: g.current?.t0 ?? now,
        mode: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        maxPointers: 2,
        samples: [],
      };
    }
  };

  const move = (e: React.PointerEvent) => {
    const cur = g.current;
    if (!zoomable || !cur || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = box.current!.getBoundingClientRect();
    const pts = [...pointers.current.values()];

    if (cur.mode === "quickzoom") {
      const dy = e.clientY - cur.sy;
      if (!cur.moved && Math.abs(dy) < 6) return;
      cur.moved = true;
      const { fx, fy } = rel(cur.sx, cur.sy);
      paint(zoomBy(Math.exp(dy * 0.012), fx, fy, cur.start));
      return;
    }
    if (pts.length === 1 && cur.mode === "pan") {
      const dx = e.clientX - cur.sx;
      const dy = e.clientY - cur.sy;
      if (!cur.moved && Math.hypot(dx, dy) < 8) return;
      // Capture only once it is a drag, so plain taps still reach the regions and markers.
      if (!cur.moved) box.current!.setPointerCapture(e.pointerId);
      cur.moved = true;
      const k = cur.start.w / rect.width;
      paint(clampVB({ ...cur.start, x: cur.start.x - dx * k, y: cur.start.y - dy * k }, r));
      const t = performance.now();
      cur.samples.push({ t, x: e.clientX, y: e.clientY });
      while (cur.samples.length > 2 && t - cur.samples[0].t > 100) cur.samples.shift();
    } else if (pts.length >= 2 && cur.dist && cur.mx != null && cur.my != null) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (!cur.moved && Math.abs(dist - cur.dist) < 6 && Math.hypot(mx - cur.mx, my - cur.my) < 6) return;
      cur.moved = true;
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
    const now = performance.now();
    const cancelled = e.type !== "pointerup";

    if (cur?.moved) {
      suppress.current = true;
      setTimeout(() => (suppress.current = false), 0);
    }

    if (left.length === 0 && cur && !cancelled) {
      if (cur.mode === "quickzoom" && !cur.moved) {
        // Plain double tap: zoom in where you tapped.
        const { fx, fy } = rel(cur.sx, cur.sy);
        lastTap.current = null;
        animateTo(zoomBy(2, fx, fy));
        g.current = null;
        return;
      }
      if (cur.mode === "pinch" && !cur.moved && now - cur.t0 < 300) {
        // Two-finger tap: zoom out.
        animateTo(zoomBy(0.5));
        g.current = null;
        suppress.current = true;
        setTimeout(() => (suppress.current = false), 0);
        return;
      }
      if (cur.mode === "pan" && !cur.moved) lastTap.current = { t: now, x: cur.sx, y: cur.sy };
      if (cur.mode === "pan" && cur.moved && cur.samples.length > 1) {
        const a = cur.samples[0];
        const b = cur.samples[cur.samples.length - 1];
        const dt = b.t - a.t;
        if (dt > 0 && now - b.t < 60) {
          const vx = (b.x - a.x) / dt;
          const vy = (b.y - a.y) / dt;
          if (Math.hypot(vx, vy) > 0.3) {
            g.current = null;
            fling(vx, vy);
            return;
          }
        }
      }
    }
    // A finger left after a pinch carries on as a drag from where it is.
    g.current =
      left.length === 1
        ? { start: live.current, sx: left[0].x, sy: left[0].y, moved: true, t0: now, mode: "pan", maxPointers: 1, samples: [] }
        : null;
    if (left.length === 0) commit();
  };

  /** Centre on the person's place, close enough to see the 50 km circle. */
  const locate = () => {
    if (!me) return;
    const [x, y] = project(me.lat, me.lon);
    const w = Math.max(MAP_W / MAX_ZOOM, 160 * UNITS_PER_KM);
    animateTo(clampVB({ w, x: x - w / 2, y: y - (w * r) / 2 }, r));
  };

  /** Runs a tap action unless the pointer was just used to drag or pinch. */
  const tap = (fn: () => void) => {
    if (!suppress.current) fn();
  };

  // --- markers ------------------------------------------------------------------------------
  const projected = useMemo(() => (points ?? []).map((p) => ({ p, xy: project(p.lat, p.lon) })), [points]);
  // Greedy distance clustering in screen space: a fire joins a group when it would touch it on
  // screen, so two markers can never overlap (grid cells let neighbours sit on top of each other).
  const clusters = useMemo(() => {
    const reach = 26 * upp;
    const groups: { x: number; y: number; pts: MapPoint[]; xs: number[]; ys: number[] }[] = [];
    for (const { p, xy } of projected) {
      const near = groups.find((c) => Math.hypot(c.x - xy[0], c.y - xy[1]) < reach);
      if (near) {
        near.pts.push(p);
        near.xs.push(xy[0]);
        near.ys.push(xy[1]);
        near.x = near.xs.reduce((s, v) => s + v, 0) / near.xs.length;
        near.y = near.ys.reduce((s, v) => s + v, 0) / near.ys.length;
      } else groups.push({ x: xy[0], y: xy[1], pts: [p], xs: [xy[0]], ys: [xy[1]] });
    }
    // Moving a centre can bring two groups together; merge until nothing overlaps.
    for (let merged = true; merged; ) {
      merged = false;
      outer: for (let i = 0; i < groups.length; i++)
        for (let j = i + 1; j < groups.length; j++)
          if (Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y) < reach) {
            const a = groups[i];
            const b = groups.splice(j, 1)[0];
            a.pts.push(...b.pts);
            a.xs.push(...b.xs);
            a.ys.push(...b.ys);
            a.x = a.xs.reduce((s, v) => s + v, 0) / a.xs.length;
            a.y = a.ys.reduce((s, v) => s + v, 0) / a.ys.length;
            merged = true;
            break outer;
          }
    }
    return groups;
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
    () => PLACES.filter((p) => zoom >= 2.2 || MAJOR.has(p.name)).map((p) => ({ name: placeName(p.name, lang), xy: project(p.lat, p.lon) })),
    [zoom, lang],
  );

  const meXY = me ? project(me.lat, me.lon) : null;
  const sel = selected ? OBLASTS.find((o) => o.code === selected) : null;
  const fontPx = 12 * upp;
  const dark = !!fill; // coloured regions: dark labels on a light halo

  return (
    <div
      ref={box}
      className={`relative select-none overflow-hidden [-webkit-touch-callout:none] [-webkit-user-select:none] ${zoomable ? "touch-none" : ""} ${className}`}
      style={{
        ...(className.includes("aspect-") || className.includes("h-") ? {} : { aspectRatio: `${MAP_W} / ${MAP_H}` }),
        ...(zoomable ? { touchAction: "none" } : {}),
      }}
      onContextMenu={zoomable ? (e) => e.preventDefault() : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={(e) => {
        // Only when the map itself loses the pointer. Children losing their implicit capture
        // (which happens the moment a drag starts on iOS) must not end the gesture.
        if (e.target === e.currentTarget) up(e);
      }}
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
                      <circle cx={x} cy={y} r={5.5 * upp} fill={p.color ?? "var(--ember)"} fillOpacity={p.faded ? 0.55 : 1} stroke="var(--card)" strokeWidth={1.5 * upp} />
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
              aria-label={n === 1 ? c.pts[0].label : t(`${n} огнища едно до друго`, `${n} fires close together`)}
              className="cursor-pointer outline-none"
              onClick={() => tap(() => openCluster(c))}
              onKeyDown={onKey(() => openCluster(c))}
            >
              <circle cx={c.x} cy={c.y} r={22 * upp} fill="transparent" />
              <circle cx={c.x} cy={c.y} r={rad} fill={pointColor(c.pts)} fillOpacity={pointOpacity(c.pts)} stroke="var(--card)" strokeWidth={1.5 * upp} pointerEvents="none" />
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
        <>
          {/* Back to all of Bulgaria: top right, away from the zoom and location buttons, as in map apps. */}
          {zoom > 1.05 && (
            <button
              onClick={() => animateTo(fullVB(r))}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={t("Цяла България", "All of Bulgaria")}
              className={`${ctl} pressable absolute right-3 top-3 grid size-11 place-items-center rounded-full text-content hover:bg-[color-mix(in_oklab,var(--card),var(--content)_8%)]`}
            >
              <Maximize size={18} strokeWidth={2} aria-hidden />
            </button>
          )}
          {/* One column, one width: zoom (only where there is a mouse; phones pinch) above "my location". */}
          <div className="absolute bottom-3 right-3 flex w-11 flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <div className={`${ctl} hidden flex-col overflow-hidden rounded-full text-content [@media(pointer:fine)]:flex`}>
              <button
                onClick={() => animateTo(zoomBy(2))}
                disabled={zoom >= MAX_ZOOM}
                aria-label={t("Приближи", "Zoom in")}
                className="hover-fill grid h-11 place-items-center disabled:opacity-35"
              >
                <Plus size={18} strokeWidth={2} aria-hidden />
              </button>
              <span className="mx-2.5 h-px bg-line" aria-hidden />
              <button
                onClick={() => animateTo(zoomBy(0.5))}
                disabled={zoom <= 1.01}
                aria-label={t("Отдалечи", "Zoom out")}
                className="hover-fill grid h-11 place-items-center disabled:opacity-35"
              >
                <Minus size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
            {me && (
              <button onClick={locate} aria-label={t("Покажи моето място", "Show my location")} className={`${ctl} pressable grid size-11 place-items-center rounded-full text-[#1f6fd1] hover:bg-[color-mix(in_oklab,var(--card),var(--content)_8%)]`}>
                <LocateFixed size={20} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
