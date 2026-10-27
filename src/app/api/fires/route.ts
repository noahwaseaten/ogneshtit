import { connection } from "next/server";
import { getFires } from "@/lib/fires";

export async function GET() {
  await connection(); // never prerender: an error at build time must not be baked in
  try {
    return Response.json(await getFires());
  } catch (e) {
    console.error("fires failed", e);
    return Response.json({ error: "Сателитните данни не са достъпни в момента." }, { status: 502 });
  }
}
