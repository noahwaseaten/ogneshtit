"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

// Building blocks for the Settings screen, in the app's own style: a section heading, one card with
// rows split by hairlines, and the same pill segmented control used elsewhere (theme, alerts).

export function SettingsGroup({ id, title, note, children }: { id?: string; title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={title} className="flex scroll-mt-20 flex-col gap-2">
      <h2 className="px-1 text-[17px] font-semibold">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">{children}</div>
      {note && <p className="px-1 text-[14px] leading-snug text-muted">{note}</p>}
    </section>
  );
}

const rowCls = "flex min-h-12 items-center gap-3 px-4 py-3";

/** One line: title (and an optional muted line under it) on the left, a value or control on the right. */
export function SettingsRow({
  icon,
  title,
  subtitle,
  trailing,
  below,
  href,
  external,
}: {
  /** Only for rows where the icon helps recognise the action (call, GitHub). */
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  /** A full-width control under the title, such as a segmented control. */
  below?: React.ReactNode;
  href?: string;
  external?: boolean;
}) {
  const main = (
    <>
      {icon && <span className="grid size-6 shrink-0 place-items-center text-content [&_svg]:size-5">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium leading-snug">{title}</span>
        {subtitle && <span className="block pt-0.5 text-[14px] leading-snug text-muted">{subtitle}</span>}
      </span>
      {href ? (
        <span className="flex shrink-0 items-center gap-1.5 text-[14px] text-muted">
          {trailing}
          {external ? <ArrowUpRight size={16} strokeWidth={2} aria-hidden /> : <ChevronRight size={18} strokeWidth={2} aria-hidden />}
        </span>
      ) : (
        trailing
      )}
    </>
  );

  if (!href)
    return below ? (
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center gap-3">{main}</div>
        {below}
      </div>
    ) : (
      <div className={rowCls}>{main}</div>
    );

  const linkCls = `${rowCls} hover-fill`;
  if (external || href.startsWith("tel:"))
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={linkCls}>
        {main}
      </a>
    );
  return (
    <Link href={href} className={linkCls}>
      {main}
    </Link>
  );
}

/**
 * A whole-row on/off switch (the row is the 44 px+ target). Track and knob follow the app's tokens; only
 * transform and background colour animate, and the on state is also shown by the knob's position.
 */
export function SettingsToggle({ icon, title, subtitle, checked, onChange }: { icon?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`${rowCls} hover-fill w-full text-left`}>
      {icon && <span className="grid size-6 shrink-0 place-items-center text-content [&_svg]:size-5">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium leading-snug">{title}</span>
        {subtitle && <span className="block pt-0.5 text-[14px] leading-[1.4] text-muted">{subtitle}</span>}
      </span>
      <span
        className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
        style={{ background: checked ? "var(--accent)" : "var(--line)", boxShadow: checked ? "none" : "inset 0 0 0 1px var(--line)" }}
        aria-hidden
      >
        <span
          className="absolute left-0.5 top-0.5 size-[27px] rounded-full bg-white transition-transform duration-200 [transition-timing-function:var(--ease-out)]"
          style={{ transform: checked ? "translateX(20px)" : "none", boxShadow: "0 1px 3px oklch(0 0 0 / 0.25)" }}
        />
      </span>
    </button>
  );
}

/** The app's pill segmented control (same look as the theme switch in the sidebar). */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid rounded-full bg-line p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full px-2 text-[14px] font-semibold transition-colors duration-150 ${
            value === o.value ? "bg-tonal text-content" : "text-muted hover:text-content"
          }`}
        >
          {o.icon}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** GitHub's mark (lucide no longer ships brand icons). */
export function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
