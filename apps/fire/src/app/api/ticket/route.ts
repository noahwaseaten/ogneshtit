import { textFor } from "@shtit/core/i18n/server";
import { connection, type NextRequest } from "next/server";
import { normPlate, searchTickets } from "@/lib/iag";

export async function GET(req: NextRequest) {
  await connection();
  const plate = normPlate(req.nextUrl.searchParams.get("plate") ?? "");
  if (plate.length < 4 || plate.length > 10 || !/\d{2}/.test(plate)) {
    return Response.json({ error: textFor(req)("Въведете регистрационния номер, например СА 1234 АВ.", "Enter the number plate, for example CA 1234 AB.") }, { status: 400 });
  }
  try {
    return Response.json(await searchTickets(plate));
  } catch (e) {
    console.error("ticket search failed", e);
    return Response.json({ error: textFor(req)("Регистърът на ИАГ не отговаря в момента. Опитайте след минута.", "The forest agency's register isn't responding right now. Try again in a minute.") }, { status: 502 });
  }
}
