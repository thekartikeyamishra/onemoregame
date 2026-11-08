import { json } from "@/lib/api";
import { getPlayer } from "@/lib/game-service";
import { logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";
import { foundersWall, ownershipOf, shopConfig, webCheckoutEnabled } from "@/lib/shop/service";

export const dynamic = "force-dynamic";

/** The caller's ownership (private, never cached) plus the Founders Wall. */
export async function GET() {
  try {
    const ctx = await serverCtx();
    const id = await currentPlayer(ctx);
    const [wall, player] = await Promise.all([foundersWall(ctx.store), id ? getPlayer(ctx.store, id) : Promise.resolve(null)]);
    const own = ownershipOf(player);
    return json({ signedIn: !!id, appUserId: id, ...own, displayName: player?.displayName ?? null, webCheckout: webCheckoutEnabled(shopConfig()), founders: wall });
  } catch (e) {
    logError("shop", e);
    return json({ error: "Shop unavailable right now." }, 503);
  }
}
