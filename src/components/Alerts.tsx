"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useLocation } from "@/lib/client";
import { oblastAt } from "@/lib/oblast";
import { useInstall } from "./Install";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const STORE = "ogneshtit:alerts";

function keyBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

/** Push alerts for the chosen place: high fire danger and satellite fires within 25 km. */
export function Alerts() {
  const { loc } = useLocation();
  const { ios, standalone } = useInstall();
  const [state, setState] = useState<State>("loading");
  const [label, setLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!KEY;
      if (!ok) return setState(ios && !standalone ? "needs-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setLabel(localStorage.getItem(STORE));
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [ios, standalone]);

  // GPS positions are replaced by their oblast centre before they leave the device.
  const place = () => {
    if (loc.source !== "gps") return { lat: loc.lat, lon: loc.lon, label: loc.label };
    const o = oblastAt(loc.lat, loc.lon);
    return { lat: loc.lat, lon: loc.lon, label: o ? `област ${o.name.replace(/ (град|област)$/, "")}` : "вашето място" };
  };

  const enable = async () => {
    setBusy(true);
    setErr(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const p = place();
      const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), place: p }) });
      if (!res.ok) throw new Error();
      localStorage.setItem(STORE, p.label);
      setLabel(p.label);
      setState("on");
    } catch {
      setErr("Не успяхме да включим известията. Опитайте пак.");
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

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="rounded-[20px] bg-card p-4">
      <div className="flex items-start gap-3">
        {state === "on" ? <Bell size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent" aria-hidden /> : <BellOff size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">{state === "on" ? `Известия за ${label ?? "избраното място"}` : "Известия"}</p>
          <p className="pt-0.5 text-[14px] leading-snug text-muted">
            {state === "needs-install"
              ? "На iPhone известията работят, след като добавите ОгнеЩит на началния екран."
              : state === "denied"
                ? "Известията са спрени в настройките на браузъра. Разрешете ги там, за да ги включите."
                : "Сутрин, ако опасността е висока или по-голяма, и ако спътник засече огън до 25 км."}
          </p>
          {err && <p className="pt-1 text-[14px] text-ember">{err}</p>}
        </div>
      </div>
      {(state === "off" || state === "on") && (
        <div className="mt-3 flex flex-wrap gap-2">
          {state === "off" ? (
            <button onClick={enable} disabled={busy} className="pressable min-h-11 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content disabled:opacity-60">
              Включи за {place().label}
            </button>
          ) : (
            <>
              <button onClick={enable} disabled={busy} className="pressable min-h-11 rounded-full bg-line px-4 text-[15px] font-semibold disabled:opacity-60">
                Смени на {place().label}
              </button>
              <button onClick={disable} disabled={busy} className="pressable min-h-11 rounded-full px-4 text-[15px] font-medium text-muted hover:bg-line/60 disabled:opacity-60">
                Изключи
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
