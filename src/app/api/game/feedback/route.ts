import { readJson, json } from "@/lib/api";
import { saveFeedback } from "@/lib/game-service";
import { limits } from "@/lib/rate-limit";
import { allow, logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, 2048);
  if ("error" in parsed) return parsed.error;
  try {
    const ctx = await serverCtx();
    if (!(await allow(ctx, limits.feedbackPerIp, req.headers))) return json({ error: "Too many requests." }, 429);
    const ok = await saveFeedback(ctx, await currentPlayer(ctx), parsed.body as never);
    return ok ? json({ ok: true }, 202) : json({ error: "Invalid feedback." }, 400);
  } catch (e) {
    logError("feedback", e);
    return json({ error: "Couldn't save feedback." }, 503);
  }
}
