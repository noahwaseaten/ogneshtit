import { textFor } from "@/i18n/server";
import { connection } from "next/server";
import { getWarnings } from "@/lib/warnings";

export async function GET(req: Request) {
  await connection();
  try {
    return Response.json(await getWarnings());
  } catch (e) {
    console.error("warnings failed", e);
    return Response.json({ error: textFor(req)("Предупрежденията на НИМХ не са достъпни.", "The weather warnings aren't available.") }, { status: 502 });
  }
}
