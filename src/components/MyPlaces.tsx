"use client";

import { Star, X } from "lucide-react";
import { dangerByKey } from "@/lib/danger";
import { oblastAt } from "@/lib/oblast";
import { samePlace, useJson, useLocation, usePlaces, type Loc } from "@/lib/client";
import type { RiskResponse } from "@/lib/risk";

/** Saves the current place, or removes it. GPS positions are saved under their oblast's name. */
export function SavePlaceButton() {
  const { loc } = useLocation();
  const { has, add, remove, full } = usePlaces();
  const saved = has(loc);
  const label = loc.source === "gps" ? `област ${(oblastAt(loc.lat, loc.lon)?.name ?? "").replace(/ (град|област)$/, "")}` : loc.label;
  if (!saved && full) return null;
  return (
    <button
      onClick={() => (saved ? remove(loc) : add({ ...loc, label, source: "place" }))}
      aria-pressed={saved}
      aria-label={saved ? `Премахни ${label} от моите места` : `Запази ${label} в моите места`}
      className="pressable grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-line/60 aria-pressed:text-[var(--d-moderate)]"
    >
      <Star size={21} strokeWidth={1.9} fill={saved ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}

function PlaceChip({ place, active, onPick, onRemove }: { place: Loc; active: boolean; onPick: () => void; onRemove?: () => void }) {
  const risk = useJson<RiskResponse>(`/api/risk?lat=${place.lat.toFixed(3)}&lon=${place.lon.toFixed(3)}`);
  const d = risk.data ? dangerByKey(risk.data.today.danger) : null;
  return (
    <li className="relative shrink-0">
      <button
        onClick={onPick}
        aria-pressed={active}
        className={`pressable flex min-h-12 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-left ${active ? "bg-tonal" : "bg-card"}`}
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold tabular-nums"
          style={d ? { background: d.color, color: d.onColor } : { background: "var(--line)" }}
          aria-hidden
        >
          {d ? d.index + 1 : ""}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="max-w-[9rem] truncate text-[15px] font-semibold">{place.label}</span>
          <span className="text-[12px] text-muted">{d ? d.label : "…"}</span>
        </span>
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Премахни ${place.label}`}
          className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-content text-surface after:absolute after:-inset-2"
        >
          <X size={13} strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </li>
  );
}

/** Today's danger for every saved place at a glance; tapping one switches the forecast to it. */
export function MyPlaces() {
  const { loc, setLoc } = useLocation();
  const { places } = usePlaces();
  if (places.length === 0) return null;
  return (
    <section aria-labelledby="places-title" className="enter">
      <h2 id="places-title" className="px-1 font-display text-[20px] font-semibold">
        Моите места
      </h2>
      <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 pt-1">
        {places.map((p) => (
          <PlaceChip key={`${p.lat},${p.lon}`} place={p} active={loc.source === "place" && samePlace(p, loc)} onPick={() => setLoc(p)} />
        ))}
      </ul>
    </section>
  );
}

/** The same places inside the place picker, with a way to remove them. */
export function MyPlacesEdit({ onPick }: { onPick: (l: Loc) => void }) {
  const { loc } = useLocation();
  const { places, remove } = usePlaces();
  if (places.length === 0) return null;
  return (
    <div className="pt-5">
      <p className="px-1 pb-2 text-[14px] font-medium text-muted">Моите места</p>
      <ul className="-mx-5 flex flex-wrap gap-2 px-5 pt-1">
        {places.map((p) => (
          <PlaceChip key={`${p.lat},${p.lon}`} place={p} active={samePlace(p, loc)} onPick={() => onPick(p)} onRemove={() => remove(p)} />
        ))}
      </ul>
    </div>
  );
}
