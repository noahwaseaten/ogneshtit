"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocation } from "@/lib/client";

/** A shared link opens the app on that place's forecast. */
export function OpenShared() {
  const sp = useSearchParams();
  const router = useRouter();
  const { setLoc } = useLocation();
  useEffect(() => {
    const lat = Number(sp.get("lat"));
    const lon = Number(sp.get("lon"));
    const n = sp.get("n");
    if (lat > 40 && lat < 45.5 && lon > 21 && lon < 30 && n) setLoc({ lat, lon, label: n, source: "place" });
    router.replace("/");
  }, [sp, router, setLoc]);
  return <div className="skeleton h-[300px] rounded-[20px]" aria-label="Отваряме прогнозата" />;
}
