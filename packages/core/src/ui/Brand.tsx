"use client";

import { createContext, useContext } from "react";
import { BRANDS, type AppId } from "../brand";

const BrandContext = createContext<AppId>("fire");

/** Set once in each app's root layout, so shared components know which app they are in. */
export function BrandProvider({ app, children }: { app: AppId; children: React.ReactNode }) {
  return <BrandContext.Provider value={app}>{children}</BrandContext.Provider>;
}

export const useBrand = () => BRANDS[useContext(BrandContext)];
