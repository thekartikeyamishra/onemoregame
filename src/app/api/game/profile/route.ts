import { readJson, json } from "@/lib/api";
import { cleanDisplayName, setDisplayName } from "@/lib/game-service";
import { logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, 512);
  if ("error" in parsed) return parsed.error;
  const name = cleanDisplayName(parsed.body.displayName);
  if (!name) return json({ error: "Use 3–16 letters, numbers, spaces, dots, dashes or underscores. Keep it friendly." }, 400);
  try {
    const ctx = await serverCtx();
    const signupId = await currentPlayer(ctx);
    if (!signupId) return json({ error: "Confirm your email to choose a leaderboard name." }, 401);
    await setDisplayName(ctx, signupId, name);
    return json({ displayName: name });
  } catch (e) {
    logError("profile", e);
    return json({ error: "Couldn't save your name." }, 503);
  }
}
