import { waitlistSchema, firstError } from "@/lib/validation";
import { canReceiveMail, isDisposable, MIN_HUMAN_MS, referralCode } from "@/lib/server/fraud";
import { country, ipHash, json, rateLimit, sameOrigin } from "@/lib/server/guard";
import { joinWaitlist, referralCount } from "@/lib/server/waitlist";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);

  const ip = ipHash(req);
  const limited = await rateLimit(`waitlist:${ip}`, 6, 600);
  if (!limited.ok) return json({ error: "Too many attempts. Please wait a few minutes and try again." }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) return json({ error: firstError(parsed.error) }, 422);
  const input = parsed.data;

  // Bots: pretend success, store nothing (so they don't learn what tripped them).
  if (input.hp || (input.t !== undefined && input.t < MIN_HUMAN_MS)) {
    return json({ ok: true, code: referralCode(), confirmRequired: true });
  }
  if (isDisposable(input.email)) {
    return json({ error: "Please use a permanent email address. Temporary inboxes can't receive invites." }, 422);
  }
  if (!(await canReceiveMail(input.email))) {
    return json({ error: "That email domain can't receive mail. Check for a typo?" }, 422);
  }

  try {
    const result = await joinWaitlist(input, { ipHash: ip, country: country(req) });
    if (!result) {
      if (process.env.NODE_ENV !== "production") {
        console.info("[waitlist] Firestore not configured; dev sign-up accepted:", input.email);
        return json({ ok: true, code: referralCode(), confirmRequired: false, dev: true });
      }
      return json({ error: "Sign-ups are temporarily unavailable. Please try again later." }, 503);
    }
    return json({ ok: true, ...result });
  } catch (e) {
    console.error("[waitlist] join failed", e);
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}

/** Public referral count for a code (shown to the person who shares it). */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const limited = await rateLimit(`refcount:${ipHash(req)}`, 30, 600);
  if (!limited.ok) return json({ error: "Too many requests." }, 429);
  const count = await referralCount(code).catch(() => null);
  return json({ count: count ?? 0 }, 200, { "Cache-Control": "private, max-age=60" });
}
