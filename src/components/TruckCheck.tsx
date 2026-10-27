"use client";

import { useState } from "react";
import { Search, CheckCircle2, AlertTriangle, XCircle, ChevronRight, ExternalLink, MapPin, Phone } from "lucide-react";
import { nf, sofiaTime, timeAgoLong, useJson } from "@/lib/client";
import type { TicketDetail, TicketSearch, TicketSummary } from "@/lib/iag";
import { Sheet } from "./Sheet";
import { telOf, useNearestRdg } from "./rdg";

const LOOKALIKE: Record<string, string> = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", У: "Y", Х: "X" };
const norm = (s: string) => s.toUpperCase().replace(/[АВЕКМНОРСТУХ]/g, (c) => LOOKALIKE[c] ?? c).replace(/[^A-Z0-9]/g, "");
/** CB1234AP → CB 1234 AP, the way it is written on the plate. */
const pretty = (p: string) => p.replace(/^([A-Z]{1,2})(\d{4})([A-Z]{1,2})$/, "$1 $2 $3");
const when = (iso: string) => sofiaTime(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const until = (iso: string) => new Date(new Date(iso).getTime() + 12 * 3600 * 1000).toISOString();

export function TruckCheck() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketSummary | null>(null);
  const res = useJson<TicketSearch>(query ? `/api/ticket?plate=${encodeURIComponent(query)}` : null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = norm(input);
    if (q.length < 4) return;
    setChosen(null);
    setQuery(q);
  };

  const d = res.data;
  const exact = d ? d.plates.find((p) => p.plate === (chosen ?? d.query)) : undefined;

  return (
    <section aria-labelledby="truck-title" className="rounded-[20px] bg-card p-5 lg:p-6">
      <div>
        <h2 id="truck-title" className="font-display text-[22px] font-semibold leading-tight">
          Камион с дървесина?
        </h2>
      </div>
      <p className="pt-2 text-[16px] leading-snug">
        Всеки камион, който кара дърва или трупи, трябва да има превозен билет, издаден до 12 часа по-рано. Въведете
        номера и ще го проверим в регистъра на Изпълнителната агенция по горите.
      </p>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Регистрационен номер на камиона или ремаркето</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="СА 1234 АВ"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={12}
            className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 font-display text-[20px] font-semibold uppercase tracking-wide outline-none placeholder:font-sans placeholder:text-[16px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={norm(input).length < 4 || res.loading}
          className="pressable inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content disabled:opacity-50"
        >
          <Search size={18} strokeWidth={2.25} aria-hidden />
          Провери
        </button>
      </form>
      <p className="pt-2 text-[13px] text-muted">Проверяваме и номера на камиона, и на ремаркето.</p>

      <div aria-live="polite">
        {res.loading && <div className="skeleton mt-4 h-24 rounded-2xl" aria-label="Проверяваме" />}
        {!res.loading && res.error && <p className="mt-4 rounded-2xl bg-line/60 p-4 text-[15px]">{res.error}</p>}
        {d && !res.loading && (
          <div className="enter mt-4">
            {d.plates.length === 0 ? (
              <Verdict tone="bad" title={`Няма билети за ${pretty(d.query)}`} text="В регистъра няма превозни билети за този номер през последните 3 месеца." />
            ) : exact ? (
              <PlateResult plate={exact.plate} tickets={exact.tickets} onOpen={setTicket} />
            ) : (
              <div>
                <p className="text-[16px] font-semibold">Кой от тези номера е?</p>
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
                  {d.plates.slice(0, 8).map((p) => (
                    <li key={p.plate}>
                      <button
                        onClick={() => setChosen(p.plate)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-line/50 active:bg-line"
                      >
                        <span>
                          <span className="block font-display text-[18px] font-semibold tracking-wide">{pretty(p.plate)}</span>
                          <span className="block text-[13px] text-muted">Последен билет {timeAgoLong(p.tickets[0].issued)}</span>
                        </span>
                        <ChevronRight size={20} strokeWidth={1.75} className="text-muted" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <TicketSheet ticket={ticket} onClose={() => setTicket(null)} />
    </section>
  );
}

function PlateResult({ plate, tickets, onOpen }: { plate: string; tickets: TicketSummary[]; onOpen: (t: TicketSummary) => void }) {
  const valid = tickets.find((t) => t.validNow);
  const last = tickets[0];
  return (
    <div className="flex flex-col gap-4">
      {valid ? (
        <Verdict
          tone="good"
          title={`${pretty(plate)} има валиден билет`}
          text={`Издаден ${when(valid.issued)} от ${valid.unit}. Важи до ${when(until(valid.issued))}. Сравнете товара с описанието в билета.`}
        />
      ) : (
        <Verdict
          tone="warn"
          title={`${pretty(plate)} няма валиден билет в момента`}
          text={`Последният билет е от ${when(last.issued)}, ${timeAgoLong(last.issued)}. Ако камионът е натоварен с дървесина сега, това е нарушение. Празен камион не се нуждае от билет.`}
        />
      )}
      <div>
        <p className="px-1 text-[13px] font-medium text-muted">Последни билети</p>
        <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
          {tickets.slice(0, 4).map((t) => (
            <li key={t.id}>
              <button onClick={() => onOpen(t)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-line/50 active:bg-line">
                <span className="min-w-0">
                  <span className="block text-[16px] font-medium tabular-nums">
                    {when(t.issued)}
                    {t.validNow && <span className="text-[var(--d-low)]"> · валиден</span>}
                  </span>
                  <span className="block truncate text-[13px] text-muted tabular-nums">
                    {t.unit} · {nf(t.m3, 1)} м³
                  </span>
                </span>
                <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {!valid && <ReportActions />}
    </div>
  );
}

function ReportActions() {
  const rdg = useNearestRdg();
  const tel = rdg?.phone ? telOf(rdg.phone) : "";
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-[15px] font-semibold">Как да сигнализирате</p>
      <p className="pt-1 text-[14px] leading-snug text-muted">
        Запишете номера, мястото и часа. Снимайте товара, ако е безопасно. Регионалната дирекция по горите
        отговаря в работно време, 112 по всяко време.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a href="tel:112" className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#c7361f] px-3 text-[15px] font-semibold text-white">
          <Phone size={18} strokeWidth={2} aria-hidden />
          Звънни на 112
        </a>
        {tel && rdg && (
          <a
            href={`tel:${tel}`}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-3 text-center text-[15px] font-semibold leading-tight"
          >
            <Phone size={18} strokeWidth={2} aria-hidden className="shrink-0" />
            {rdg.name}
          </a>
        )}
      </div>
    </div>
  );
}

function Verdict({ tone, title, text }: { tone: "good" | "warn" | "bad"; title: string; text: string }) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "warn" ? AlertTriangle : XCircle;
  const color = tone === "good" ? "var(--d-low)" : tone === "warn" ? "var(--d-high)" : "var(--d-veryhigh)";
  return (
    <div className="flex gap-3 rounded-2xl p-4" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}>
      <Icon size={26} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color }} aria-hidden />
      <div>
        <p className="text-[17px] font-semibold leading-snug">{title}</p>
        <p className="pt-1 text-[15px] leading-snug">{text}</p>
      </div>
    </div>
  );
}

function TicketSheet({ ticket, onClose }: { ticket: TicketSummary | null; onClose: () => void }) {
  const det = useJson<TicketDetail>(ticket ? `/api/ticket/${ticket.type}/${ticket.id}` : null);
  const t = det.data;
  return (
    <Sheet
      open={!!ticket}
      onClose={onClose}
      title="Превозен билет"
      description={ticket ? `№ ${ticket.number}, издаден ${when(ticket.issued)}` : undefined}
    >
      {det.loading && <div className="skeleton h-48 rounded-2xl" />}
      {det.error && !t && <p className="text-[15px]">{det.error}</p>}
      {t && ticket && (
        <div className="flex flex-col gap-5">
          <dl className="grid gap-x-4 gap-y-3 text-[15px]">
            <Row label="Важи до" value={when(until(t.issued))} />
            <Row label="Издаден от" value={t.unit} />
            {t.document && <Row label="Документ" value={t.document} />}
            {t.from && <Row label="Откъде" value={t.from} />}
            {t.to && <Row label="Накъде" value={t.to} />}
            {t.export && <Row label="Износ за" value={t.export} />}
            <Row label="Камион / ремарке" value={[ticket.vehicle, ticket.trailer].filter(Boolean).map(pretty).join(" / ")} />
          </dl>

          <div>
            <p className="text-[13px] font-medium text-muted">Какво трябва да вози</p>
            <ul className="mt-1.5 divide-y divide-line rounded-2xl bg-surface">
              {t.wood.map((w, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium first-letter:uppercase">{w.species}</span>
                    <span className="block text-[13px] text-muted">
                      {w.kind}
                      {w.count > 1 ? `, ${nf(w.count)} бр.` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{nf(w.m3, 2)} м³</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between px-4 py-2.5">
                <span className="text-[15px] font-semibold">Общо</span>
                <span className="text-[15px] font-bold tabular-nums">{nf(t.totalM3, 2)} м³</span>
              </li>
            </ul>
          </div>

          {t.photos.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-muted">Снимки на товара при издаване</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {t.photos.map((src, i) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote register photos, shown as-is */}
                    <img src={src} alt={`Снимка ${i + 1} на товара`} loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {t.issuedAt && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${t.issuedAt.lat},${t.issuedAt.lon}`}
                target="_blank"
                rel="noreferrer"
                className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line text-[15px] font-semibold"
              >
                <MapPin size={18} strokeWidth={2} aria-hidden />
                Къде е издаден
              </a>
            )}
            <a
              href={`https://www.iag.bg/tickets/lang/1/ticket?ticket_id=${ticket.id}&type=${ticket.type}`}
              target="_blank"
              rel="noreferrer"
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-medium text-accent"
            >
              Отвори в регистъра на ИАГ
              <ExternalLink size={16} strokeWidth={2} aria-hidden />
            </a>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
