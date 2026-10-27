import type { Metadata } from "next";
import { Suspense } from "react";
import { OpenShared } from "./OpenShared";
import { getRisk } from "@/lib/risk";
import { dangerByKey } from "@/lib/danger";
import { DANGER_HEX } from "@/lib/og";
import { DiscordCard, buttons, image, text } from "@/lib/discord";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

function read(p: Record<string, string | undefined>) {
  const name = (p.n ?? "").slice(0, 40);
  const lat = Number(p.lat);
  const lon = Number(p.lon);
  const ok = lat > 40 && lat < 45.5 && lon > 21 && lon < 30;
  const q = new URLSearchParams({ lat: p.lat ?? "", lon: p.lon ?? "", n: name }).toString();
  return { name, lat, lon, ok, q };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { name, q } = read(await searchParams);
  const title = `Опасност от пожар днес${name ? `, ${name}` : ""}`;
  return {
    title,
    description: "Колко лесно пламва и се разраства горски пожар днес. Прогноза за 5 дни в ОгнеЩит.",
    openGraph: { title, images: [{ url: `/s/og?${q}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [`/s/og?${q}`] },
    robots: { index: false },
  };
}

/** Discord card for a shared place: today's level, what it means, the forecast image and links. */
async function SharedCard({ searchParams }: Props) {
  const { name, lat, lon, ok, q } = read(await searchParams);
  if (!ok) return null;
  const r = (x: number) => Math.round(x * 100) / 100;
  let risk;
  try {
    risk = await getRisk(r(lat), r(lon));
  } catch {
    return null; // Discord then uses the Open Graph tags.
  }
  const d = dangerByKey(risk.today.danger);
  const place = name || "България";
  return (
    <DiscordCard
      accent={DANGER_HEX[d.key]}
      components={[
        text(`-# ОгнеЩит · опасност от горски пожар днес\n## ${place}: ${d.label.toLowerCase()}\n${d.meaning}`),
        image(`/s/og?${q}`, `Опасност от пожар днес и следващите 5 дни, ${place}`),
        text(`**Какво да направите:** ${d.advice}`),
        buttons(["Отвори прогнозата", `/s?${q}`], ["Карта на пожарите", "/karta"]),
      ]}
    />
  );
}

export default function Shared(props: Props) {
  return (
    <>
      <Suspense>
        <SharedCard {...props} />
      </Suspense>
      <Suspense fallback={<div className="skeleton h-[300px] rounded-[20px]" />}>
        <OpenShared />
      </Suspense>
    </>
  );
}
