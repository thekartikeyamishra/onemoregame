import { json, readJson } from "@/lib/api";
import { isSkinId, isTrailId } from "@/game/cosmetics";
import { logError, serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";
import { equip } from "@/lib/shop/service";

export const dynamic = "force-dynamic";

/** Choose the equipped skin/trail (only owned items take effect; classic is always allowed). */
export async function POST(req: Request) {
  const parsed = await readJson(req, 256);
  if ("error" in parsed) return parsed.error;
  const { skin, trail } = parsed.body;
  if ((skin !== undefined && !isSkinId(skin)) || (trail !== undefined && !isTrailId(trail))) return json({ error: "Invalid item." }, 400);
  try {
    const ctx = await serverCtx();
    const id = await currentPlayer(ctx);
    if (!id) return json({ error: "Sign in to save your look." }, 401);
    return json({ equipped: await equip(ctx, id, { ...(skin ? { skin } : {}), ...(trail ? { trail } : {}) }) });
  } catch (e) {
    logError("shop-equip", e);
    return json({ error: "Couldn't save right now." }, 503);
  }
}
