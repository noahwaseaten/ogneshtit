import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] font-medium text-accent hover:bg-line/60">
      <ChevronLeft size={20} strokeWidth={2} aria-hidden />
      {label}
    </Link>
  );
}
