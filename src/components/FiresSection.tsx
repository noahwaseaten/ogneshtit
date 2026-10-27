"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Phone, Navigation, Satellite, Info } from "lucide-react";
import { useJson, timeAgo, type Loc } from "@/lib/client";
import { distanceKm } from "@/lib/geo";
import type { FiresResponse, Hotspot } from "@/lib/fires";

const FireMap = dynamic(() => import("./FireMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-[320px] rounded-[20px]" />,
});

const NEAR_KM = 50;
const CONF = { high: "висока", nominal: "средна", low: "ниска" } as const;

type WithDist = Hotspot & { km: number };

export function FiresSection({ loc }: { loc: Loc }) {
  const { data, error, loading, offline, retry } = useJson<FiresResponse>("/api/fires");
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<WithDist | null>(null);

  const all = useMemo<WithDist[]>(
    () =>
      (data?.hotspots ?? [])
        .map((h) => ({ ...h, km: distanceKm(loc.lat, loc.lon, h.lat, h.lon) }))
        .sort((a, b) => a.km - b.km),
    [data, loc.lat, loc.lon],
  );
  const near = all.filter((h) => h.km <= NEAR_KM);

  return (
    <section aria-labelledby="fires-title" className="enter">
      <div className="flex items-end justify-between gap-3 px-1">
        <h2 id="fires-title" className="font-display text-[20px] font-semibold">
          Възможни пожари
        </h2>
        {/* Segmented control: map for overview, list for screen readers and slow phones. */}
        <div role="group" aria-label="Изглед" className="flex rounded-full bg-line p-1 text-[14px] font-medium">
          {(["map", "list"] as const).map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`min-h-9 rounded-full px-3.5 transition-colors duration-150 ${
                view === v ? "bg-card text-content shadow-[var(--shadow)]" : "text-muted"
              }`}
            >
              {v === "map" ? "Карта" : "Списък"}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="px-1 pt-2 text-[15px] leading-snug tabular-nums">
          {near.length === 0 ? (
            <>
              Няма засечени огнища в радиус {NEAR_KM} км от{" "}
              {loc.source === "gps" ? "вас" : loc.label} за последните {data.hours} ч.
            </>
          ) : (
            <>
              <span className="font-semibold text-ember">
                {near.length} {near.length === 1 ? "огнище" : "огнища"}
              </span>{" "}
              до {NEAR_KM} км от {loc.source === "gps" ? "вас" : loc.label}.
            </>
          )}{" "}
          <span className="text-muted">
            В цялата страна: {all.length} за {data.hours} ч.
          </span>
        </p>
      )}

      <div className="pt-3">
        {!data && loading && <div className="skeleton h-[320px] rounded-[20px]" />}
        {!data && !loading && (
          <div className="rounded-[20px] bg-card p-5 shadow-[var(--shadow)]">
            <p className="text-[15px]">{error}</p>
            <button onClick={retry} className="pressable mt-3 min-h-11 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content">
              Опитай отново
            </button>
          </div>
        )}
        {data &&
          (view === "map" ? (
            <FireMap hotspots={all} center={loc} onSelect={(h) => setSelected(h as WithDist)} />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow)]">
              {all.length === 0 && <li className="p-4 text-[15px] text-muted">Няма засечени огнища.</li>}
              {all.slice(0, 40).map((h) => (
                <li key={`${h.lat},${h.lon},${h.time}`}>
                  <button
                    onClick={() => setSelected(h)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left active:bg-line"
                  >
                    <span>
                      <span className="block text-[16px] font-medium tabular-nums">
                        {Math.round(h.km)} км {h.km <= NEAR_KM && <span className="text-ember">· наблизо</span>}
                      </span>
                      <span className="block text-[13px] text-muted">
                        {timeAgo(h.time)} · сигурност {CONF[h.confidence]}
                      </span>
                    </span>
                    <Info size={20} strokeWidth={1.5} className="shrink-0 text-muted" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <p className="flex gap-2 px-1 pt-3 text-[13px] leading-snug text-muted">
        <Satellite size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Точките са топлинни аномалии от спътниците VIIRS (NASA FIRMS). Освен горски пожари те засичат и
          палене на стърнища, сметища и заводи — затова пишем „възможен“.
          {offline && <span className="font-medium text-ember"> Без връзка — показваме последните запазени данни.</span>}
        </span>
      </p>

      <HotspotSheet h={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function HotspotSheet({ h, onClose }: { h: WithDist | null; onClose: () => void }) {
  const coords = h ? `${h.lat.toFixed(5)}, ${h.lon.toFixed(5)}` : "";
  return (
    <Drawer.Root open={!!h} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-[28px] bg-card px-5 pb-5 outline-none"
          style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" aria-hidden />
          {h && (
            <>
              <Drawer.Title className="pt-4 font-display text-[22px] font-semibold">Възможен пожар</Drawer.Title>
              <Drawer.Description className="pt-1 text-[15px] text-muted">
                Засечен {timeAgo(h.time)}, на {Math.round(h.km)} км от избраното място.
              </Drawer.Description>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[15px] tabular-nums">
                <div>
                  <dt className="text-[13px] text-muted">Сигурност</dt>
                  <dd className="font-medium capitalize">{CONF[h.confidence]}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">Сила (FRP)</dt>
                  <dd className="font-medium">{h.frp.toLocaleString("bg-BG", { maximumFractionDigits: 1 })} MW</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">Час</dt>
                  <dd className="font-medium">
                    {new Date(h.time).toLocaleString("bg-BG", {
                      timeZone: "Europe/Sofia",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">Координати</dt>
                  <dd className="font-medium">{coords}</dd>
                </div>
              </dl>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line text-[15px] font-semibold"
                >
                  <Navigation size={18} strokeWidth={2} aria-hidden />
                  Покажи на карта
                </a>
                <a
                  href="tel:112"
                  className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#c7361f] text-[15px] font-semibold text-white"
                >
                  <Phone size={18} strokeWidth={2} aria-hidden />
                  Обади се на 112
                </a>
              </div>
              <p className="pt-3 text-[13px] leading-snug text-muted">
                Обаждайте се, ако виждате дим или огън на място. Спътниковата точка сама по себе си не е потвърден пожар.
              </p>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
