import { textFor } from "@/i18n/server";
import { connection } from "next/server";
import { getTicket } from "@/lib/iag";

export async function GET(req: Request, ctx: RouteContext<"/api/ticket/[type]/[id]">) {
  await connection();
  const { type, id } = await ctx.params;
  if (!/^[a-z0-9]{1,12}$/i.test(type) || !/^\d{1,12}$/.test(id)) {
    return Response.json({ error: textFor(req)("Невалиден билет.", "Invalid ticket.") }, { status: 400 });
  }
  try {
    return Response.json(await getTicket(type, id));
  } catch (e) {
    console.error("ticket detail failed", e);
    return Response.json({ error: textFor(req)("Не успяхме да заредим билета от ИАГ.", "We couldn't load the ticket from the forest agency.") }, { status: 502 });
  }
}
