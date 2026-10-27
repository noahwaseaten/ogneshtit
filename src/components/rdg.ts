"use client";

import { useMemo } from "react";
import { useJson, useLocation } from "@/lib/client";
import { distanceKm } from "@/lib/geo";
import type { Rdg } from "@/lib/iag";

/**
 * The regional forest directorate whose town is closest to a point (the chosen place by default).
 * Directorate areas do not follow oblast borders exactly, so this is a good first guess, not a rule.
 */
export function useRdgs() {
  return useJson<{ rdgs: Rdg[] }>("/api/rdg").data?.rdgs ?? null;
}

export function nearestRdg(rdgs: Rdg[] | null, lat: number, lon: number) {
  if (!rdgs?.length) return null;
  return [...rdgs].sort((a, b) => distanceKm(lat, lon, a.lat, a.lon) - distanceKm(lat, lon, b.lat, b.lon))[0];
}

export function useNearestRdg(at?: { lat: number; lon: number } | null) {
  const { loc } = useLocation();
  const rdgs = useRdgs();
  const p = at ?? loc;
  return useMemo(() => nearestRdg(rdgs, p.lat, p.lon), [rdgs, p.lat, p.lon]);
}
