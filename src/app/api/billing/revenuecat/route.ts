import { json } from "@/lib/api";
import { logError, serverCtx } from "@/lib/server";
import { handleRevenuecatEvent, shopConfig, validRevenuecatAuth } from "@/lib/shop/service";

export const dynamic = "force-dynamic";

/**
 * RevenueCat webhook: any purchase, refund, transfer or revocation for an account re-syncs that account's
 * ownership from RevenueCat's API (so event order and duplicates don't matter).
 */
export async function POST(req: Request) {
  if (!validRevenuecatAuth(shopConfig(), req.headers.get("authorization"))) return json({ error: "Unauthorized" }, 401);
  const raw = await req.text();
  if (raw.length > 64_000) return json({ error: "Too large" }, 413);
  try {
    const ctx = await serverCtx();
    const synced = await handleRevenuecatEvent(ctx, JSON.parse(raw));
    return json({ ok: true, synced });
  } catch (e) {
    logError("revenuecat-webhook", e);
    return json({ error: "Retry later" }, 500);
  }
}
