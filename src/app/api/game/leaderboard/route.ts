import { json } from "@/lib/api";
import { dayKey, leaderboard } from "@/lib/game-service";
import { logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await serverCtx();
    const signupId = await currentPlayer(ctx);
    return json(await leaderboard(ctx.store, dayKey(), signupId));
  } catch (e) {
    logError("leaderboard", e);
    return json({ error: "Leaderboard unavailable." }, 503);
  }
}
