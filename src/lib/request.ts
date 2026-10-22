import { hmac } from "./crypto";

/**
 * Client IP as seen by our trusted proxy chain. Load balancers APPEND to X-Forwarded-For, so the
 * left-most entries are client-controlled and must not be trusted. With Google's external Application
 * Load Balancer (used by Firebase App Hosting) the format is "<client-supplied…>, <client-ip>, <lb-ip>",
 * so the client IP is 1 hop from the right (TRUSTED_PROXY_HOPS=1, the default). Verify in your logs.
 */
export function clientIp(headers: Headers): string {
  const hops = Math.max(0, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 0);
  const chain = (headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (chain.length) return chain[Math.max(0, chain.length - 1 - hops)];
  return headers.get("x-real-ip") ?? "unknown";
}

/** Hashed client identifier for rate limiting. Raw IPs are never stored. */
export function clientKey(headers: Headers, secret: string): string {
  return hmac(secret, `ip:${clientIp(headers)}`).slice(0, 32);
}

/** Basic same-origin check for JSON POST endpoints (defence in depth alongside SameSite cookies). */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // non-browser clients; still rate limited and validated
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
