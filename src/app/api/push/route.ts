import { json, readJson } from "@/lib/api";
import { limits } from "@/lib/rate-limit";
import { allowLocal, logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";
import { parseSubscription, pushConfig, removeSubscription, saveSubscription, touchSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Daily reminder subscriptions (opt-in Web Push).
 * { action: "subscribe", subscription, hourUtc, day?, streak? } | { action: "touch", endpoint, day, streak } | { action: "unsubscribe", endpoint }
 */
export async function POST(req: Request) {
  const parsed = await readJson(req, 4096);
  if ("error" in parsed) return parsed.error;
  const b = parsed.body;
  if (!pushConfig().enabled) return json({ error: "Reminders aren't switched on yet." }, 503);
  try {
    const ctx = await serverCtx();
    if (!allowLocal(ctx, limits.pushPerIp, req.headers)) return json({ error: "Too many requests." }, 429);
    if (b.action === "subscribe") {
      const sub = parseSubscription(b.subscription);
      if (!sub) return json({ error: "Unsupported browser subscription." }, 400);
      await saveSubscription(ctx, sub, { hourUtc: b.hourUtc, day: b.day, streak: b.streak, signupId: await currentPlayer(ctx) });
      return json({ ok: true });
    }
    const endpoint = typeof b.endpoint === "string" && b.endpoint.length <= 1000 ? b.endpoint : null;
    if (!endpoint) return json({ error: "Invalid request." }, 400);
    if (b.action === "touch") return json({ ok: await touchSubscription(ctx, endpoint, b.day, b.streak) });
    if (b.action === "unsubscribe") { await removeSubscription(ctx, endpoint); return json({ ok: true }); }
    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    logError("push", e);
    return json({ error: "Couldn't save right now." }, 503);
  }
}
