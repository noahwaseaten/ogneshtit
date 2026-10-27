"use client";

import Link from "next/link";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Building blocks for the Settings screen, after Material 3 Expressive: a coloured section label,
// rows grouped into one rounded surface split by thin gaps (big outer corners, small inner ones),
// a tonal shape behind each icon, and connected button groups whose selected button morphs into
// a full pill.

export function SettingsGroup({
  id,
  title,
  note,
  children,
}: {
  id?: string;
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-20">
      <h2 className="px-4 pb-2 text-[14px] font-semibold tracking-[0.01em] text-accent">{title}</h2>
      <div className="flex flex-col gap-[3px] overflow-hidden rounded-[28px] [&>*]:rounded-[6px]">{children}</div>
      {note && <p className="px-4 pt-2 text-[14px] leading-snug text-muted">{note}</p>}
    </section>
  );
}

type RowProps = {
  icon?: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Control on the right (a switch, a value). Ignored when the row is a link. */
  trailing?: React.ReactNode;
  /** Below the text: a full-width control such as a button group. */
  below?: React.ReactNode;
  href?: string;
  external?: boolean;
};

export function SettingsRow({ icon: Icon, title, subtitle, trailing, below, href, external }: RowProps) {
  const body = (
    <>
      <div className="flex items-center gap-4">
        {Icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-tonal text-accent" aria-hidden>
            <Icon size={20} strokeWidth={2} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-medium leading-snug">{title}</span>
          {subtitle && <span className="block pt-0.5 text-[14px] leading-snug text-muted">{subtitle}</span>}
        </span>
        {href ? (
          external ? (
            <ArrowUpRight size={18} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
          ) : (
            <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
          )
        ) : (
          trailing
        )}
      </div>
      {below && <div className="pt-3">{below}</div>}
    </>
  );
  const cls = "block bg-card px-4 py-3.5 min-h-16";
  if (!href) return <div className={cls}>{body}</div>;
  if (external || href.startsWith("tel:"))
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={`${cls} transition-colors duration-150 hover:bg-line/50 active:bg-line`}>
        {body}
      </a>
    );
  return (
    <Link href={href} className={`${cls} transition-colors duration-150 hover:bg-line/50 active:bg-line`}>
      {body}
    </Link>
  );
}

/**
 * Connected button group (M3 Expressive): neighbours sit 2 px apart with small inner corners, and
 * the selected one becomes a full pill in the accent colour. The corner change animates.
 */
export function ButtonGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode; icon?: LucideIcon; ariaLabel?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-[2px]">
      {options.map((o, i) => {
        const on = o.value === value;
        const first = i === 0;
        const last = i === options.length - 1;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={`pressable flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-[14px] font-semibold transition-[border-radius,background-color,color] duration-300 ease-[var(--ease-out)] ${
              on
                ? "rounded-full bg-accent text-accent-content"
                : `bg-line text-content hover:bg-line/70 ${first ? "rounded-l-full rounded-r-[8px]" : last ? "rounded-r-full rounded-l-[8px]" : "rounded-[8px]"}`
            }`}
          >
            {o.icon && <o.icon size={17} strokeWidth={2} aria-hidden className="shrink-0" />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
