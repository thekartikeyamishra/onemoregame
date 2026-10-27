import { json } from "@/lib/api";
import { dayKey, standing, weekKey } from "@/lib/game-service";
import { logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The signed-in player's rank and the players just ahead/behind (private, never cached). */
export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope") === "week" ? "week" : "day";
  try {
    const ctx = await serverCtx();
    const signupId = await currentPlayer(ctx);
    if (!signupId) return json({ signedIn: false });
    const day = dayKey();
    return json({ signedIn: true, ...(await standing(ctx.store, scope, scope === "week" ? weekKey(day) : day, signupId)) });
  } catch (e) {
    logError("leaderboard-me", e);
    return json({ error: "Unavailable." }, 503);
  }
}
