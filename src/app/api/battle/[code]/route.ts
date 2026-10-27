import { json, readJson } from "@/lib/api";
import { attack, battleFeedback, joinRoom, lobbyAction, tick } from "@/lib/battle-service";
import { limits } from "@/lib/rate-limit";
import { allow, logError, serverCtx } from "@/lib/server";

export const dynamic = "force-dynamic";

// Per-instance guard against runaway polling (each sync costs datastore reads). Honest clients poll every ~1.5 s.
const lastSeen = new Map<string, number>();
function tooFast(token: string, now: number, gap = 350): boolean {
  const prev = lastSeen.get(token) ?? 0;
  if (now - prev < gap) return true;
  lastSeen.set(token, now);
  if (lastSeen.size > 5000) for (const [k, v] of lastSeen) if (now - v > 60_000) lastSeen.delete(k);
  return false;
}

/**
 * One endpoint per room. Body: { action, ... }. Auth: the seat token in the `x-battle-token` header
 * (issued on create/join, kept in the player's browser; only its HMAC is stored).
 */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = await readJson(req, 64 * 1024);
  if ("error" in parsed) return parsed.error;
  const b = parsed.body;
  const token = req.headers.get("x-battle-token") ?? "";
  try {
    const ctx = await serverCtx();
    let r: unknown;
    switch (b.action) {
      case "join":
        if (!(await allow(ctx, limits.battleJoinPerIp, req.headers))) return json({ error: "Too many joins. Try again later." }, 429);
        r = await joinRoom(ctx, code, { name: b.name, team: b.team, token: token || undefined });
        break;
      case "tick":
        if (tooFast(token, Date.now())) return json({ error: "slow down" }, 429);
        r = await tick(ctx, code, token, { v: b.v, c: b.c, chunk: b.chunk });
        break;
      case "attack":
        if (tooFast(`a:${token}`, Date.now(), 250)) return json({ error: "Too fast." }, 429);
        r = await attack(ctx, code, token, { a: b.a, t: b.t, x: b.x, y: b.y });
        break;
      case "feedback":
        r = await battleFeedback(ctx, code, token, { rating: b.rating, note: b.note });
        break;
      case "team": case "addBot": case "remove": case "settings": case "start": case "leave": case "rematch":
        r = await lobbyAction(ctx, code, token, b as never);
        break;
      default:
        return json({ error: "Unknown action." }, 400);
    }
    if (r && typeof r === "object" && "error" in r && "status" in r) {
      const e = r as { error: string; status: number };
      return json({ error: e.error }, e.status);
    }
    return json(r);
  } catch (e) {
    logError("battle", e);
    return json({ error: "Battle is unavailable right now. Try again shortly." }, 503);
  }
}
