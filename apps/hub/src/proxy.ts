import type { NextRequest } from "next/server";
import { langRewrite } from "@shtit/core/proxy";

// Language rewrite for every page (see packages/core/src/proxy.ts).
export function proxy(req: NextRequest) {
  return langRewrite(req);
}

export const config = {
  matcher: ["/((?!api/|_next/|app-icon/).*)"],
};
