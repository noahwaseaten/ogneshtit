"use client";

import { useState } from "react";
import { Copy, Check, LocateFixed } from "lucide-react";

/** Precise GPS position for the 112 operator. GPS works without mobile data. */
export function MyCoords() {
  const [pos, setPos] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const locate = () => {
    if (!("geolocation" in navigator)) return setState("error");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy });
        setState("idle");
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
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
          {state === "locating" ? "Търсим сигнал от GPS…" : "Покажи моите координати"}
        </button>
        {state === "error" && (
          <p role="alert" className="pt-2 text-[14px] opacity-90">
            Няма достъп до местоположението. Опишете на оператора най-близкото село, връх или пътя.
          </p>
        )}
      </div>
    );

  return (
    <div className="rounded-2xl bg-white/15 p-4" aria-live="polite">
      <p className="text-[13px] font-medium opacity-90">Вашите координати</p>
      <p className="pt-0.5 font-display text-[24px] font-bold tabular-nums tracking-tight">{text}</p>
      <p className="text-[13px] tabular-nums opacity-90">Точност около {Math.round(pos.acc)} м</p>
      <button
        onClick={copy}
        className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-[#8a1a12]"
      >
        {copied ? <Check size={18} strokeWidth={2} aria-hidden /> : <Copy size={18} strokeWidth={2} aria-hidden />}
        {copied ? "Копирано" : "Копирай"}
      </button>
    </div>
  );
}
