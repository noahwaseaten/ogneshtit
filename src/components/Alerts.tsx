"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, BellOff, ChevronRight } from "lucide-react";
import { useLocation } from "@/lib/client";
import { oblastAt } from "@/lib/oblast";
import type { Prefs } from "@/lib/alerts";
import { useInstall } from "./Install";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const STORE = "ogneshtit:alerts";
const DEFAULTS: Prefs = { danger: "high", firesKm: 25, warnings: true };

function keyBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

type Saved = { label: string; prefs: Prefs };
function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    if (raw.startsWith("{")) return JSON.parse(raw) as Saved;
    return { label: raw, prefs: DEFAULTS }; // older format kept only the label
  } catch {
    return null;
  }
}

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid rounded-full bg-line p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`min-h-9 rounded-full px-1 text-[14px] font-semibold ${value === v ? "bg-tonal text-content" : "text-muted"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/**
 * Push alerts for the chosen place. Quiet by default: one danger alert a day at most, new fires
 * within a chosen distance, and only orange or red weather warnings. Nothing at night.
 */
export function Alerts({ help = false }: { help?: boolean }) {
  const { loc } = useLocation();
  const { ios, standalone } = useInstall();
  const [state, setState] = useState<State>("loading");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!KEY;
      if (!ok) return setState(ios && !standalone ? "needs-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const s = readSaved();
      setSaved(s);
      if (s) setPrefs(s.prefs);
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [ios, standalone]);

  // GPS positions are replaced by their oblast name for the label; only the rounded point is sent.
  const place = () => {
    if (loc.source !== "gps") return { lat: loc.lat, lon: loc.lon, label: loc.label };
    const o = oblastAt(loc.lat, loc.lon);
    return { lat: loc.lat, lon: loc.lon, label: o ? `област ${o.name.replace(/ (град|област)$/, "")}` : "вашето място" };
  };

  const save = async (next: Prefs, subscribe = false) => {
    setBusy(true);
    setNote(null);
    try {
      if (subscribe && (await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const p = place();
      const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), place: p, prefs: next }) });
      if (!res.ok) throw new Error();
      const s = { label: p.label, prefs: next };
      localStorage.setItem(STORE, JSON.stringify(s));
      setSaved(s);
      setPrefs(next);
      setState("on");
    } catch {
      setNote("Не успяхме да запазим. Опитайте пак.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      localStorage.removeItem(STORE);
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setNote(null);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const res = await fetch("/api/push/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    const body = await res.json().catch(() => ({}));
    setNote(res.ok ? "Изпратихме пробно известие. Трябва да се появи до няколко секунди." : body.error ?? "Не успяхме да изпратим.");
  };

  if (state === "loading" || state === "unsupported") return null;
  const here = place().label;
  const moved = state === "on" && saved && saved.label !== here;

  return (
    <section id={help ? undefined : "izvestiya"} aria-labelledby={help ? undefined : "alerts-title"} className="scroll-mt-20">
      {!help && (
        <h2 id="alerts-title" className="px-1 pb-2 text-[17px] font-semibold">
          Известия
        </h2>
      )}
      <div className="rounded-[20px] bg-card p-4">
        <div className="flex items-start gap-3">
          {state === "on" ? (
            <Bell size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          ) : (
            <BellOff size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold">{state === "on" ? `Известия за ${saved?.label ?? here}` : "Известия при опасност"}</p>
            <p className="pt-0.5 text-[14px] leading-snug text-muted">
              {state === "needs-install"
                ? "На iPhone известията работят, след като добавите ОгнеЩит на началния екран."
                : state === "denied"
                  ? "Известията са спрени за този сайт в настройките на браузъра. Разрешете ги там."
                  : state === "on"
                    ? "Пишем ви само при опасност или нов огън наблизо, никога през нощта."
                    : "Само когато опасността е висока, има нов огън наблизо или оранжев код. Никога през нощта."}
            </p>
          </div>
        </div>

        {state === "off" && (
          <button
            onClick={() => save(prefs, true)}
            disabled={busy}
            className="pressable mt-3 flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content disabled:opacity-60"
          >
            Включи за {here}
          </button>
        )}

        {state === "on" && !help && (
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] font-medium">Опасност от пожар</p>
              <Segmented
                label="Опасност от пожар"
                value={prefs.danger}
                options={[
                  ["off", "Не"],
                  ["high", "От висока"],
                  ["veryhigh", "От много висока"],
                ]}
                onChange={(v) => save({ ...prefs, danger: v })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] font-medium">Нов огън от спътник</p>
              <Segmented
                label="Нов огън от спътник"
                value={prefs.firesKm}
                options={[
                  [0, "Не"],
                  [10, "10 км"],
                  [25, "25 км"],
                  [50, "50 км"],
                ]}
                onChange={(v) => save({ ...prefs, firesKm: v })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] font-medium">Оранжев и червен код на НИМХ</p>
              <Segmented
                label="Предупреждения на НИМХ"
                value={prefs.warnings ? "on" : "off"}
                options={[
                  ["off", "Не"],
                  ["on", "Да"],
                ]}
                onChange={(v) => save({ ...prefs, warnings: v === "on" })}
              />
            </div>
          </div>
        )}

        {state === "on" && (
          <div className="flex flex-wrap gap-2 pt-4">
            {moved && (
              <button onClick={() => save(prefs)} disabled={busy} className="pressable min-h-11 rounded-full bg-tonal px-4 text-[15px] font-semibold disabled:opacity-60">
                Смени на {here}
              </button>
            )}
            {!help && (
              <button onClick={test} className="pressable min-h-11 rounded-full bg-line px-4 text-[15px] font-semibold">
                Пробно известие
              </button>
            )}
            {!help && (
              <button onClick={disable} disabled={busy} className="pressable min-h-11 rounded-full px-4 text-[15px] font-medium text-muted hover:bg-line/60 disabled:opacity-60">
                Изключи
              </button>
            )}
          </div>
        )}

        {note && (
          <p role="status" className="pt-2 text-[14px] text-muted">
            {note}
          </p>
        )}

        {help && (
          <Link href={state === "needs-install" ? "/za#install" : "/za#izvestiya"} className="mt-1 inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-accent">
            {state === "needs-install" ? "Как да го добавя" : state === "on" ? "Настройки на известията" : "Как работят"}
            <ChevronRight size={16} strokeWidth={2} aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
