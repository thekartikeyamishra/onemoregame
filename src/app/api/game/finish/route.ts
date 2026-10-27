import { readJson, json } from "@/lib/api";
import { finishRun } from "@/lib/game-service";
import { allowLocal, logError, serverCtx } from "@/lib/server";
import { limits } from "@/lib/rate-limit";
import { currentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

const messages: Record<string, [number, string]> = {
  invalid: [400, "That run couldn't be read."],
  mismatch: [422, "That score couldn't be verified, so it wasn't saved."],
  "too-fast": [422, "That run finished faster than real time, so it wasn't saved."],
  expired: [410, "That run expired or was already submitted."],
  forbidden: [403, "That run belongs to another session."],
  outdated: [409, "The game was updated. Refresh the page to keep playing."],
};

export async function POST(req: Request) {
  const parsed = await readJson(req, 160 * 1024);
  if ("error" in parsed) return parsed.error;
  try {
    const ctx = await serverCtx();
    if (!allowLocal(ctx, limits.runFinishPerIp, req.headers)) return json({ error: "Too many runs. Take a short break." }, 429);
    const signupId = await currentPlayer(ctx);
    const r = await finishRun(ctx, signupId, parsed.body as never);
    if (r.status !== "ok") { const [code, msg] = messages[r.status]; return json({ error: msg, status: r.status }, code); }
    return json(r);
  } catch (e) {
    logError("game-finish", e);
    return json({ error: "Couldn't save the run. Your score is shown but not recorded." }, 503);
  }
}
