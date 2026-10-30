"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useI18n } from "@shtit/core/i18n/client";
import { levelByKey, levelText, type GaugeStatus, type LevelKey } from "@/lib/flood-types";

/** A flow in m³/s with digits that suit its size: 0,42 / 8,4 / 436. */
export function useFlow() {
  const { nf } = useI18n();
  return (q: number) => nf(q, q >= 100 ? 0 : q >= 10 ? 1 : 2);
}

/** The level as a coloured pill with its word, so colour is never the only signal. */
export function LevelChip({ level, size = "md" }: { level: LevelKey; size?: "sm" | "md" }) {
  const { lang } = useI18n();
  const l = levelByKey(level);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-semibold leading-none ${size === "sm" ? "px-2 py-1 text-[12px]" : "px-2.5 py-1.5 text-[13px]"}`}
      style={{ background: l.color, color: l.onColor }}
    >
      {levelText(l, lang).label}
    </span>
  );
}

/** "↗ расте" / "↘ спада" / "→ без промяна" over the next 3 days. */
export function Trend({ trend }: { trend: GaugeStatus["trend"] }) {
  const { t } = useI18n();
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : ArrowRight;
  const word = trend === "up" ? t("расте", "rising") : trend === "down" ? t("спада", "falling") : t("без промяна", "steady");
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={16} strokeWidth={2} aria-hidden />
      {word}
    </span>
  );
}

/** "2,3 пъти повече от обичайното" / "колкото обичайно" / "наполовина". */
export function vsNormalText(x: number, t: <T>(bg: T, en: T) => T, nf: (n: number, d?: number) => string) {
  if (x >= 1.5) return t(`${nf(x, 1)} пъти повече от обичайното за месеца`, `${nf(x, 1)} times the usual for the month`);
  if (x >= 1.15) return t("малко над обичайното за месеца", "a little above the usual for the month");
  if (x >= 0.85) return t("колкото обичайно за месеца", "about usual for the month");
  return t("под обичайното за месеца", "below the usual for the month");
}

export { gaugeName } from "@/lib/flood-types";
