import type { Metadata } from "next";
import { PageCard } from "@/lib/discord";
import { MapView } from "@/components/MapView";

export const metadata: Metadata = {
  title: "Карта",
  description: "Огън, засечен от спътник през последните 48 часа, опасността днес по области и изгорялата гора тази година.",
};

export default function Karta() {
  return (
    <>
      <PageCard title="Карта на пожарите" body="Огън, засечен от спътник през последните 48 часа, опасността днес по области и изгорялата гора тази година." path="/karta" />
      <MapView />
    </>
  );
}
