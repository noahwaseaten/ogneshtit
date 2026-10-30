import { connection } from "next/server";
import { textFor } from "@shtit/core/i18n/server";
import { getDanube } from "@/lib/danube";

/** Measured Danube levels and the level forecast, from АППД. */
export async function GET(req: Request) {
  await connection();
  try {
    return Response.json(await getDanube());
  } catch (e) {
    console.error("danube failed", e);
    return Response.json({ error: textFor(req)("Нивата на Дунав не са достъпни в момента.", "Danube levels aren't available right now.") }, { status: 502 });
  }
}
