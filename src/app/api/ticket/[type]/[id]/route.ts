import { connection } from "next/server";
import { getTicket } from "@/lib/iag";

export async function GET(_req: Request, ctx: RouteContext<"/api/ticket/[type]/[id]">) {
  await connection();
  const { type, id } = await ctx.params;
  if (!/^[a-z0-9]{1,12}$/i.test(type) || !/^\d{1,12}$/.test(id)) {
    return Response.json({ error: "Невалиден билет." }, { status: 400 });
  }
  try {
    return Response.json(await getTicket(type, id));
  } catch (e) {
    console.error("ticket detail failed", e);
    return Response.json({ error: "Не успяхме да заредим билета от ИАГ." }, { status: 502 });
  }
}
