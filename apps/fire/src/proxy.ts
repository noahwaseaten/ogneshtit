import type { NextRequest } from "next/server";
import { BRANDS } from "@shtit/core/brand";
import { langRewrite, movedRedirect } from "@shtit/core/proxy";

// Language rewrite for every page (see packages/core/src/proxy.ts), and the move from ogneshtit.noahwaseaten.com
// to the new address once MOVED_FROM is set in Vercel.
export function proxy(req: NextRequest) {
  return movedRedirect(req, BRANDS.fire.url) ?? langRewrite(req);
}

export const config = {
  matcher: ["/((?!_next/|share-target).*)"],
};
