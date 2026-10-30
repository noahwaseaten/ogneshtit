"use client";

import { useState } from "react";
import { Copy, Check, LocateFixed } from "lucide-react";
import { getPosition } from "../client";
import { useI18n } from "../i18n/client";

/** Precise GPS position for the 112 operator. GPS works without mobile data. */
export function MyCoords() {
  const [pos, setPos] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { t, lang } = useI18n();

  const locate = () => {
    setState("locating");
    setErr(null);
    getPosition(true, lang)
      .then((p) => {
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy });
        setState("idle");
      })
      .catch((e: Error) => {
        setErr(e.message);
        setState("error");
      });
  };

  const text = pos ? `${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!pos)
    return (
      <div>
        <button
          onClick={locate}
          disabled={state === "locating"}
          className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 text-[16px] font-semibold disabled:opacity-70"
        >
          <LocateFixed size={20} strokeWidth={2} aria-hidden />
          {state === "locating" ? t("Търсим сигнал от GPS…", "Finding a GPS signal…") : t("Покажи моите координати", "Show my coordinates")}
        </button>
        {state === "error" && (
          <p role="alert" className="pt-2 text-[14px] opacity-90">
            {err} {t("Ако не стане, опишете на оператора най-близкото село, връх или път.", "If that fails, tell the operator the nearest village, peak or road.")}
          </p>
        )}
      </div>
    );

  return (
    <div className="rounded-2xl bg-white/15 p-4" aria-live="polite">
      <p className="text-[13px] font-medium opacity-90">{t("Вашите координати", "Your coordinates")}</p>
      <p className="pt-0.5 font-display text-[24px] font-bold tabular-nums tracking-tight">{text}</p>
      <p className="text-[13px] tabular-nums opacity-90">{t("Точност около", "Accurate to about")} {Math.round(pos.acc)} {t("м", "m")}</p>
      <button
        onClick={copy}
        className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-[var(--sos,#8a1a12)]"
      >
        <span className="relative grid size-[18px] place-items-center">
          <Copy size={18} strokeWidth={2} aria-hidden className="swap absolute" data-hidden={copied} />
          <Check size={18} strokeWidth={2.25} aria-hidden className="swap absolute" data-hidden={!copied} />
        </span>
        {copied ? t("Копирано", "Copied") : t("Копирай", "Copy")}
      </button>
    </div>
  );
}
