"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, ChevronRight, X } from "lucide-react";
import { useLocation } from "@/lib/client";
import { oblastAt } from "@/lib/oblast";
import type { Prefs } from "@/lib/alerts";
import { useInstall } from "./Install";
import { Segmented as Pills, SettingsGroup } from "./Settings";
import { useI18n } from "@/i18n/client";
import { placeName } from "@/i18n/names";
import { SETTINGS } from "./Shell";

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

// The home page card can be hidden for good; the settings page always shows it.
const HIDE = "ogneshtit:alerts-hidden";
const hideListeners = new Set<() => void>();
function readHidden() {
  try {
    return localStorage.getItem(HIDE) === "1";
  } catch {
    return false;
  }
}
function hideCard() {
  try {
    localStorage.setItem(HIDE, "1");
  } catch {}
  hideListeners.forEach((l) => l());
}
function useHidden() {
  return useSyncExternalStore(
    (cb) => {
      hideListeners.add(cb);
      return () => hideListeners.delete(cb);
    },
    readHidden,
    () => true,
  );
}

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

/** The app's pill segmented control for one preference. */
function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <Pills label={label} value={value} options={options.map(([v, text]) => ({ value: v, label: text }))} onChange={onChange} />;
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
  const hidden = useHidden();
  const { t, lang } = useI18n();

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
    return { lat: loc.lat, lon: loc.lon, label: o ? `област ${o.name.replace(/ (град|област)$/, "")}` : "Тук" };
  };

  const save = async (next: Prefs, subscribe = false) => {
    setBusy(true);
    setNote(null);
    try {
      if (subscribe && (await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const p = place();
      const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), place: p, prefs: next, lang }) });
      if (!res.ok) throw new Error();
      const s = { label: p.label, prefs: next };
      localStorage.setItem(STORE, JSON.stringify(s));
      setSaved(s);
      setPrefs(next);
      setState("on");
    } catch {
      setNote(t("Не успяхме да запазим. Опитайте пак.", "We couldn't save that. Try again."));
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
    setNote(
      res.ok
        ? t("Изпратихме пробно известие. Трябва да се появи до няколко секунди.", "We sent a test alert. It should appear within a few seconds.")
        : body.error ?? t("Не успяхме да изпратим.", "We couldn't send it."),
    );
  };

  if (state === "loading" || state === "unsupported" || (help && hidden)) return null;
  const here = placeName(place().label, lang);
  const savedLabel = saved ? placeName(saved.label, lang) : here;
  const moved = state === "on" && saved && saved.label !== place().label;

  return (
    <Frame help={help} title={t("Известия", "Alerts")}>
      <div className={`relative bg-card p-4 ${help ? "rounded-[20px]" : ""}`}>
        {help && (
          <button
            onClick={hideCard}
            aria-label={t("Скрий от началната страница", "Hide from the home screen")}
            title={t("Скрий. Известията остават в Настройки.", "Hide. Alerts stay in Settings.")}
            className="pressable absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full text-muted hover:bg-line/60"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        )}
        <div className="flex items-start gap-3">
          {state === "on" ? (
            <Bell size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          ) : (
            <BellOff size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-[16px] font-semibold ${help ? "pr-8" : ""}`}>{state === "on" ? t(`Известия за ${savedLabel}`, `Alerts for ${savedLabel}`) : t("Известия при опасност", "Danger alerts")}</p>
            <p className="pt-0.5 text-[14px] leading-snug text-muted">
              {state === "needs-install"
                ? t("На iPhone известията работят, след като добавите ОгнеЩит на началния екран.", "On iPhone, alerts work once you add Fire Shield to your Home Screen.")
                : state === "denied"
                  ? t("Известията са спрени за този сайт в настройките на браузъра. Разрешете ги там.", "Notifications are blocked for this site in your browser settings. Allow them there.")
                  : state === "on"
                    ? t("Пишем ви само при опасност или нов огън наблизо, никога през нощта.", "We only message you about danger or a new fire nearby, never at night.")
                    : t(
                        "Само когато опасността е висока, има нов огън наблизо или оранжев код. Никога през нощта.",
                        "Only when the danger is high, a new fire is spotted nearby or there's an orange warning. Never at night.",
                      )}
            </p>
          </div>
        </div>

        {state === "off" && (
          <button
            onClick={() => save(prefs, true)}
            disabled={busy}
            className="pressable mt-3 flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content disabled:opacity-60"
          >
            {t(`Включи за ${here}`, `Turn on for ${here}`)}
          </button>
        )}

        {state === "on" && !help && (
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] font-medium">{t("Опасност от пожар", "Fire danger")}</p>
              <Segmented
                label={t("Опасност от пожар", "Fire danger")}
                value={prefs.danger}
                options={[
                  ["off", t("Не", "Off")],
                  ["high", t("От висока", "High+")],
                  ["veryhigh", t("От много висока", "Very high+")],
                ]}
                onChange={(v) => save({ ...prefs, danger: v })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] font-medium">{t("Нов огън от спътник", "New fire seen by satellite")}</p>
              <Segmented
                label={t("Нов огън от спътник", "New fire seen by satellite")}
                value={prefs.firesKm}
                options={[
                  [0, t("Не", "Off")],
                  [10, t("10 км", "10 km")],
                  [25, t("25 км", "25 km")],
                  [50, t("50 км", "50 km")],
                ]}
                onChange={(v) => save({ ...prefs, firesKm: v })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] font-medium">{t("Оранжев и червен код на НИМХ", "Orange and red weather warnings")}</p>
              <Segmented
                label={t("Предупреждения на НИМХ", "Weather warnings")}
                value={prefs.warnings ? "on" : "off"}
                options={[
                  ["off", t("Не", "Off")],
                  ["on", t("Да", "On")],
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
                {t(`Смени на ${here}`, `Switch to ${here}`)}
              </button>
            )}
            {!help && (
              <button onClick={test} className="pressable min-h-11 rounded-full bg-line px-4 text-[15px] font-semibold">
                {t("Пробно известие", "Send a test")}
              </button>
            )}
            {!help && (
              <button onClick={disable} disabled={busy} className="pressable min-h-11 rounded-full px-4 text-[15px] font-medium text-muted hover:bg-line/60 disabled:opacity-60">
                {t("Изключи", "Turn off")}
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
          <Link
            href={state === "needs-install" ? `${SETTINGS}#install` : `${SETTINGS}#izvestiya`}
            className="mt-1 inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-accent"
          >
            {state === "needs-install" ? t("Как да го добавя", "How to add it") : state === "on" ? t("Настройки на известията", "Alert settings") : t("Как работят", "How they work")}
            <ChevronRight size={16} strokeWidth={2} aria-hidden />
          </Link>
        )}
      </div>
    </Frame>
  );
}

/** On the home screen the card stands alone; in Settings it is a group with a section label. */
function Frame({ help, title, children }: { help: boolean; title: string; children: React.ReactNode }) {
  if (help) return <section aria-label={title}>{children}</section>;
  return (
    <SettingsGroup id="izvestiya" title={title}>
      {children}
    </SettingsGroup>
  );
}
