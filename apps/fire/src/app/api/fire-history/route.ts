import { textFor } from "@shtit/core/i18n/server";
import { connection } from "next/server";
import { getFireHistory } from "@/lib/iag";

export async function GET(req: Request) {
  await connection();
  try {
    return Response.json(await getFireHistory());
  } catch (e) {
    console.error("fire history failed", e);
    return Response.json({ error: textFor(req)("Регистърът на ИАГ не отговаря в момента.", "The forest agency's register isn't responding right now.") }, { status: 502 });
  }
}
