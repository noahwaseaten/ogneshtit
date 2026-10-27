import { get, head, put } from "@vercel/blob";

// Last good copies of every data source, kept in Vercel Blob (private). The cron job (/api/cron/backup) saves
// fresh copies at most every few hours; a data helper reads its copy only when the live source fails.
// That way a fresh deployment (empty cache) during an outage still has something real to show, with its date.

const PREFIX = "backups/";
const path = (key: string) => `${PREFIX}${key}.json`;

export type Backup<T> = { data: T; saved: string };

export async function saveBackup(key: string, data: unknown) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  const body: Backup<unknown> = { data, saved: new Date().toISOString() };
  await put(path(key), JSON.stringify(body), { access: "private", contentType: "application/json", allowOverwrite: true, addRandomSuffix: false });
}

export async function loadBackup<T>(key: string): Promise<Backup<T> | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const r = await get(path(key), { access: "private" });
    if (!r?.stream) return null;
    const b = JSON.parse(await new Response(r.stream).text()) as Backup<T>;
    return b?.saved && b.data ? b : null;
  } catch {
    return null;
  }
}

/** When a copy was last saved, without downloading it (one cheap request). */
export async function backupAge(key: string): Promise<number | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const h = await head(path(key)).catch(() => null);
  return h ? Date.now() - new Date(h.uploadedAt).getTime() : null;
}
