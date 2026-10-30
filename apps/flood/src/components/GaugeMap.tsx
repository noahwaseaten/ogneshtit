"use client";

import { useMemo } from "react";
import { BulgariaMap, type MapPoint, type Markers } from "@shtit/core/ui/BulgariaMap";
import { useI18n } from "@shtit/core/i18n/client";
import { RIVERS } from "@/data/rivers";
import { GAUGES } from "@/data/gauges";
import { levelByKey, levelText, type GaugeStatus } from "@/lib/flood-types";
import { gaugeName } from "./bits";

// River points on the map: a dot in the colour of the highest level within 15 days (white ring, so it stands out on
// the river line), bigger with each level, and a soft pulse from "high" up. Groups are a pill with the count, in the
// colour of their worst point. Motion is decoration only and stops with reduced motion.

const R = [5, 6, 7.5, 8.5, 9.5];

export function useGaugeMarkers(): Markers {
  const { t } = useI18n();
  return useMemo(
    () => ({
      point: (p, x, y, upp) => {
        const r = R[p.tier ?? 0] * upp;
        return (
          <g>
            {(p.tier ?? 0) >= 2 && <circle className="gauge-pulse" cx={x} cy={y} r={r} fill={p.color} />}
            <circle cx={x} cy={y} r={r} fill={p.color} stroke="#fff" strokeWidth={2 * upp} />
          </g>
        );
      },
      group: (pts, x, y, upp, fontPx) => {
        const lead = [...pts].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))[0];
        const w = (pts.length > 9 ? 30 : 24) * upp;
        const h = 20 * upp;
        return (
          <g>
            <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={lead.color} stroke="#fff" strokeWidth={2 * upp} />
            <text x={x} y={y + fontPx * 0.36} textAnchor="middle" fontSize={fontPx} fontWeight={700} fill={(lead.tier ?? 0) === 1 || (lead.tier ?? 0) === 2 ? "#1b1b1b" : "#fff"}>
              {pts.length}
            </text>
          </g>
        );
      },
      groupLabel: (n) => t(`${n} точки по реките една до друга`, `${n} river points close together`),
    }),
    [t],
  );
}

/** The main rivers, under the points. The Danube is drawn a little thicker. */
export function riverLayer(upp: number) {
  return (
    <g aria-hidden pointerEvents="none">
      {RIVERS.map((r) => (
        <path key={r.bg} d={r.d} fill="none" stroke="var(--water)" strokeOpacity={0.75} strokeWidth={(r.major ? 2.6 : 1.5) * upp} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
}

/** Map points for the river statuses: colour and size from the 15-day peak, worst first in groups. */
export function useGaugePoints(statuses: GaugeStatus[] | undefined) {
  const { lang } = useI18n();
  return useMemo<MapPoint[]>(
    () =>
      (statuses ?? []).flatMap((s) => {
        const g = GAUGES.find((x) => x.id === s.id);
        if (!g) return [];
        const l = levelByKey(s.peak.level);
        return [{ id: s.id, lat: g.lat, lon: g.lon, label: `${gaugeName(g, lang)}: ${levelText(l, lang).label}`, color: l.color, tier: l.index, rank: 4 - l.index }];
      }),
    [statuses, lang],
  );
}

export function GaugeMap({
  statuses,
  onPick,
  me,
  zoomable = false,
  className,
  fill,
  regionName,
  onRegion,
  selected,
  ariaLabel,
}: {
  statuses: GaugeStatus[] | undefined;
  onPick: (ids: string[]) => void;
  me?: { lat: number; lon: number; radiusKm?: number } | null;
  zoomable?: boolean;
  className?: string;
  fill?: (code: string) => string;
  regionName?: (code: string) => string;
  onRegion?: (code: string) => void;
  selected?: string | null;
  ariaLabel: string;
}) {
  const markers = useGaugeMarkers();
  const points = useGaugePoints(statuses);
  return (
    <BulgariaMap
      ariaLabel={ariaLabel}
      points={points}
      markers={markers}
      layers={riverLayer}
      onPoints={(pts) => onPick(pts.map((p) => p.id))}
      me={me}
      zoomable={zoomable}
      className={className}
      fill={fill}
      regionName={regionName}
      onRegion={onRegion}
      selected={selected}
    />
  );
}
