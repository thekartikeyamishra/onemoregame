import { json } from "@/lib/api";
import { safeEqual } from "@/lib/crypto";
import { logError, serverCtx } from "@/lib/server";
import { runWinback } from "@/lib/winback";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily win-back emails. Called by the scheduler (GitHub Actions, see .github/workflows/daily.yml, or Vercel Cron)
 * with `Authorization: Bearer <CRON_SECRET>`. Switched off when CRON_SECRET isn't set.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 24) return json({ error: "Not configured" }, 503);
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(auth, secret)) return json({ error: "Unauthorized" }, 401);
  try {
    const cap = Math.min(500, Math.max(0, Number(process.env.WINBACK_DAILY_CAP ?? 80) || 0));
    return json({ ok: true, ...(await runWinback(await serverCtx(), cap)) });
  } catch (e) {
    logError("cron-winback", e);
    return json({ error: "Failed" }, 500);
  }
}

export const GET = handle;
export const POST = handle;
