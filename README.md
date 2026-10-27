# Гората днес

Mobile-first web app (PWA) about forest protection in Bulgaria, built for a school project on „Защита на гората".

- **Днес** — today's forest fire danger for your location (Canadian FWI system, the index EFFIS uses across the EU), a 5-day outlook, satellite hotspots from NASA FIRMS within 50 km, and burnt forest area per year (ИАГ data, 2010–2024).
- **Карта** — tree cover loss (Hansen/UMD via Global Forest Watch) with Natura 2000 sites (EEA) on top.
- **Помогни** — one tap to 112 with your GPS coordinates, how to check a timber truck in the ИАГ register, and reporting illegal logging via „Защити гората".

## How the fire danger is computed

`src/lib/fwi.ts` implements Van Wagner (1987). It runs 45 days of noon weather from Open-Meteo through the
moisture codes so they settle, then classifies today's FWI with EFFIS's six classes. `npm run test:fwi`
checks it against Van Wagner & Pickett's published test values. EFFIS's own value for the point is shown as a cross-check when available.

## Data sources (all free)

| Data | Source | Key |
| --- | --- | --- |
| Weather | Open-Meteo | none |
| Fire danger cross-check | EFFIS WMS (`ecmwf007.fwi`) | none |
| Hotspots | NASA FIRMS (VIIRS) | `FIRMS_MAP_KEY` (falls back to open 24 h files) |
| Burnt area history | ИАГ via WWF Bulgaria analysis (2025) | — |
| Tree cover loss | Hansen/UMD, GFW tiles | none |
| Natura 2000 | EEA ArcGIS FeatureServer | none |
| Basemap | OpenFreeMap | none |

## Run

```bash
npm install
FIRMS_MAP_KEY=... npm run dev
```

Stack: Next.js 16 (App Router, Cache Components), Tailwind 4, MapLibre GL 6, Vaul sheets, Onest (Cyrillic) for display type.
