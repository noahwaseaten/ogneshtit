import { connection } from "next/server";
import { getLiveDangerMap, getMetDangerMap } from "@/lib/risk";

// Temporary: compare the MET Norway fallback with the live Open-Meteo danger map. Public data only.
export async function GET() {
  await connection();
  const live = await getLiveDangerMap();
  // Pretend the codes were saved a day earlier, as they would be during an outage.
  const met = await getMetDangerMap(live);
  return Response.json(
    live.regions.map((r) => {
      const m = met.regions.find((x) => x.code === r.code)!;
      return { code: r.code, live: r.fwi, met: m.fwi, liveDanger: r.danger, metDanger: m.danger };
    }),
  );
}
