import { connection } from "next/server";
import { textFor } from "@shtit/core/i18n/server";
import { getSensors } from "@/lib/air";

/** Every citizen particle sensor in Bulgaria with a reading from the last 30 minutes (sensor.community). */
export async function GET(req: Request) {
  await connection();
  try {
    return Response.json(await getSensors(), { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch (e) {
    console.error("sensors failed", e);
    return Response.json({ error: textFor(req)("Гражданските датчици не отговарят.", "The citizen sensors aren't answering.") }, { status: 502 });
  }
}
