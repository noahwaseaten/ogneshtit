// How a satellite fire looks everywhere in the app (map, lists, legend).
//
//   shape  = how recent: a flame for the last 24 h, a small ember for older ones
//   size   = how much heat (4 steps), and so does the colour (--heat-1..4); colour is never the only signal
//   motion = how fresh: under 6 h the flame breathes a soft glow; strong flames also flicker
//
// All motion is transform and opacity only (60 fps) and stops with prefers-reduced-motion.

export type FireAge = "fresh" | "day" | "old";

export const FRESH_H = 6;
export const OLD_H = 24;

export const fireAge = (iso: string, now = Date.now()): FireAge => {
  const h = (now - new Date(iso).getTime()) / 3600e3;
  return h < FRESH_H ? "fresh" : h < OLD_H ? "day" : "old";
};

/** Flame drawn in a 24 × 24 box; the body's centre is at (12, 15). */
export const FLAME =
  "M12 1.5c.6 3.4 3 5.4 5 7.6 1.9 2.1 3 4.2 3 6.8A8 8 0 0 1 4 15.9c0-2.6 1.1-4.6 2.6-6.2.3 1.6 1.1 2.7 2.3 3.2C8.4 9.2 10 4.6 12 1.5Z";
export const CORE =
  "M12 11.6c.4 1.9 1.6 3 2.5 4.1.7.9 1.1 1.8 1.1 2.8a3.6 3.6 0 0 1-7.2 0c0-1.6.9-2.9 1.9-3.9.2.8.6 1.3 1.1 1.5-.2-1.6.1-3.2.6-4.5Z";
const CENTER_Y = 15;

/** On-screen size of the flame for each heat step, in CSS px. */
export const FLAME_PX = [15, 18, 21, 25] as const;

const delay = (seed: number, period: number) => `${-((seed * 0.618) % 1) * period}s`;

/**
 * One fire on the SVG map. `upp` is map units per CSS pixel, so the mark keeps its screen size at any zoom.
 * `seed` spreads the animations so neighbouring fires never pulse in step.
 */
export function MapFire({ x, y, upp, tier, age, color, seed = 0 }: { x: number; y: number; upp: number; tier: number; age: FireAge; color: string; seed?: number }) {
  if (age === "old") {
    return (
      <g pointerEvents="none">
        <circle cx={x} cy={y} r={4.5 * upp} fill={color} fillOpacity={0.28} stroke={color} strokeOpacity={0.7} strokeWidth={1.25 * upp} />
        <circle cx={x} cy={y} r={1.6 * upp} fill={color} fillOpacity={0.85} />
      </g>
    );
  }
  const px = FLAME_PX[tier] ?? FLAME_PX[0];
  const s = (px / 24) * upp;
  return (
    <g pointerEvents="none">
      {age === "fresh" && <circle className="fire-halo" cx={x} cy={y} r={px * 0.62 * upp} fill={color} style={{ animationDelay: delay(seed, 2.4) }} />}
      <g transform={`translate(${x - 12 * s} ${y - CENTER_Y * s}) scale(${s})`}>
        <g className="fire-pop" style={{ animationDelay: `${Math.min(seed, 16) * 22}ms` }}>
          <g className={tier >= 2 ? "fire-flicker" : undefined} style={tier >= 2 ? { animationDelay: delay(seed + 1, 1.7) } : undefined}>
            <path d={FLAME} fill={color} stroke="var(--card)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" style={{ paintOrder: "stroke" }} />
            <path d={CORE} fill="#fff6dc" fillOpacity={0.92} />
          </g>
        </g>
      </g>
    </g>
  );
}

/** A group of fires that would overlap: a pill with the hottest fire's mark and the count. */
export function MapFireGroup({ x, y, upp, n, age, color, fontPx }: { x: number; y: number; upp: number; n: number; age: FireAge; color: string; fontPx: number }) {
  const digits = String(n).length;
  const h = 24 * upp;
  const w = (30 + digits * 7.5) * upp;
  const left = x - w / 2;
  const icon = 15;
  const s = (icon / 24) * upp;
  return (
    <g pointerEvents="none">
      {age === "fresh" && <rect className="fire-halo" x={left} y={y - h / 2} width={w} height={h} rx={h / 2} fill={color} />}
      <g className="fire-pop">
        <rect x={left} y={y - h / 2} width={w} height={h} rx={h / 2} fill="var(--card)" stroke={color} strokeWidth={2 * upp} />
        {age === "old" ? (
          <circle cx={left + 13 * upp} cy={y} r={4 * upp} fill={color} fillOpacity={0.5} />
        ) : (
          <g transform={`translate(${left + 13 * upp - 12 * s} ${y - CENTER_Y * s}) scale(${s})`}>
            <path d={FLAME} fill={color} />
          </g>
        )}
        <text x={left + 22 * upp} y={y} dy="0.35em" fontSize={fontPx} fontWeight={700} fill="var(--content)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {n}
        </text>
      </g>
    </g>
  );
}

/** The same mark for HTML: lists, sheets, the legend. */
export function FireIcon({ tier, age, color, size }: { tier: number; age: FireAge; color: string; size?: number }) {
  const px = size ?? FLAME_PX[tier] ?? FLAME_PX[0];
  if (age === "old")
    return (
      <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden className="shrink-0">
        <circle cx="12" cy="12" r="6" fill={color} fillOpacity={0.28} stroke={color} strokeOpacity={0.7} strokeWidth="1.75" />
        <circle cx="12" cy="12" r="2.2" fill={color} fillOpacity={0.85} />
      </svg>
    );
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden className="shrink-0 overflow-visible">
      <g className={tier >= 2 ? "fire-flicker" : undefined}>
        <path d={FLAME} fill={color} />
        <path d={CORE} fill="#fff6dc" fillOpacity={0.92} />
      </g>
    </svg>
  );
}

/**
 * List lead: a tile tinted with the fire's heat, the flame sized by heat inside, and for fires under
 * 6 hours old a glow that breathes out from the tile.
 */
export function FireTile({ tier, age, color }: { tier: number; age: FireAge; color: string }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${color} ${age === "old" ? 10 : 16}%, transparent)` }}>
      {age === "fresh" && <span aria-hidden className="fire-halo absolute inset-0 rounded-xl" style={{ background: color }} />}
      <FireIcon tier={tier} age={age} color={color} />
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
