import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Onest (Latin + Cyrillic) for generated images. Satori needs woff/ttf, so the files live in /assets/fonts. */
export async function ogFonts() {
  const f = (n: string) => readFile(join(process.cwd(), "assets/fonts", n));
  const [c5, c7, l5, l7] = await Promise.all([
    f("onest-cyrillic-500.woff"),
    f("onest-cyrillic-700.woff"),
    f("onest-latin-500.woff"),
    f("onest-latin-700.woff"),
  ]);
  return [
    { name: "Onest", data: c5, weight: 500 as const, style: "normal" as const },
    { name: "Onest", data: c7, weight: 700 as const, style: "normal" as const },
    { name: "Onest Latin", data: l5, weight: 500 as const, style: "normal" as const },
    { name: "Onest Latin", data: l7, weight: 700 as const, style: "normal" as const },
  ];
}

/** Hex colours for the danger classes (images cannot use CSS variables). */
export const DANGER_HEX: Record<string, string> = {
  low: "#2f7d4a",
  moderate: "#e3b021",
  high: "#e3741b",
  veryhigh: "#c7361f",
  extreme: "#8a1a12",
  veryextreme: "#4b1036",
};

export const SHIELD = (
  <svg width={64} height={64} viewBox="0 0 32 32">
    <path d="M16 2.5 27 6.6v8.2c0 7-4.7 12.6-11 14.7C9.7 27.4 5 21.8 5 14.8V6.6L16 2.5Z" fill="#f3f5f1" />
    <path d="M16 9.2c.9 2.6 4.1 4.3 4.1 8.1a4.1 4.1 0 1 1-8.2 0c0-1.9 1-3 1.9-4 .3 1.4 1 2.2 1.8 2.4-.5-2.1 0-4.4.4-6.5Z" fill="#e0482c" />
  </svg>
);
