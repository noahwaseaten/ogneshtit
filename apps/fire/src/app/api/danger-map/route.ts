import { textFor } from "@shtit/core/i18n/server";
import { connection } from "next/server";
import { getDangerMap } from "@/lib/risk";

export async function GET(req: Request) {
  await connection();
  try {
    return Response.json(await getDangerMap());
  } catch (e) {
    console.error("danger map failed", e);
    return Response.json({ error: textFor(req)("Метеоданните не са достъпни в момента.", "The weather data isn't available right now.") }, { status: 502 });
  }
}
