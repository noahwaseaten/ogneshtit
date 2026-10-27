import { iconResponse } from "@/lib/icon";

const VARIANTS: Record<string, [number, number]> = {
  "192": [192, 0.08],
  "512": [512, 0.08],
  maskable: [512, 0.2],
  apple: [180, 0.1],
};

export async function GET(_req: Request, ctx: RouteContext<"/app-icon/[variant]">) {
  const v = VARIANTS[(await ctx.params).variant];
  if (!v) return new Response("Not found", { status: 404 });
  return iconResponse(v[0], v[1]);
}
