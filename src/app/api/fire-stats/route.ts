import { textFor } from "@/i18n/server";
import { connection, type NextRequest } from "next/server";
import { FIRST_YEAR, getFireStats } from "@/lib/iag";

export async function GET(req: NextRequest) {
  await connection();
  const now = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric" }).format(new Date()));
  const year = Number(req.nextUrl.searchParams.get("year") ?? now);
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > now) {
    return Response.json({ error: textFor(req)(`Има данни от ${FIRST_YEAR} до ${now} г.`, `Data is available from ${FIRST_YEAR} to ${now}.`) }, { status: 400 });
  }
  try {
    return Response.json(await getFireStats(year));
  } catch (e) {
    console.error("fire stats failed", e);
    return Response.json({ error: textFor(req)("Регистърът на ИАГ не отговаря в момента.", "The forest agency's register isn't responding right now.") }, { status: 502 });
  }
}
