import { json } from "@/lib/api";
import { dayKey, wouldRank } from "@/lib/game-service";
import { limits } from "@/lib/rate-limit";
import { allowLocal, logError, serverCtx } from "@/lib/server";

export const dynamic = "force-dynamic";

/** "This score would be #14 today" (shown to guests to encourage claiming the run). CDN-cached per score. */
export async function GET(req: Request) {
  const score = Number(new URL(req.url).searchParams.get("score"));
  if (!Number.isInteger(score) || score < 0 || score > 10_000_000) return json({ error: "Invalid score." }, 400);
  try {
    const ctx = await serverCtx();
    if (!allowLocal(ctx, limits.rankPerIp, req.headers)) return json({ error: "Too many requests." }, 429);
    return json(await wouldRank(ctx.store, dayKey(), score), 200, { "Cache-Control": "public, max-age=0, must-revalidate", "CDN-Cache-Control": "max-age=30, stale-while-revalidate=60" });
  } catch (e) {
    logError("leaderboard-rank", e);
    return json({ error: "Unavailable." }, 503);
  }
}
