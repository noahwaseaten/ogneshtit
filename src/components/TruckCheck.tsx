"use client";

import { useState } from "react";
import { Search, CheckCircle2, AlertTriangle, XCircle, ChevronRight, ExternalLink, MapPin, Phone } from "lucide-react";
import { useJson } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { placeName } from "@/i18n/names";
import type { TicketDetail, TicketSearch, TicketSummary } from "@/lib/iag";
import { Sheet } from "./Sheet";
import { telOf, useNearestRdg } from "./rdg";

const LOOKALIKE: Record<string, string> = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", У: "Y", Х: "X" };
const norm = (s: string) => s.toUpperCase().replace(/[АВЕКМНОРСТУХ]/g, (c) => LOOKALIKE[c] ?? c).replace(/[^A-Z0-9]/g, "");
/** CB1234AP → CB 1234 AP, the way it is written on the plate. */
const pretty = (p: string) => p.replace(/^([A-Z]{1,2})(\d{4})([A-Z]{1,2})$/, "$1 $2 $3");
/** "25 окт., 11:08" in the current language. */
function useWhen() {
  const { time } = useI18n();
  return (iso: string) => time(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
const until = (iso: string) => new Date(new Date(iso).getTime() + 12 * 3600 * 1000).toISOString();

export function TruckCheck() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketSummary | null>(null);
  const res = useJson<TicketSearch>(query ? `/api/ticket?plate=${encodeURIComponent(query)}` : null);
  const { t, agoLong } = useI18n();

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
          {t("Камион с дървесина?", "A timber truck?")}
        </h2>
      </div>
      <p className="pt-2 text-[16px] leading-snug">
        {t(
          "Всеки камион, който кара дърва или трупи, трябва да има превозен билет, издаден до 12 часа по-рано. Въведете номера и ще го проверим в регистъра на Изпълнителната агенция по горите.",
          "Every truck carrying firewood or logs in Bulgaria needs a transport ticket issued within the last 12 hours. Enter the plate and we'll check it in the Executive Forest Agency's register.",
        )}
      </p>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("Регистрационен номер на камиона или ремаркето", "Number plate of the truck or trailer")}</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder={t("СА 1234 АВ", "CA 1234 AB")}
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
          {t("Провери", "Check")}
        </button>
      </form>
      <p className="pt-2 text-[13px] text-muted">{t("Проверяваме и номера на камиона, и на ремаркето.", "We check both the truck's and the trailer's plate.")}</p>

      <div aria-live="polite">
        {res.loading && <div className="skeleton mt-4 h-24 rounded-2xl" aria-label={t("Проверяваме", "Checking")} />}
        {!res.loading && res.error && <p className="mt-4 rounded-2xl bg-line/60 p-4 text-[15px]">{res.error}</p>}
        {d && !res.loading && (
          <div className="enter mt-4">
            {d.plates.length === 0 ? (
              <Verdict
                tone="bad"
                title={t(`Няма билети за ${pretty(d.query)}`, `No tickets for ${pretty(d.query)}`)}
                text={t("В регистъра няма превозни билети за този номер през последните 3 месеца.", "The register has no transport tickets for this plate in the last 3 months.")}
              />
            ) : exact ? (
              <PlateResult plate={exact.plate} tickets={exact.tickets} onOpen={setTicket} />
            ) : (
              <div>
                <p className="text-[16px] font-semibold">{t("Кой от тези номера е?", "Which of these plates is it?")}</p>
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
                  {d.plates.slice(0, 8).map((p) => (
                    <li key={p.plate}>
                      <button
                        onClick={() => setChosen(p.plate)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-line/50 active:bg-line"
                      >
                        <span>
                          <span className="block font-display text-[18px] font-semibold tracking-wide">{pretty(p.plate)}</span>
                          <span className="block text-[13px] text-muted">{t(`Последен билет ${agoLong(p.tickets[0].issued)}`, `Last ticket ${agoLong(p.tickets[0].issued)}`)}</span>
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
  const valid = tickets.find((x) => x.validNow);
  const last = tickets[0];
  const { t, lang, nf, agoLong } = useI18n();
  const when = useWhen();
  return (
    <div className="flex flex-col gap-4">
      {valid ? (
        <Verdict
          tone="good"
          title={t(`${pretty(plate)} има валиден билет`, `${pretty(plate)} has a valid ticket`)}
          text={t(
            `Издаден ${when(valid.issued)} от ${valid.unit}. Важи до ${when(until(valid.issued))}. Сравнете товара с описанието в билета.`,
            `Issued ${when(valid.issued)} by ${placeName(valid.unit, lang)}. Valid until ${when(until(valid.issued))}. Compare the load with the ticket.`,
          )}
        />
      ) : (
        <Verdict
          tone="warn"
          title={t(`${pretty(plate)} няма валиден билет в момента`, `${pretty(plate)} has no valid ticket right now`)}
          text={t(
            `Последният билет е от ${when(last.issued)}, ${agoLong(last.issued)}. Ако камионът е натоварен с дървесина сега, това е нарушение. Празен камион не се нуждае от билет.`,
            `The last ticket is from ${when(last.issued)}, ${agoLong(last.issued)}. If the truck is loaded with timber now, that's a violation. An empty truck doesn't need a ticket.`,
          )}
        />
      )}
      <div>
        <p className="px-1 text-[13px] font-medium text-muted">{t("Последни билети", "Recent tickets")}</p>
        <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
          {tickets.slice(0, 4).map((tk) => (
            <li key={tk.id}>
              <button onClick={() => onOpen(tk)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-line/50 active:bg-line">
                <span className="min-w-0">
                  <span className="block text-[16px] font-medium tabular-nums">
                    {when(tk.issued)}
                    {tk.validNow && <span className="text-[var(--d-low)]"> · {t("валиден", "valid")}</span>}
                  </span>
                  <span className="block truncate text-[13px] text-muted tabular-nums">
                    {placeName(tk.unit, lang)} · {nf(tk.m3, 1)} {t("м³", "m³")}
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
  const { t, lang } = useI18n();
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-[15px] font-semibold">{t("Как да сигнализирате", "How to report it")}</p>
      <p className="pt-1 text-[14px] leading-snug text-muted">
        {t(
          "Запишете номера, мястото и часа. Снимайте товара, ако е безопасно. Регионалната дирекция по горите отговаря в работно време, 112 по всяко време.",
          "Note the plate, the place and the time. Photograph the load if it's safe. The regional forest directorate answers in office hours, 112 at any time. Both may only speak Bulgarian.",
        )}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a href="tel:112" className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#c7361f] px-3 text-[15px] font-semibold text-white">
          <Phone size={18} strokeWidth={2} aria-hidden />
          {t("Звънни на 112", "Call 112")}
        </a>
        {tel && rdg && (
          <a
            href={`tel:${tel}`}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-3 text-center text-[15px] font-semibold leading-tight"
          >
            <Phone size={18} strokeWidth={2} aria-hidden className="shrink-0" />
            {placeName(rdg.name, lang)}
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
  const tk = det.data;
  const { t: tr, lang, nf } = useI18n();
  const when = useWhen();
  return (
    <Sheet
      open={!!ticket}
      onClose={onClose}
      title={tr("Превозен билет", "Transport ticket")}
      description={ticket ? tr(`№ ${ticket.number}, издаден ${when(ticket.issued)}`, `No. ${ticket.number}, issued ${when(ticket.issued)}`) : undefined}
    >
      {det.loading && <div className="skeleton h-48 rounded-2xl" />}
      {det.error && !tk && <p className="text-[15px]">{det.error}</p>}
      {tk && ticket && (
        <div className="flex flex-col gap-5">
          <dl className="grid gap-x-4 gap-y-3 text-[15px]">
            <Row label={tr("Важи до", "Valid until")} value={when(until(tk.issued))} />
            <Row label={tr("Издаден от", "Issued by")} value={placeName(tk.unit, lang)} />
            {tk.document && <Row label={tr("Документ", "Document")} value={tk.document} />}
            {tk.from && <Row label={tr("Откъде", "From")} value={tk.from} />}
            {tk.to && <Row label={tr("Накъде", "To")} value={tk.to} />}
            {tk.export && <Row label={tr("Износ за", "Export to")} value={tk.export} />}
            <Row label={tr("Камион / ремарке", "Truck / trailer")} value={[ticket.vehicle, ticket.trailer].filter(Boolean).map(pretty).join(" / ")} />
          </dl>

          <div>
            <p className="text-[13px] font-medium text-muted">{tr("Какво трябва да вози", "What it should be carrying")}</p>
            <ul className="mt-1.5 divide-y divide-line rounded-2xl bg-surface">
              {tk.wood.map((w, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium first-letter:uppercase">{w.species}</span>
                    <span className="block text-[13px] text-muted">
                      {w.kind}
                      {w.count > 1 ? `, ${nf(w.count)} ${tr("бр.", "pcs")}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{nf(w.m3, 2)} {tr("м³", "m³")}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between px-4 py-2.5">
                <span className="text-[15px] font-semibold">{tr("Общо", "Total")}</span>
                <span className="text-[15px] font-bold tabular-nums">
                  {nf(tk.totalM3, 2)} {tr("м³", "m³")}
                </span>
              </li>
            </ul>
          </div>

          {tk.photos.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-muted">{tr("Снимки на товара при издаване", "Photos of the load when issued")}</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {tk.photos.map((src, i) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote register photos, shown as-is */}
                    <img src={src} alt={tr(`Снимка ${i + 1} на товара`, `Photo ${i + 1} of the load`)} loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {tk.issuedAt && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${tk.issuedAt.lat},${tk.issuedAt.lon}`}
                target="_blank"
                rel="noreferrer"
                className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line text-[15px] font-semibold"
              >
                <MapPin size={18} strokeWidth={2} aria-hidden />
                {tr("Къде е издаден", "Where it was issued")}
              </a>
            )}
            <a
              href={`https://www.iag.bg/tickets/lang/1/ticket?ticket_id=${ticket.id}&type=${ticket.type}`}
              target="_blank"
              rel="noreferrer"
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-medium text-accent"
            >
              {tr("Отвори в регистъра на ИАГ", "Open in the agency's register")}
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
