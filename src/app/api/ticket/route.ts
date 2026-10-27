import { connection, type NextRequest } from "next/server";
import { normPlate, searchTickets } from "@/lib/iag";

export async function GET(req: NextRequest) {
  await connection();
  const plate = normPlate(req.nextUrl.searchParams.get("plate") ?? "");
  if (plate.length < 4 || plate.length > 10 || !/\d{2}/.test(plate)) {
    return Response.json({ error: "Въведете регистрационния номер, например СА 1234 АВ." }, { status: 400 });
  }
  try {
    return Response.json(await searchTickets(plate));
  } catch {
    return Response.json({ error: "Регистърът на ИАГ не отговаря в момента. Опитайте след минута." }, { status: 502 });
  }
}
