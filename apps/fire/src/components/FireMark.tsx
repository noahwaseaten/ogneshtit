import { useMemo } from "react";
import { groupPale, pointColor, type Markers } from "@shtit/core/ui/BulgariaMap";
import { useI18n } from "@shtit/core/i18n/client";

// How a satellite fire looks everywhere in the app (map, lists, legend). Two rules, nothing else:
//
//   bigger and redder = more heat (4 steps, --heat-1..4)
//   pale              = not current: last seen over a day ago, or no longer seen by a later satellite pass
//
// Strong current fires flicker a little; marks pop in when the map loads. Motion is decoration only, uses
// transform and opacity (60 fps) and stops with prefers-reduced-motion.

/** Flame drawn in a 24 × 24 box; the body's centre is at (12, 15). */
export const FLAME =
  "M12 1.5c.6 3.4 3 5.4 5 7.6 1.9 2.1 3 4.2 3 6.8A8 8 0 0 1 4 15.9c0-2.6 1.1-4.6 2.6-6.2.3 1.6 1.1 2.7 2.3 3.2C8.4 9.2 10 4.6 12 1.5Z";
export const CORE =
  "M12 11.6c.4 1.9 1.6 3 2.5 4.1.7.9 1.1 1.8 1.1 2.8a3.6 3.6 0 0 1-7.2 0c0-1.6.9-2.9 1.9-3.9.2.8.6 1.3 1.1 1.5-.2-1.6.1-3.2.6-4.5Z";
const CENTER_Y = 15;

/** On-screen size of the flame for each heat step, in CSS px. */
export const FLAME_PX = [15, 18, 21, 25] as const;
export const PALE = 0.42;

const delay = (seed: number, period: number) => `${-((seed * 0.618) % 1) * period}s`;

/**
 * One fire on the SVG map. `upp` is map units per CSS pixel, so the mark keeps its screen size at any zoom.
 * `seed` spreads the flicker so neighbouring fires never move in step.
 */
export function MapFire({ x, y, upp, tier, pale, color, seed = 0 }: { x: number; y: number; upp: number; tier: number; pale: boolean; color: string; seed?: number }) {
  const px = FLAME_PX[tier] ?? FLAME_PX[0];
  const s = (px / 24) * upp;
  const flicker = tier >= 2 && !pale;
  return (
    <g pointerEvents="none" opacity={pale ? PALE : 1}>
      <g transform={`translate(${x - 12 * s} ${y - CENTER_Y * s}) scale(${s})`}>
        <g className="fire-pop" style={{ animationDelay: `${Math.min(seed, 16) * 22}ms` }}>
          <g className={flicker ? "fire-flicker" : undefined} style={flicker ? { animationDelay: delay(seed + 1, 1.7) } : undefined}>
            <path d={FLAME} fill={color} stroke="var(--card)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" style={{ paintOrder: "stroke" }} />
            <path d={CORE} fill="#fff6dc" fillOpacity={0.92} />
          </g>
        </g>
      </g>
    </g>
  );
}

/** Fires that would overlap on screen: a pill with the hottest one's flame and how many there are. */
export function MapFireGroup({ x, y, upp, n, pale, color, fontPx }: { x: number; y: number; upp: number; n: number; pale: boolean; color: string; fontPx: number }) {
  const digits = String(n).length;
  const h = 24 * upp;
  const w = (30 + digits * 7.5) * upp;
  const left = x - w / 2;
  const s = (15 / 24) * upp;
  return (
    <g pointerEvents="none" opacity={pale ? 0.6 : 1}>
      <g className="fire-pop">
        <rect x={left} y={y - h / 2} width={w} height={h} rx={h / 2} fill="var(--card)" stroke={color} strokeWidth={2 * upp} />
        <g transform={`translate(${left + 13 * upp - 12 * s} ${y - CENTER_Y * s}) scale(${s})`}>
          <path d={FLAME} fill={color} />
        </g>
        <text x={left + 22 * upp} y={y} dy="0.35em" fontSize={fontPx} fontWeight={700} fill="var(--content)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {n}
        </text>
      </g>
    </g>
  );
}

/** The same flame for HTML: lists, sheets, the legend. */
export function FireIcon({ tier, pale = false, color, size }: { tier: number; pale?: boolean; color: string; size?: number }) {
  const px = size ?? FLAME_PX[tier] ?? FLAME_PX[0];
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden className="shrink-0 overflow-visible" opacity={pale ? PALE : 1}>
      <g className={tier >= 2 && !pale ? "fire-flicker" : undefined}>
        <path d={FLAME} fill={color} />
        <path d={CORE} fill="#fff6dc" fillOpacity={0.92} />
      </g>
    </svg>
  );
}

/** List lead: a tile tinted with the fire's heat, the flame sized by heat inside. */
export function FireTile({ tier, pale, color }: { tier: number; pale: boolean; color: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${color} ${pale ? 8 : 16}%, transparent)` }}>
      <FireIcon tier={tier} pale={pale} color={color} />
    </span>
  );
}

/** Four small bars filled up to the heat step: reads at a glance, next to the words. */
export function HeatMeter({ tier, color }: { tier: number; color: string }) {
  return (
    <span aria-hidden className="inline-flex h-3 items-end gap-[2px] align-[-1px]">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="w-[3px] rounded-full" style={{ height: 5 + i * 2.3, background: i <= tier ? color : "var(--line)" }} />
      ))}
    </span>
  );
}

/** How the shared map draws satellite fires. */
export function useFireMarkers(): Markers {
  const { t } = useI18n();
  return useMemo(
    () => ({
      point: (p, x, y, upp, seed) => <MapFire x={x} y={y} upp={upp} tier={p.tier ?? 1} pale={!!p.pale} color={p.color ?? "var(--ember)"} seed={seed} />,
      group: (pts, x, y, upp, fontPx) => <MapFireGroup x={x} y={y} upp={upp} n={pts.length} pale={groupPale(pts)} color={pointColor(pts)} fontPx={fontPx} />,
      groupLabel: (n) => t(`${n} огнища едно до друго`, `${n} fires close together`),
    }),
    [t],
  );
}
