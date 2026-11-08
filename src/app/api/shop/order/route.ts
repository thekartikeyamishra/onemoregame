import { json, readJson } from "@/lib/api";
import { limits } from "@/lib/rate-limit";
import { allowLocal, logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";
import { C } from "@/lib/store/types";
import type { Signup } from "@/lib/early-access";
import { createWebOrder } from "@/lib/shop/service";

export const dynamic = "force-dynamic";

/** Website checkout step 1: create a Razorpay order for one product (signed-in players only). */
export async function POST(req: Request) {
  const parsed = await readJson(req, 256);
  if ("error" in parsed) return parsed.error;
  try {
    const ctx = await serverCtx();
    if (!allowLocal(ctx, limits.shopOrderPerIp, req.headers)) return json({ error: "Too many attempts. Try again later." }, 429);
    const id = await currentPlayer(ctx);
    if (!id) return json({ error: "Sign in first so your purchase is saved to your account." }, 401);
    const r = await createWebOrder(ctx, id, parsed.body.productId);
    if (!r.ok) return json({ error: r.error }, r.status);
    const signup = await ctx.store.get<Signup>(C.signups, id);
    return json({ ...r, email: signup?.email ?? null });
  } catch (e) {
    logError("shop-order", e);
    return json({ error: "Checkout is unavailable right now. Please try again." }, 503);
  }
}
