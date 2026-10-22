import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/early-access";
import { logError, serverCtx } from "@/lib/server";

export const dynamic = "force-dynamic";

/** RFC 8058 one-click unsubscribe endpoint used by mail clients (POST only). */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  try {
    const ok = await unsubscribe(await serverCtx(), token);
    return new NextResponse(null, { status: ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    logError("one-click-unsubscribe", e);
    return new NextResponse(null, { status: 503 });
  }
}
