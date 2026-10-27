"use client";

import dynamic from "next/dynamic";

export const LossMapLazy = dynamic(() => import("./LossMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-[min(62dvh,560px)] rounded-[20px]" />,
});
