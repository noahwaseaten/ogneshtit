import { connection } from "next/server";
import { getFireHistory } from "@/lib/iag";

export async function GET() {
  await connection();
  try {
    return Response.json(await getFireHistory());
  } catch (e) {
    console.error("fire history failed", e);
    return Response.json({ error: "Регистърът на ИАГ не отговаря в момента." }, { status: 502 });
  }
}
