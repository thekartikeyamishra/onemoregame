import { json } from "@/lib/api";
import { board, dayKey, weekKey } from "@/lib/game-service";
import { logError, serverCtx } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * Public leaderboard (identical for everyone, no cookies read), cached at the CDN (CDN-Cache-Control) for 15 s and
 * served stale for up to a minute while it refreshes: thousands of viewers cost one database query per region per 15 s.
 * Personal standing is a separate, private endpoint (/api/game/leaderboard/me).
 */
export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope") === "week" ? "week" : "day";
  try {
    const ctx = await serverCtx();
    const day = dayKey();
    const data = await board(ctx.store, scope, scope === "week" ? weekKey(day) : day);
    // Browsers always revalidate (so a player sees their new score right after a run); only the CDN caches.
    return json(data, 200, { "Cache-Control": "public, max-age=0, must-revalidate", "CDN-Cache-Control": "max-age=15, stale-while-revalidate=60" });
  } catch (e) {
    logError("leaderboard", e);
    return json({ error: "Leaderboard unavailable." }, 503);
  }
}
