import { json, readJson } from "@/lib/api";
import { createRoom } from "@/lib/battle-service";
import { limits } from "@/lib/rate-limit";
import { allow, logError, serverCtx } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Create a Battle room. Body: { name, seconds: 180|300, botLevel }. */
export async function POST(req: Request) {
  const parsed = await readJson(req, 512);
  if ("error" in parsed) return parsed.error;
  try {
    const ctx = await serverCtx();
    if (!(await allow(ctx, limits.battleCreatePerIp, req.headers))) return json({ error: "Too many rooms created. Try again later." }, 429);
    const r = await createRoom(ctx, { name: parsed.body.name, seconds: parsed.body.seconds, botLevel: parsed.body.botLevel });
    return "error" in r ? json({ error: r.error }, r.status) : json(r);
  } catch (e) {
    logError("battle-create", e);
    return json({ error: "Battle is unavailable right now. Try again shortly." }, 503);
  }
}
