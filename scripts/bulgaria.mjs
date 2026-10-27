import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const fc = feature(topo, topo.objects.countries);
const bg = fc.features.find((f) => f.id === "100");
const round = (c) => c.map((x) => Array.isArray(x) ? round(x) : Math.round(x * 1000) / 1000);
bg.geometry.coordinates = round(bg.geometry.coordinates);
writeFileSync("src/data/bulgaria.json", JSON.stringify({ type: "Feature", properties: { name: "България" }, geometry: bg.geometry }));
console.log(bg.geometry.type, JSON.stringify(bg.geometry).length);
