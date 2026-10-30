import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Onest (Latin + Cyrillic) for generated images. Satori needs woff/ttf, so the files live in packages/core/assets/fonts.
// An app runs from its own folder (apps/<name>) both locally and on Vercel, so the fonts are two levels up; the
// apps list that folder in outputFileTracingIncludes so it ships with the functions.
function fontDir() {
  const here = join(process.cwd(), "assets/fonts");
  return existsSync(here) ? here : join(process.cwd(), "../../packages/core/assets/fonts");
}

export async function ogFonts() {
  const dir = fontDir();
  const f = (n: string) => readFile(join(dir, n));
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

export type OgFonts = Awaited<ReturnType<typeof ogFonts>>;

/** Fonts for outputFileTracingIncludes in each app's next.config.ts. */
export const OG_FONT_FILES = "../../packages/core/assets/fonts/**";
