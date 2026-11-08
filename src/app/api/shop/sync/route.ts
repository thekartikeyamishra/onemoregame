import { json, readJson } from "@/lib/api";
import { limits } from "@/lib/rate-limit";
import { allowLocal, logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";
import { ownershipOf, restorePurchases, syncStore } from "@/lib/shop/service";

export const dynamic = "force-dynamic";

/**
 * After an in-app purchase (or "Restore purchases"): re-read what Google Play / the App Store say this account owns.
 * { restore: true } also rebuilds website purchases from the payment ledger.
 */
export async function POST(req: Request) {
  const parsed = await readJson(req, 128);
  if ("error" in parsed) return parsed.error;
  try {
    const ctx = await serverCtx();
    if (!allowLocal(ctx, limits.shopSyncPerIp, req.headers)) return json({ error: "Too many attempts. Try again later." }, 429);
    const id = await currentPlayer(ctx);
    if (!id) return json({ error: "Sign in to sync purchases to your account." }, 401);
    const p = parsed.body.restore === true ? await restorePurchases(ctx, id) : await syncStore(ctx, id);
    if (!p) return json({ error: "Store sync isn't set up yet." }, 503);
    return json({ ok: true, ...ownershipOf(p) });
  } catch (e) {
    logError("shop-sync", e);
    return json({ error: "Couldn't reach the store right now. Try again in a minute." }, 503);
  }
}
