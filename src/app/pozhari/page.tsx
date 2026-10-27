import type { Metadata } from "next";
import { FireStats } from "@/components/FireStats";

export const metadata: Metadata = {
  title: "Пожари по области",
  description: "Колко горски пожара е имало във всяка област на България, колко гора е изгоряла и защо. Данни на ИАГ от 2007 г. насам.",
};

export default function Pozhari() {
  return <FireStats />;
}
