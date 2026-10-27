import type { Metadata } from "next";
import { MapView } from "@/components/MapView";

export const metadata: Metadata = {
  title: "Карта",
  description: "Огън, засечен от спътник през последните 48 часа, опасността днес по области и изгорялата гора тази година.",
};

export default function Karta() {
  return <MapView />;
}
