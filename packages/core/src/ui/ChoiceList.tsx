"use client";

import { Check, type LucideIcon } from "lucide-react";

/**
 * Pick one, as an inset grouped list (the iOS pattern): a row per option with an icon, a short title and an optional
 * line under it, and a checkmark on the chosen one. Rows never wrap into pills, every row is a 44 px+ target, and the
 * choice is a real radio group for screen readers.
 */
export function ChoiceList<T extends string>({
  label,
  value,
  options,
  onChange,
  onCard = true,
}: {
  label: string;
  value: T;
  options: { value: T; title: string; subtitle?: string; Icon: LucideIcon }[];
  onChange: (v: T) => void;
  /** Sitting on a card or sheet (the list is a shade darker) or straight on the page (the list is a card). */
  onCard?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`divide-y divide-line overflow-hidden rounded-2xl ${onCard ? "bg-surface" : "bg-card"}`}>
      {options.map(({ value: v, title, subtitle, Icon }) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className="hover-fill flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left"
          >
            <span className={`grid size-8 shrink-0 place-items-center rounded-[10px] ${on ? "bg-accent text-accent-content" : "bg-line text-content"}`}>
              <Icon size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[16px] leading-snug ${on ? "font-semibold" : "font-medium"}`}>{title}</span>
              {subtitle && <span className="block text-[13px] leading-snug text-muted">{subtitle}</span>}
            </span>
            <Check size={20} strokeWidth={2.5} aria-hidden className={`swap shrink-0 text-accent`} data-hidden={!on} />
          </button>
        );
      })}
    </div>
  );
}
