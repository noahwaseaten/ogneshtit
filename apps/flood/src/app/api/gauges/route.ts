import { connection } from "next/server";
import { textFor } from "@shtit/core/i18n/server";
import { getGauges } from "@/lib/floods";

/** Today's state of every river point: level, 15-day peak, flow against normal and trend. */
export async function GET(req: Request) {
  await connection();
  try {
    return Response.json(await getGauges());
  } catch (e) {
    console.error("gauges failed", e);
    return Response.json({ error: textFor(req)("Прогнозата за реките не е достъпна в момента.", "The river forecast isn't available right now.") }, { status: 502 });
  }
}
