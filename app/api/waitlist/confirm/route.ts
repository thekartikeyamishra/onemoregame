import { absoluteUrl } from "@/lib/site";
import { ipHash, rateLimit, verify } from "@/lib/server/guard";
import { confirmMember } from "@/lib/server/waitlist";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  const go = (s: string) => Response.redirect(absoluteUrl(`/early-access/status?s=${s}`), 303);

  if (!(await rateLimit(`confirm:${ipHash(req)}`, 20, 600)).ok) return go("invalid");
  if (!/^[a-f0-9]{64}$/.test(id) || !verify(`c:${id}`, sig)) return go("invalid");
  try {
    return go((await confirmMember(id)) === "ok" ? "confirmed" : "invalid");
  } catch (e) {
    console.error("[waitlist] confirm failed", e);
    return go("invalid");
  }
}
