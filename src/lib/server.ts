import "server-only";
import { headers } from "next/headers";
import { serverConfig } from "./env";
import { getStore } from "./store";
import { consume, type Limit } from "./rate-limit";
import { clientKey } from "./request";
import type { Ctx } from "./early-access";

export async function serverCtx(): Promise<Ctx & { ownerEmail: string | null }> {
  const cfg = serverConfig();
  return { store: await getStore(), secret: cfg.appSecret, ownerEmail: cfg.ownerNotifyEmail };
}

/** Rate-limit the current request by hashed client IP. */
export async function allow(ctx: Ctx, limit: Limit, h?: Headers): Promise<boolean> {
  const hdrs = h ?? (await headers());
  return consume(ctx.store, limit, clientKey(hdrs, ctx.secret));
}

export function logError(scope: string, e: unknown) {
  // Log only the error class/message; never request bodies, emails or tokens.
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : "unknown";
  console.error(`[${scope}] ${msg.slice(0, 300)}`);
  if (process.env.NODE_ENV !== "production" && /credential|project id|PERMISSION_DENIED|billing|UNAUTHENTICATED/i.test(msg)) {
    console.error("[setup] Firestore isn't reachable from this machine. For local development set DATA_BACKEND=memory and MAIL_PROVIDER=console in .env.local (see .env.example), or run `npm run doctor`.");
  }
}
