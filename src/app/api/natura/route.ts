import { connection } from "next/server";
import { getNatura } from "@/lib/natura";

export async function GET() {
  await connection();
  try {
    return Response.json(await getNatura(), {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    });
  } catch {
    return Response.json({ error: "Границите на Натура 2000 не са достъпни в момента." }, { status: 502 });
  }
}
