import { textFor } from "@/i18n/server";
import { connection } from "next/server";
import { getFires } from "@/lib/fires";

export async function GET(req: Request) {
  await connection(); // never prerender: an error at build time must not be baked in
  try {
    return Response.json(await getFires());
  } catch (e) {
    console.error("fires failed", e);
    return Response.json({ error: textFor(req)("Сателитните данни не са достъпни в момента.", "The satellite data isn't available right now.") }, { status: 502 });
  }
}
