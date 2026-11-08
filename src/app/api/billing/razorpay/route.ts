import { json } from "@/lib/api";
import { logError, serverCtx } from "@/lib/server";
import { handleRazorpayEvent, shopConfig, validWebhookSignature } from "@/lib/shop/service";

export const dynamic = "force-dynamic";

/** Razorpay webhook (order.paid, payment.captured, refund.processed). Verified with X-Razorpay-Signature. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 64_000) return json({ error: "Too large" }, 413);
  if (!validWebhookSignature(shopConfig(), raw, req.headers.get("x-razorpay-signature"))) return json({ error: "Invalid signature" }, 401);
  try {
    const ctx = await serverCtx();
    const result = await handleRazorpayEvent(ctx, JSON.parse(raw));
    return json({ ok: true, result });
  } catch (e) {
    logError("razorpay-webhook", e);
    return json({ error: "Retry later" }, 500); // Razorpay retries failed deliveries
  }
}
