import { readJson, json } from "@/lib/api";
import { createChallenge } from "@/lib/game-service";
import { limits } from "@/lib/rate-limit";
import { allow, logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, 160 * 1024);
  if ("error" in parsed) return parsed.error;
  try {
    const ctx = await serverCtx();
    const signupId = await currentPlayer(ctx);
    if (!(await allow(ctx, limits.challengePerIp, req.headers))) return json({ error: "Too many challenges. Try later." }, 429);
    const id = await createChallenge(ctx, signupId, parsed.body.runId, parsed.body.inputs);
    if (!id) return json({ error: "Run not found." }, 404);
    return json({ url: `${site.url}/c/${id}` });
  } catch (e) {
    logError("game-challenge", e);
    return json({ error: "Couldn't create a challenge." }, 503);
  }
}
