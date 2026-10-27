// MapLibre v6 loads its web worker from a separate file next to its own bundle.
// Bundlers don't copy it, so we serve it from /public and point MapLibre at it (see src/lib/maplibre.ts).
import { copyFileSync } from "node:fs";
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-gl-worker.mjs");
