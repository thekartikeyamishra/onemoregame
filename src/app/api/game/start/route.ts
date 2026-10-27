import { readJson, json } from "@/lib/api";
import { startRun, type Mode } from "@/lib/game-service";
import { limits, localAllow } from "@/lib/rate-limit";
import { allowLocal, logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, 512);
  if ("error" in parsed) return parsed.error;
  const mode = parsed.body.mode as Mode;
  if (!["quick", "daily", "challenge", "level"].includes(mode)) return json({ error: "Invalid mode." }, 400);
  try {
    const ctx = await serverCtx();
    const signupId = await currentPlayer(ctx);
    if (!signupId && mode === "quick") return json({ error: "Confirm your email to unlock Quick Play." }, 401);
    // Starting a run writes nothing (signed ticket), so a per-instance limit is enough to stop floods.
    if (!allowLocal(ctx, signupId ? limits.runStartPerIp : limits.guestRunPerIp, req.headers)) return json({ error: "Too many runs. Take a short break." }, 429);
    if (signupId && !localAllow(limits.runStartPerPlayer, signupId.slice(0, 32))) return json({ error: "Too many runs this hour. Take a short break." }, 429);
    const r = await startRun(ctx, signupId, mode, typeof parsed.body.challengeId === "string" ? parsed.body.challengeId : null, typeof parsed.body.level === "number" ? parsed.body.level : null);
    if ("error" in r) {
      if (r.error === "locked") return json({ error: signupId ? "Clear the previous level to unlock this one." : "Confirm your email to save progress and unlock more levels." }, 403);
      return json({ error: mode === "level" ? "Level not found." : "Challenge not found." }, 404);
    }
    return json(r);
  } catch (e) {
    logError("game-start", e);
    return json({ error: "Couldn't start a run. Try again." }, 503);
  }
}
