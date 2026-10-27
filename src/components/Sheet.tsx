"use client";

import { Drawer } from "vaul";
import { X } from "lucide-react";
import { useMedia } from "@/lib/client";
import { useI18n } from "@/i18n/client";

/**
 * Bottom sheet on phones (with a grabber, swipe to close), side panel on wide screens.
 * Title and description are required so screen readers announce what opened.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const wide = useMedia("(min-width: 1024px)");
  const { t } = useI18n();
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} direction={wide ? "right" : "bottom"}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className={
            wide
              ? "fixed inset-y-3 right-3 z-50 flex w-[420px] flex-col overflow-hidden rounded-[20px] bg-card shadow-2xl outline-none"
              : "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] max-w-xl flex-col rounded-t-[28px] bg-card outline-none"
          }
          style={wide ? undefined : { paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {!wide && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden />}
          <div className="flex items-start gap-3 px-5 pt-4">
            <div className="min-w-0 flex-1">
              <Drawer.Title className="font-display text-[22px] font-semibold leading-tight">{title}</Drawer.Title>
              {description && <Drawer.Description className="pt-1 text-[15px] leading-snug text-muted">{description}</Drawer.Description>}
            </div>
            <Drawer.Close
              className="pressable hover-fill -mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-muted"
              aria-label={t("Затвори", "Close")}
            >
              <X size={20} strokeWidth={2} aria-hidden />
            </Drawer.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
