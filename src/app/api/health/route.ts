import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/env";
import { logError } from "@/lib/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Health check for uptime monitoring (e.g. Google Cloud uptime checks): 200 when the data store answers,
 * 503 otherwise. Reveals no secrets or user data.
 */
export async function GET() {
  const started = Date.now();
  try {
    const cfg = serverConfig();
    await (await getStore()).get("rateLimits", "__health__");
    return NextResponse.json(
      { ok: true, backend: cfg.dataBackend, mail: cfg.mailProvider === "console" ? "console" : cfg.resendApiKey && cfg.mailFrom ? "configured" : "missing", ms: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    logError("health", e);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
