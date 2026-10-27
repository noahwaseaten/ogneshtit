import { textFor } from "@/i18n/server";
import { connection } from "next/server";
import { getPasses } from "@/lib/passes";

export async function GET(req: Request) {
  await connection(); // never prerender: an error at build time must not be baked in
  try {
    return Response.json(await getPasses(), { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch (e) {
    console.error("passes failed", e);
    return Response.json({ error: textFor(req)("Не успяхме да пресметнем кога минават спътниците.", "We couldn't work out when the satellites pass.") }, { status: 502 });
  }
}
