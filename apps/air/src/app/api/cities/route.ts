import { connection } from "next/server";
import { textFor } from "@shtit/core/i18n/server";
import { getCities } from "@/lib/air";

/** The air now and today's worst band in every oblast centre (CAMS). */
export async function GET(req: Request) {
  await connection();
  try {
    return Response.json(await getCities());
  } catch (e) {
    console.error("cities failed", e);
    return Response.json({ error: textFor(req)("Прогнозата за градовете не е достъпна.", "The city forecast isn't available.") }, { status: 502 });
  }
}
