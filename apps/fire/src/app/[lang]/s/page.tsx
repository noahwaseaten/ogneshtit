import type { Metadata } from "next";
import { Suspense } from "react";
import { OpenShared } from "./OpenShared";
import { getRisk } from "@/lib/risk";
import { dangerByKey } from "@/lib/danger";
import { DANGER_HEX } from "@/lib/share-image";
import { DiscordCard, buttons, image } from "@/lib/discord";
import { langFrom, pick, type Lang } from "@shtit/core/i18n/lang";
import { APP_NAME } from "@/brand";
import { placeName } from "@shtit/core/i18n/names";

type Props = PageProps<"/[lang]/s">;
type Search = Record<string, string | string[] | undefined>;

function read(p: Search) {
  const one = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const name = one("n").slice(0, 40);
  const lat = Number(one("lat"));
  const lon = Number(one("lon"));
  const ok = lat > 40 && lat < 45.5 && lon > 21 && lon < 30;
  const q = new URLSearchParams({ lat: one("lat"), lon: one("lon"), n: name }).toString();
  return { name, lat, lon, ok, q };
}

/** The share image always uses the language the link was shared in, wherever the crawler is. */
const imageOf = (lang: Lang, q: string) => `/${lang}/s/og?${q}`;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const lang = await langFrom(params);
  const t = pick(lang);
  const { name, q } = read(await searchParams);
  const place = name ? placeName(name, lang) : "";
  const title = t(`Опасност от пожар днес${place ? `, ${place}` : ""}`, `Fire danger today${place ? `, ${place}` : ""}`);
  return {
    title,
    description: t(
      `Колко лесно пламва и се разраства горски пожар днес. Прогноза за 5 дни в ${APP_NAME.bg}.`,
      `How easily a forest fire would start and spread today. A 5-day forecast in ${APP_NAME.en}.`,
    ),
    openGraph: { title, images: [{ url: imageOf(lang, q), width: 1200, height: 520 }] },
    twitter: { card: "summary_large_image", title, images: [imageOf(lang, q)] },
    robots: { index: false },
  };
}

/** Discord card for a shared place: the image with today's level, in the danger colour, and two links. */
async function SharedCard({ params, searchParams }: Props) {
  const lang = await langFrom(params);
  const t = pick(lang);
  const { lat, lon, ok, q } = read(await searchParams);
  if (!ok) return null;
  const r = (x: number) => Math.round(x * 100) / 100;
  let risk;
  try {
    risk = await getRisk(r(lat), r(lon));
  } catch {
    return null; // Discord then uses the Open Graph tags.
  }
  const d = dangerByKey(risk.today.danger);
  return (
    <DiscordCard
      accent={DANGER_HEX[d.key]}
      components={[image(imageOf(lang, q)), buttons([t("Отвори прогнозата", "Open the forecast"), `/s?${q}`], [t("Карта на пожарите", "Fire map"), "/karta"])]}
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
