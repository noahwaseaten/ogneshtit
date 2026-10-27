"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Axe, Camera, LocateFixed, Mail, Phone, Send, X, ExternalLink, Check } from "lucide-react";
import { sofiaTime, useLocation } from "@/lib/client";
import { nearestRdg, telOf, useRdgs } from "./rdg";

const KINDS = ["Сеч без марки или позволително", "Извозване на дървесина", "Бракониерство", "Палене на огън", "Отпадъци в гората", "Друго"];

type Photo = { file: File; url: string };

/**
 * Prepares a report and hands it to the person's own phone apps (share sheet, e-mail, call).
 * Nothing is sent or stored by ОгнеЩит itself.
 */
export function ReportForm() {
  const [kind, setKind] = useState(KINDS[0]);
  const [pos, setPos] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState(false);
  const [place, setPlace] = useState("");
  const [plate, setPlate] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [rdgId, setRdgId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const rdgs = useRdgs();
  const { loc } = useLocation();

  // Closest directorate to the reported spot, or to the place chosen on the home screen.
  const at = pos ?? loc;
  const auto = useMemo(() => nearestRdg(rdgs, at.lat, at.lon), [rdgs, at.lat, at.lon]);
  const rdg = rdgs?.find((r) => r.id === rdgId) ?? auto;

  // Free the photo previews when the form goes away.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // Photos shared into the app from the gallery (see the share target in public/sw.js).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const n = Number(sp.get("shared") ?? 0);
    const text = sp.get("text");
    if (!n && !text) return;
    (async () => {
      if (text) setDesc(text);
      if (n && "caches" in window) {
        const cache = await caches.open("ogneshtit-shared");
        const files: Photo[] = [];
        for (let i = 0; i < n; i++) {
          const res = await cache.match(`/shared/${i}`);
          if (!res) continue;
          const blob = await res.blob();
          const file = new File([blob], decodeURIComponent(res.headers.get("x-name") ?? `photo-${i}.jpg`), { type: blob.type });
          files.push({ file, url: URL.createObjectURL(file) });
          await cache.delete(`/shared/${i}`);
        }
        setPhotos(files);
      }
      window.history.replaceState(null, "", window.location.pathname);
    })();
  }, []);

  const locate = () => {
    if (!("geolocation" in navigator)) return setLocErr(true);
    setLocating(true);
    setLocErr(false);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy });
        setLocating(false);
      },
      () => {
        setLocErr(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  // Composed when sent, so "Кога" is the moment of sending.
  const compose = () => [
    `Сигнал: ${kind}`,
    `Кога: ${sofiaTime(new Date().toISOString(), { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    pos && `Координати: ${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)} (точност около ${Math.round(pos.acc)} м)`,
    pos && `Карта: https://www.google.com/maps/search/?api=1&query=${pos.lat.toFixed(5)},${pos.lon.toFixed(5)}`,
    place.trim() && `Място: ${place.trim()}`,
    plate.trim() && `Превозно средство: ${plate.trim().toUpperCase()}`,
    desc.trim() && `Описание: ${desc.trim()}`,
    photos.length > 0 && `Снимки: ${photos.length}`,
    "",
    "Подготвено с ОгнеЩит",
  ]
    .filter((l) => l !== false && l !== null && l !== undefined)
    .join("\n");
  const subject = `Сигнал: ${kind.toLowerCase()}${place.trim() ? `, ${place.trim()}` : ""}`;
  const ready = !!pos || place.trim().length > 2;

  const canShareFiles = typeof navigator !== "undefined" && "canShare" in navigator && photos.length > 0 && navigator.canShare({ files: photos.map((p) => p.file) });

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: subject, text: compose(), ...(canShareFiles ? { files: photos.map((p) => p.file) } : {}) });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    await copy();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(compose());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const field = "w-full rounded-2xl border border-line bg-surface px-4 text-[16px] outline-none placeholder:text-muted focus:border-accent";

  return (
    <section aria-labelledby="report-title" className="rounded-[28px] bg-card p-5 shadow-[var(--shadow)] lg:p-6">
      <div className="flex items-center gap-3">
        <Axe size={26} strokeWidth={1.5} aria-hidden />
        <h2 id="report-title" className="font-display text-[22px] font-semibold leading-tight">
          Незаконна сеч или бракониерство?
        </h2>
      </div>
      <p className="pt-2 text-[16px] leading-snug">
        Подгответе сигнала тук и го изпратете до регионалната дирекция по горите с имейл, съобщение или обаждане.
        ОгнеЩит не изпраща и не пази нищо сам.
      </p>
      <p className="pt-2 text-[14px] font-medium text-ember">Ако сечта или пожарът е в момента, звъннете на 112.</p>

      <fieldset className="mt-5">
        <legend className="text-[15px] font-semibold">Какво видяхте?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label
              key={k}
              className={`pressable inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3.5 text-[15px] font-medium transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                kind === k ? "border-content bg-content text-surface" : "border-line hover:bg-line/50"
              }`}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {k}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <p className="text-[15px] font-semibold">Къде?</p>
        {pos ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 pl-4">
            <div className="min-w-0">
              <p className="font-display text-[18px] font-semibold tabular-nums">
                {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
              </p>
              <p className="text-[13px] text-muted tabular-nums">Точност около {Math.round(pos.acc)} м</p>
            </div>
            <button onClick={() => setPos(null)} className="pressable grid size-11 shrink-0 place-items-center rounded-full hover:bg-line" aria-label="Махни координатите">
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            onClick={locate}
            disabled={locating}
            className="pressable mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold disabled:opacity-60"
          >
            <LocateFixed size={20} strokeWidth={2} aria-hidden />
            {locating ? "Търсим сигнал от GPS…" : "Добави точните ми координати"}
          </button>
        )}
        {locErr && <p className="pt-2 text-[14px] text-ember">Няма достъп до местоположението. Опишете мястото по-долу.</p>}
        <label className="mt-2 block">
          <span className="sr-only">Описание на мястото</span>
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Най-близкото село, път или местност" className={`${field} min-h-12`} />
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[15px] font-semibold">Номер на превозно средство</span>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="Ако има"
            autoCapitalize="characters"
            autoComplete="off"
            className={`${field} mt-2 min-h-12 uppercase placeholder:normal-case`}
          />
        </label>
        <div>
          <span className="text-[15px] font-semibold">Снимки</span>
          <label className="pressable mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
            <Camera size={20} strokeWidth={2} aria-hidden />
            Добави снимки
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].slice(0, 6 - photos.length);
                setPhotos((p) => [...p, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photos.map((p, i) => (
            <li key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file */}
              <img src={p.url} alt={`Снимка ${i + 1}`} className="aspect-square w-full rounded-xl object-cover outline outline-1 -outline-offset-1 outline-black/10" />
              <button
                onClick={() => {
                  URL.revokeObjectURL(p.url);
                  setPhotos((ps) => ps.filter((x) => x !== p));
                }}
                className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-black/60 text-white after:absolute after:-inset-1.5"
                aria-label={`Махни снимка ${i + 1}`}
              >
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-5 block">
        <span className="text-[15px] font-semibold">Какво се случва?</span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="Например: режат дъбове без боядисани марки, около 10 дървета, има трактор"
          className={`${field} mt-2 py-3 leading-snug`}
        />
      </label>

      <div className="mt-6 rounded-2xl bg-surface p-4">
        <p className="text-[13px] font-medium text-muted">Изпращате до</p>
        {rdgs ? (
          <label className="mt-1 block">
            <span className="sr-only">Регионална дирекция по горите</span>
            <select
              value={rdg?.id ?? ""}
              onChange={(e) => setRdgId(Number(e.target.value))}
              className="min-h-11 w-full rounded-xl bg-transparent text-[17px] font-semibold outline-none"
            >
              {!rdg && <option value="">Изберете регионална дирекция</option>}
              {rdgs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="skeleton mt-1 h-8 rounded-lg" />
        )}
        {rdg && (
          <p className="pt-1 text-[13px] text-muted">
            {auto?.id === rdg.id ? (pos ? "Най-близката до мястото на сигнала. " : `Най-близката до ${loc.source === "gps" ? "вас" : loc.label}. `) : ""}
            {rdg.phone && <>Телефон {rdg.phone} в работно време. </>}
            {rdg.email}
          </p>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={share}
            disabled={!ready}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content disabled:opacity-50"
          >
            {copied ? <Check size={18} strokeWidth={2.25} aria-hidden /> : <Send size={18} strokeWidth={2} aria-hidden />}
            {copied ? "Текстът е копиран" : canShareFiles ? "Изпрати със снимките" : "Изпрати"}
          </button>
          {rdg?.email && (
            <button
              onClick={() => {
                window.location.href = `mailto:${rdg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compose())}`;
              }}
              disabled={!ready}
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold disabled:opacity-50"
            >
              <Mail size={18} strokeWidth={2} aria-hidden />
              Имейл до {rdg.name}
            </button>
          )}
          {rdg?.phone && (
            <a
              href={`tel:${telOf(rdg.phone)}`}
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold"
            >
              <Phone size={18} strokeWidth={2} aria-hidden />
              Обади се в {rdg.name}
            </a>
          )}
          <a
            href="https://app.gorata.bg/new-report"
            target="_blank"
            rel="noreferrer"
            onClick={() => ready && copy()}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-medium text-accent"
          >
            Подай в „Защити гората“
            <ExternalLink size={16} strokeWidth={2} aria-hidden />
          </a>
        </div>
        {!ready && <p className="pt-2 text-[13px] text-muted">Добавете координати или опишете мястото, за да изпратите.</p>}
        {photos.length > 0 && !canShareFiles && (
          <p className="pt-2 text-[13px] text-muted">При имейл прикачете снимките ръчно: браузърът не може да ги добави сам.</p>
        )}
      </div>
    </section>
  );
}
