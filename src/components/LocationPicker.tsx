"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { Check, ChevronDown, LocateFixed, MapPin } from "lucide-react";
import { PLACES } from "@/data/places";
import { useLocation } from "@/lib/client";

export function LocationPicker() {
  const { loc, setLoc, requestGps, locating, gpsError } = useLocation();
  const [open, setOpen] = useState(false);
  // Close the sheet once a new position arrives (GPS or a picked oblast).
  const key = `${loc.lat},${loc.lon}`;
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setOpen(false);
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger
        className="pressable -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[15px] font-medium text-content"
        aria-label={`Местоположение: ${loc.label}. Смени`}
      >
        {loc.source === "gps" ? <LocateFixed size={18} strokeWidth={1.75} aria-hidden /> : <MapPin size={18} strokeWidth={1.75} aria-hidden />}
        <span>{loc.source === "gps" ? "Моето местоположение" : loc.label}</span>
        <ChevronDown size={16} strokeWidth={1.75} className="text-muted" aria-hidden />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-xl flex-col rounded-t-[28px] bg-card outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden />
          <Drawer.Title className="px-5 pt-4 font-display text-xl font-semibold">Къде сте?</Drawer.Title>
          <Drawer.Description className="px-5 pt-1 text-[15px] text-muted">
            Използваме го само за прогнозата и близките пожари. Не го пазим на сървъра.
          </Drawer.Description>

          <div className="px-5 pt-4">
            <button
              onClick={requestGps}
              disabled={locating}
              className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content disabled:opacity-60"
            >
              <LocateFixed size={20} strokeWidth={2} aria-hidden />
              {locating ? "Търсим…" : "Използвай моето местоположение"}
            </button>
            {gpsError && (
              <p role="alert" className="pt-2 text-[14px] text-ember">
                {gpsError}
              </p>
            )}
          </div>

          <p className="px-5 pb-1 pt-5 text-[13px] font-medium text-muted">Или изберете област</p>
          <ul className="overflow-y-auto px-2 pb-4">
            {PLACES.map((p) => {
              const selected = loc.source === "place" && loc.label === p.name;
              return (
                <li key={p.name}>
                  <Drawer.Close asChild>
                    <button
                      onClick={() => setLoc({ ...p, label: p.name, source: "place" })}
                      className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-[16px] active:bg-line"
                    >
                      {p.name}
                      {selected && <Check size={20} strokeWidth={2} className="text-accent" aria-label="Избрано" />}
                    </button>
                  </Drawer.Close>
                </li>
              );
            })}
          </ul>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
