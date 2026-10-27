"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Chrome/Edge/Android fire `beforeinstallprompt`; we keep it and show our own button.
let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    subs.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    subs.forEach((f) => f());
  });
}

export function useInstall() {
  const canPrompt = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => !!deferred,
    () => false,
  );
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(display-mode: standalone)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once on the device
    setStandalone(m.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    deferred = null;
    subs.forEach((f) => f());
  };
  return { canPrompt, standalone, ios, install };
}

export function InstallButton({ compact }: { compact?: boolean }) {
  const { canPrompt, install } = useInstall();
  if (!canPrompt) return null;
  return compact ? (
    <button onClick={install} aria-label="Инсталирай приложението" className="pressable grid size-11 place-items-center rounded-full text-accent hover:bg-line/60">
      <Download size={21} strokeWidth={2} aria-hidden />
    </button>
  ) : (
    <button onClick={install} className="pressable flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-accent-content">
      <Download size={18} strokeWidth={2} aria-hidden />
      Инсталирай
    </button>
  );
}
