import { iconResponse } from "@shtit/core/icon";

export async function GET(_req: Request, ctx: RouteContext<"/app-icon/[variant]">) {
  return iconResponse("hub", (await ctx.params).variant);
}
