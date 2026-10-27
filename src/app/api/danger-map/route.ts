import { connection } from "next/server";
import { getDangerMap } from "@/lib/risk";

export async function GET() {
  await connection();
  try {
    return Response.json(await getDangerMap());
  } catch (e) {
    console.error("danger map failed", e);
    return Response.json({ error: "Метеоданните не са достъпни в момента." }, { status: 502 });
  }
}
