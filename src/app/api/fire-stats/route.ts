import { connection, type NextRequest } from "next/server";
import { FIRST_YEAR, getFireStats } from "@/lib/iag";

export async function GET(req: NextRequest) {
  await connection();
  const now = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric" }).format(new Date()));
  const year = Number(req.nextUrl.searchParams.get("year") ?? now);
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > now) {
    return Response.json({ error: `Има данни от ${FIRST_YEAR} до ${now} г.` }, { status: 400 });
  }
  try {
    return Response.json(await getFireStats(year));
  } catch {
    return Response.json({ error: "Регистърът на ИАГ не отговаря в момента." }, { status: 502 });
  }
}
