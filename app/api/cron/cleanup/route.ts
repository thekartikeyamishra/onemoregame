import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/server/firebase";
import { json } from "@/lib/server/guard";
import { removeMember } from "@/lib/server/waitlist";

export const runtime = "nodejs";

/**
 * Daily retention job (Vercel Cron, see vercel.json): deletes sign-ups that were
 * never confirmed within 30 days, as promised in the privacy policy.
 * Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "Unauthorized" }, 401);
  const db = getDb();
  if (!db) return json({ skipped: "no database" });

  const cutoff = Timestamp.fromMillis(Date.now() - 30 * 86_400_000);
  const stale = await db.collection("waitlist").where("confirmed", "==", false).where("createdAt", "<", cutoff).limit(400).get();
  let removed = 0;
  for (const doc of stale.docs) if (await removeMember(doc.id)) removed++;
  return json({ removed });
}
