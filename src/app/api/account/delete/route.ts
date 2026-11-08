import { json, readJson } from "@/lib/api";
import { confirmAccountDeletion, requestAccountDeletion } from "@/lib/account";
import { deleteAccountById } from "@/lib/early-access";
import { limits } from "@/lib/rate-limit";
import { allow, logError, serverCtx } from "@/lib/server";
import { clearSessionCookie, currentPlayer } from "@/lib/session";
import { normalizeEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Account deletion.
 * - { mode: "now", confirm: "DELETE" }  signed in: delete immediately and sign out.
 * - { mode: "request", email }          signed out: email a one-time confirmation link (generic response).
 * - { mode: "confirm", token }          from that link: delete.
 */
export async function POST(req: Request) {
  const parsed = await readJson(req, 1024);
  if ("error" in parsed) return parsed.error;
  const b = parsed.body;
  try {
    const ctx = await serverCtx();
    if (b.mode === "now") {
      if (b.confirm !== "DELETE") return json({ error: "Type DELETE to confirm." }, 400);
      const id = await currentPlayer(ctx);
      if (!id) return json({ error: "Sign in first, or request a deletion link by email." }, 401);
      await deleteAccountById(ctx, id);
      await clearSessionCookie();
      return json({ ok: true });
    }
    if (b.mode === "request") {
      if (!(await allow(ctx, limits.accountDeletePerIp, req.headers))) return json({ error: "Too many requests. Try again later." }, 429);
      const email = typeof b.email === "string" ? normalizeEmail(b.email) : "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return json({ error: "Enter a valid email address." }, 400);
      await requestAccountDeletion(ctx, email);
      return json({ ok: true, message: "If that email has an account, we've sent a link to confirm deletion. It expires in 60 minutes." });
    }
    if (b.mode === "confirm") {
      if (!(await allow(ctx, limits.accountDeletePerIp, req.headers))) return json({ error: "Too many requests. Try again later." }, 429);
      const ok = await confirmAccountDeletion(ctx, b.token);
      if (!ok) return json({ error: "This link is invalid, used or expired. Request a new one." }, 410);
      await clearSessionCookie();
      return json({ ok: true });
    }
    return json({ error: "Invalid request." }, 400);
  } catch (e) {
    logError("account-delete", e);
    return json({ error: "Couldn't complete that right now. Please try again." }, 503);
  }
}
