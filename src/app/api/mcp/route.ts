import { NextResponse } from "next/server";
import { dailyTwist, dayKey, getChallengePublic, leaderboard, twistInfo } from "@/lib/game-service";
import { handleMcpMessage, type McpDeps } from "@/lib/mcp";
import { limits } from "@/lib/rate-limit";
import { allowLocal, logError, serverCtx } from "@/lib/server";

/**
 * Public MCP endpoint (Streamable HTTP, stateless, JSON responses): https://onemoregame.me/api/mcp
 * Read-only; no cookies or sessions are read, so it is safe to allow any origin.
 */
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
  "Cache-Control": "no-store",
};
const MAX_BYTES = 64 * 1024;

function reply(body: unknown, status = 200) {
  return body === null ? new NextResponse(null, { status: 202, headers: CORS }) : NextResponse.json(body, { status, headers: CORS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}

/** No server-initiated stream: per the Streamable HTTP spec, answer GET with 405. */
export function GET() {
  return new NextResponse("ONE MORE MCP server. Send JSON-RPC requests with POST. Docs: https://onemoregame.me/developers", { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS", "Content-Type": "text/plain; charset=utf-8" } });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return reply({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, 413);
  let msg: unknown;
  try { msg = JSON.parse(raw); } catch { return reply({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }

  // The data store is only needed for live data (leaderboard, challenges); static tools keep working without it.
  let ctx: Awaited<ReturnType<typeof serverCtx>> | null = null;
  try { ctx = await serverCtx(); } catch (e) { logError("mcp-ctx", e); }

  const batch = Array.isArray(msg) ? msg.slice(0, 20) : [msg];
  const calls = batch.filter((m) => m && typeof m === "object" && (m as { method?: unknown }).method === "tools/call").length;
  if (calls && ctx) {
    try {
      if (!allowLocal(ctx, limits.mcpPerIp, req.headers)) {
        const id = !Array.isArray(msg) && msg && typeof msg === "object" ? ((msg as { id?: string | number }).id ?? null) : null;
        return reply({ jsonrpc: "2.0", id, error: { code: -32000, message: "Rate limit reached. Try again later." } }, 429);
      }
    } catch (e) { logError("mcp-rate", e); }
  }

  const unavailable = () => { throw new Error("store unavailable"); };
  const deps: McpDeps = {
    today: () => dayKey(),
    dailyTwist: (day) => twistInfo(dailyTwist(day)),
    leaderboard: async (day) => (ctx ? leaderboard(ctx.store, day, null) : unavailable()),
    challenge: async (id) => (ctx ? getChallengePublic(ctx.store, id) : unavailable()),
  };

  const out = (await Promise.all(batch.map((m) => handleMcpMessage(m, deps)))).filter((r) => r !== null);
  if (!Array.isArray(msg)) return reply(out[0] ?? null);
  return reply(out.length ? out : null);
}
