import type { Metadata } from "next";
import { Suspense } from "react";
import { OpenShared } from "./OpenShared";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams;
  const name = (p.n ?? "").slice(0, 40);
  const q = new URLSearchParams({ lat: p.lat ?? "", lon: p.lon ?? "", n: name }).toString();
  const title = `Опасност от пожар днес${name ? `, ${name}` : ""}`;
  return {
    title,
    description: "Колко лесно пламва и се разраства горски пожар днес. Прогноза за 5 дни в ОгнеЩит.",
    openGraph: { title, images: [{ url: `/s/og?${q}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [`/s/og?${q}`] },
    robots: { index: false },
  };
}

export default function Shared() {
  return (
    <Suspense fallback={<div className="skeleton h-[300px] rounded-[28px]" />}>
      <OpenShared />
    </Suspense>
  );
}
