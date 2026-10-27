"use client";

import { useEffect, useRef, useState } from "react";
import { maplibregl } from "@/lib/maplibre";
import type { GeoJSONSource, RasterTileSource } from "maplibre-gl";
import { Drawer } from "vaul";
import { ArrowUpRight } from "lucide-react";
import bulgaria from "@/data/bulgaria.json";
import { useJson } from "@/lib/client";

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const BLANK: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#dfe5dc" } }],
};
const PERIODS = [
  { key: "all", label: "2001–2025", from: 2001, to: 2025 },
  { key: "recent", label: "Последните 5 г.", from: 2021, to: 2025 },
] as const;
const TYPE: Record<string, string> = {
  A: "Защитена зона за птиците",
  B: "Защитена зона за местообитанията",
  C: "Защитена зона за птиците и местообитанията",
};

type Site = { sitecode: string; sitename: string; sitetype: string };

const tiles = (from: number, to: number) => [`/api/loss/{z}/{x}/{y}?from=${from}&to=${to}`];

export default function LossMap() {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0]);
  const [showNatura, setShowNatura] = useState(true);
  const [site, setSite] = useState<Site | null>(null);
  const natura = useJson<GeoJSON.FeatureCollection>("/natura-bg.json");
  const latest = useRef({ natura: natura.data, showNatura });

  const sync = () => {
    const m = map.current;
    if (!m || !m.getSource("natura")) return;
    const { natura: fc, showNatura: on } = latest.current;
    if (fc) (m.getSource("natura") as GeoJSONSource | undefined)?.setData(fc);
    for (const id of ["natura-fill", "natura-line"])
      if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  };

  useEffect(() => {
    latest.current = { natura: natura.data, showNatura };
    sync();
  }, [natura.data, showNatura]);

  useEffect(() => {
    const m = map.current;
    if (!m || !m.getSource("loss")) return;
    (m.getSource("loss") as RasterTileSource | undefined)?.setTiles(tiles(period.from, period.to));
  }, [period]);

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE,
      bounds: [
        [22.3, 41.2],
        [28.7, 44.3],
      ],
      fitBoundsOptions: { padding: 12 },
      maxZoom: 13,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    let fellBack = false;
    m.on("error", () => {
      if (!fellBack && !m.loaded()) {
        fellBack = true;
        m.setStyle(BLANK);
      }
    });

    m.on("load", () => {
      m.addSource("natura", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({
        id: "natura-fill",
        type: "fill",
        source: "natura",
        paint: { "fill-color": "#1f5b3e", "fill-opacity": 0.14 },
      });
      m.addLayer({
        id: "natura-line",
        type: "line",
        source: "natura",
        paint: { "line-color": "#1f5b3e", "line-width": 1, "line-opacity": 0.7 },
      });
      m.addSource("loss", {
        type: "raster",
        tiles: tiles(PERIODS[0].from, PERIODS[0].to),
        tileSize: 256,
        maxzoom: 12,
        attribution: "Hansen/UMD/Google/USGS/NASA · Global Forest Watch",
      });
      m.addLayer({ id: "loss", type: "raster", source: "loss", paint: { "raster-opacity": 0.9 } });
      m.addSource("bg", { type: "geojson", data: bulgaria as GeoJSON.Feature });
      m.addLayer({
        id: "bg-line",
        type: "line",
        source: "bg",
        paint: { "line-color": "#16201a", "line-width": 1.25, "line-opacity": 0.5 },
      });
      m.on("click", "natura-fill", (e) => {
        const p = e.features?.[0]?.properties as Site | undefined;
        if (p) setSite(p);
      });
      sync();
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Период" className="flex rounded-full bg-line p-1 text-[14px] font-medium">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              aria-pressed={period.key === p.key}
              onClick={() => setPeriod(p)}
              className={`min-h-9 rounded-full px-3.5 transition-colors duration-150 ${
                period.key === p.key ? "bg-card text-content shadow-[var(--shadow)]" : "text-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          aria-pressed={showNatura}
          onClick={() => setShowNatura((v) => !v)}
          className={`pressable min-h-11 rounded-full border px-3.5 text-[14px] font-medium ${
            showNatura ? "border-accent text-accent" : "border-line text-muted"
          }`}
        >
          Натура 2000
        </button>
      </div>

      <div
        ref={el}
        className="h-[min(62dvh,560px)] w-full overflow-hidden rounded-[20px] bg-line"
        role="region"
        aria-label="Карта на загубата на горска покривка и зоните Натура 2000"
      />

      <ul className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-[14px]" aria-label="Легенда">
        <li className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-[3px] bg-[#e5216e]" aria-hidden /> Загубена горска покривка
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-[3px] border border-[#1f5b3e] bg-[#1f5b3e]/15" aria-hidden /> Натура 2000
        </li>
      </ul>
      {natura.error && !natura.data && (
        <p className="px-1 text-[14px] text-muted">Границите на Натура 2000 не са налични в момента.</p>
      )}

      <Drawer.Root open={!!site} onOpenChange={(o) => !o && setSite(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-[28px] bg-card px-5 outline-none"
            style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" aria-hidden />
            {site && (
              <>
                <Drawer.Title className="pt-4 font-display text-[22px] font-semibold">{site.sitename}</Drawer.Title>
                <Drawer.Description className="pt-1 text-[15px] text-muted">
                  {TYPE[site.sitetype] ?? "Защитена зона"} · {site.sitecode}
                </Drawer.Description>
                <a
                  href={`https://natura2000.eea.europa.eu/Natura2000/SDF.aspx?site=${site.sitecode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pressable mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent text-[16px] font-semibold text-accent-content"
                >
                  Какво се опазва тук
                  <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
                </a>
              </>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
