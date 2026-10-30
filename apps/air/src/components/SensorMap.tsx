"use client";

import { useMemo } from "react";
import { BulgariaMap, type MapPoint, type Markers } from "@shtit/core/ui/BulgariaMap";
import { useI18n } from "@shtit/core/i18n/client";
import { BANDS, bandOf, bandText, median, type SensorPoint } from "@/lib/air-types";

// Citizen sensors on the map: a dot per sensor in its band's colour, and where dots crowd, a pill with the count in
// the colour of the group's median band (one sensor in fog must not paint a whole town red).

export function useSensorMarkers(): Markers {
  const { t } = useI18n();
  return useMemo(
    () => ({
      point: (p, x, y, upp) => <circle cx={x} cy={y} r={5 * upp} fill={BANDS[p.tier ?? 0].color} stroke="#fff" strokeWidth={1.5 * upp} />,
      group: (pts, x, y, upp, fontPx) => {
        const b = BANDS[Math.round(median(pts.map((p) => p.tier ?? 0)) ?? 0)];
        const w = (pts.length > 99 ? 34 : pts.length > 9 ? 28 : 22) * upp;
        const h = 20 * upp;
        return (
          <g>
            <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={b.color} stroke="#fff" strokeWidth={1.5 * upp} />
            <text x={x} y={y + fontPx * 0.36} textAnchor="middle" fontSize={fontPx} fontWeight={700} fill={b.onColor}>
              {pts.length}
            </text>
          </g>
        );
      },
      groupLabel: (n) => t(`${n} датчика един до друг`, `${n} sensors close together`),
    }),
    [t],
  );
}

export function useSensorPoints(sensors: SensorPoint[] | undefined) {
  const { lang, nf } = useI18n();
  return useMemo<MapPoint[]>(
    () =>
      (sensors ?? []).map((s, i) => {
        const b = bandOf(s[2], s[3]);
        return { id: String(i), lat: s[0], lon: s[1], label: `${bandText(b, lang).label}, ${nf(s[2])} µg/m³`, tier: b.index, rank: 5 - b.index };
      }),
    [sensors, lang, nf],
  );
}

export function SensorMap({
  sensors,
  onPick,
  me,
  zoomable = false,
  className,
  ariaLabel,
}: {
  sensors: SensorPoint[] | undefined;
  onPick: (pts: MapPoint[]) => void;
  me?: { lat: number; lon: number; radiusKm?: number } | null;
  zoomable?: boolean;
  className?: string;
  ariaLabel: string;
}) {
  const markers = useSensorMarkers();
  const points = useSensorPoints(sensors);
  return <BulgariaMap ariaLabel={ariaLabel} points={points} markers={markers} onPoints={onPick} me={me} zoomable={zoomable} className={className} />;
}
