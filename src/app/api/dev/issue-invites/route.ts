import { NextResponse } from "next/server";
import { issueInvites } from "@/lib/early-access";
import { serverConfig } from "@/lib/env";
import { serverCtx } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * Local development / e2e helper ONLY. Exists solely when the in-memory store is active AND the
 * explicit insecure-dev flag is set; returns 404 in every deployed configuration (Firestore backend).
 */
export async function POST() {
  if (process.env.ALLOW_INSECURE_DEV_BACKENDS !== "true" || serverConfig().dataBackend !== "memory") {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json(await issueInvites(await serverCtx(), { count: 50 }));
}
