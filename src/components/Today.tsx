"use client";

import { useLocation, useJson } from "@/lib/client";
import type { RiskResponse } from "@/lib/risk";
import { LocationPicker } from "./LocationPicker";
import { RiskCard, Forecast } from "./RiskCard";
import { FiresSection } from "./FiresSection";
import { HistoryChart } from "./HistoryChart";

export function Today() {
  const { loc } = useLocation();
  const risk = useJson<RiskResponse>(`/api/risk?lat=${loc.lat.toFixed(3)}&lon=${loc.lon.toFixed(3)}`);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <LocationPicker />
        <h1 className="sr-only">Гората днес — опасност от пожар</h1>
      </header>
      <RiskCard
        data={risk.data}
        loading={risk.loading}
        error={risk.error}
        offline={risk.offline}
        onRetry={risk.retry}
      />
      {risk.data && risk.data.forecast.length > 0 && <Forecast data={risk.data} />}
      <FiresSection loc={loc} />
      <HistoryChart />
    </div>
  );
}
