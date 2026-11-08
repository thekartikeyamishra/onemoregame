import { json } from "@/lib/api";
import { safeEqual } from "@/lib/crypto";
import { logError, serverCtx } from "@/lib/server";
import { runPushReminders, webPushSender } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Hourly: daily-arena reminders for this hour's subscribers (see .github/workflows/push.yml). */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 24) return json({ error: "Not configured" }, 503);
  if (!safeEqual(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "", secret)) return json({ error: "Unauthorized" }, 401);
  const send = await webPushSender();
  if (!send) return json({ error: "VAPID keys not set" }, 503);
  try {
    return json({ ok: true, ...(await runPushReminders(await serverCtx(), send)) });
  } catch (e) {
    logError("cron-push", e);
    return json({ error: "Failed" }, 500);
  }
}
export const GET = handle;
export const POST = handle;
