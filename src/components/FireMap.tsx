"use client";

import { useEffect, useRef } from "react";
import { maplibregl } from "@/lib/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import bulgaria from "@/data/bulgaria.json";
import type { Hotspot } from "@/lib/fires";

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
// If the basemap can't load (outage, blocked network), still show the border and hotspots.
const BLANK: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#dfe5dc" } }],
};

function toGeoJSON(hotspots: Hotspot[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: hotspots.map((h, i) => ({
      type: "Feature",
      id: i,
      geometry: { type: "Point", coordinates: [h.lon, h.lat] },
      properties: { i, conf: h.confidence, frp: h.frp },
    })),
  };
}

export default function FireMap({
  hotspots,
  center,
  onSelect,
}: {
  hotspots: Hotspot[];
  center: { lat: number; lon: number } | null;
  onSelect: (h: Hotspot) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const latest = useRef({ hotspots, onSelect, center });

  // Push the latest hotspots and position into the map (no-op until the style has loaded).
  const sync = () => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    const { hotspots: hs, center: c } = latest.current;
    (m.getSource("fires") as GeoJSONSource | undefined)?.setData(toGeoJSON(hs));
    (m.getSource("me") as GeoJSONSource | undefined)?.setData(
      c
        ? {
            type: "Feature",
            geometry: { type: "Point", coordinates: [c.lon, c.lat] },
            properties: {},
          }
        : { type: "FeatureCollection", features: [] },
    );
  };

  useEffect(() => {
    latest.current = { hotspots, onSelect, center };
    sync();
  }, [hotspots, onSelect, center]);

  useEffect(() => {
    let cancelled = false;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    (async () => {
      // Use the dark basemap only if it is actually reachable.
      let style = STYLE_LIGHT;
      if (dark) {
        try {
          if ((await fetch(STYLE_DARK)).ok) style = STYLE_DARK;
        } catch {}
      }
      if (cancelled || !el.current) return;
      const m = new maplibregl.Map({
        container: el.current,
        style,
        bounds: [
          [22.3, 41.2],
          [28.7, 44.3],
        ],
        fitBoundsOptions: { padding: 12 },
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true, // one finger scrolls the page, two fingers move the map
      });
      m.touchZoomRotate.disableRotation();
      map.current = m;
      let fellBack = false;
      m.on("error", () => {
        if (!fellBack && !m.loaded()) {
          fellBack = true;
          m.setStyle(BLANK);
        }
      });

      m.on("load", () => {
        m.addSource("bg", {
          type: "geojson",
          data: bulgaria as GeoJSON.Feature,
        });
        m.addLayer({
          id: "bg-line",
          type: "line",
          source: "bg",
          paint: {
            "line-color": dark ? "#e6ece4" : "#16201a",
            "line-width": 1.25,
            "line-opacity": 0.5,
          },
        });
        m.addSource("fires", {
          type: "geojson",
          data: toGeoJSON(latest.current.hotspots),
        });
        m.addLayer({
          id: "fires-halo",
          type: "circle",
          source: "fires",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              6,
              9,
              11,
              16,
            ],
            "circle-color": "#c7361f",
            "circle-opacity": 0.18,
          },
        });
        m.addLayer({
          id: "fires",
          type: "circle",
          source: "fires",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 11, 7],
            "circle-color": [
              "match",
              ["get", "conf"],
              "high",
              "#8a1a12",
              "low",
              "#e3741b",
              "#c7361f",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
          },
        });
        m.addSource("me", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        m.addLayer({
          id: "me",
          type: "circle",
          source: "me",
          paint: {
            "circle-radius": 7,
            "circle-color": "#1f6fd1",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2.5,
          },
        });
        m.on("click", "fires-halo", (e) => {
          const i = e.features?.[0]?.properties?.i;
          const h =
            typeof i === "number" ? latest.current.hotspots[i] : undefined;
          if (h) latest.current.onSelect(h);
        });
        m.on(
          "mouseenter",
          "fires-halo",
          () => (m.getCanvas().style.cursor = "pointer"),
        );
        m.on(
          "mouseleave",
          "fires-halo",
          () => (m.getCanvas().style.cursor = ""),
        );
      });
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div
      ref={el}
      className="h-[320px] w-full overflow-hidden rounded-[20px] bg-line"
      role="region"
      aria-label="Карта с възможни пожари в България"
    />
  );
}
