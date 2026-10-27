import { connection } from "next/server";
import { getWarnings } from "@/lib/warnings";

export async function GET() {
  await connection();
  try {
    return Response.json(await getWarnings());
  } catch {
    return Response.json({ error: "Предупрежденията на НИМХ не са достъпни." }, { status: 502 });
  }
}
