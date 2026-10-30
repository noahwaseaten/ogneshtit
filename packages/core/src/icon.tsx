import { ImageResponse } from "next/og";
import type { AppId } from "./brand";
import { EmblemTile } from "./emblem";

// App icons drawn in code (no binary assets): the app's emblem on its colour.
// `inset` is the share of the canvas kept clear around the artwork (maskable icons need about 20%).
const VARIANTS: Record<string, [number, number]> = {
  "192": [192, 0.08],
  "512": [512, 0.08],
  maskable: [512, 0.2],
  apple: [180, 0.1],
};

export function iconResponse(app: AppId, variant: string) {
  const v = VARIANTS[variant];
  if (!v) return new Response("Not found", { status: 404 });
  return new ImageResponse(<EmblemTile app={app} size={v[0]} inset={v[1]} />, {
    width: v[0],
    height: v[0],
    headers: { "Cache-Control": "public, max-age=604800, immutable" },
  });
}
