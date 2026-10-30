import type { AppId } from "./brand";

/**
 * One app's answer for one place today, worded by the app itself, for the hub (shield.noahwaseaten.com).
 * Served by every tool app at /api/summary?lat=&lon=&l=bg|en.
 */
export type AppSummary = {
  app: AppId;
  /** null when the app has nothing to rate here (for example no large river nearby). */
  level: { key: string; index: number; of: number; label: string; hex: string; onColor: string } | null;
  /** "Ниска опасност от пожар днес" */
  headline: string;
  /** One more line: what the rating is based on. */
  detail: string;
  updated: string;
};

/** The hub reads summaries from the browser. They hold nothing private, so any origin may (preview builds too). */
export const summaryHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
});
