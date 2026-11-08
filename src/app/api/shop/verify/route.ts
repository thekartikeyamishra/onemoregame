import { json, readJson } from "@/lib/api";
import { logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";
import { markOrderPaid, ownershipOf, shopConfig, validPaymentSignature } from "@/lib/shop/service";

export const dynamic = "force-dynamic";

/** Website checkout step 2: the Razorpay callback. The signature proves the payment; the webhook is the backup. */
export async function POST(req: Request) {
  const parsed = await readJson(req, 1024);
  if ("error" in parsed) return parsed.error;
  const { orderId, paymentId, signature } = parsed.body;
  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") return json({ error: "Invalid request." }, 400);
  try {
    const ctx = await serverCtx();
    const id = await currentPlayer(ctx);
    if (!id) return json({ error: "Sign in again to finish. If you were charged, it will appear within a few minutes." }, 401);
    if (!validPaymentSignature(shopConfig(), orderId, paymentId, signature)) return json({ error: "Payment couldn't be verified. If you were charged, it will appear within a few minutes or be refunded automatically." }, 400);
    const p = await markOrderPaid(ctx, orderId, paymentId, { signupId: id });
    if (!p) return json({ error: "Order not found." }, 404);
    return json({ ok: true, ...ownershipOf(p) });
  } catch (e) {
    logError("shop-verify", e);
    return json({ error: "Couldn't confirm right now. If you were charged, it will appear within a few minutes." }, 503);
  }
}
