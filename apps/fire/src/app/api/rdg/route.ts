import { connection } from "next/server";
import { getRdgs } from "@/lib/iag";

export async function GET() {
  await connection();
  return Response.json({ rdgs: await getRdgs() });
}
