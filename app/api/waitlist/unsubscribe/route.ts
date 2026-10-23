import { absoluteUrl } from "@/lib/site";
import { verify } from "@/lib/server/guard";
import { removeMember } from "@/lib/server/waitlist";

export const runtime = "nodejs";

async function handle(req: Request, redirect: boolean) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  const valid = /^[a-f0-9]{64}$/.test(id) && verify(`u:${id}`, sig);
  const ok = valid ? await removeMember(id).catch(() => false) : false;
  if (redirect) return Response.redirect(absoluteUrl(`/early-access/status?s=${ok ? "removed" : "invalid"}`), 303);
  return new Response(null, { status: ok ? 200 : 400 });
}

// GET: link in the email footer. POST: one-click unsubscribe (RFC 8058) from mail clients.
export const GET = (req: Request) => handle(req, true);
export const POST = (req: Request) => handle(req, false);
