import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isOwnHost } from "@/lib/site";

/**
 * Request hygiene shared by every API route:
 *  - IPs are never stored raw; only a salted hash (DPDP/GDPR data minimisation).
 *  - Same-origin check blocks cross-site form posting and cheap scripted abuse.
 *  - Rate limits use Upstash Redis when configured (shared across instances),
 *    otherwise an in-memory window per server instance.
 */

const SALT = process.env.HASH_SALT || "dev-only-salt-change-me";
const SECRET = process.env.APP_SECRET || "dev-only-secret-change-me";

if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && (!process.env.HASH_SALT || !process.env.APP_SECRET)) {
  console.warn("[guard] HASH_SALT and APP_SECRET must be set in production.");
}

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "0.0.0.0").trim();
}

export const ipHash = (req: Request) => sha256(`${SALT}:${clientIp(req)}`).slice(0, 32);

export function country(req: Request): string | null {
  return req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null;
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  try {
    const o = new URL(origin).host;
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return o === host || isOwnHost(o);
  } catch {
    return false;
  }
}

/* ---------- Signed tokens (confirm / unsubscribe links) ---------- */

export function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url").slice(0, 32);
}

export function verify(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/* ---------- Rate limiting ---------- */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const memory = new Map<string, { count: number; reset: number }>();

async function redis(commands: (string | number)[][]): Promise<{ result: unknown }[] | null> {
  if (!redisUrl || !redisToken) return null;
  try {
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    return res.ok ? ((await res.json()) as { result: unknown }[]) : null;
  } catch {
    return null;
  }
}

/** Fixed-window counter. Returns ok=false once `max` hits happen within `windowSec`. */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<{ ok: boolean; count: number }> {
  const k = `rl:${key}`;
  const r = await redis([
    ["INCR", k],
    ["EXPIRE", k, windowSec, "NX"],
  ]);
  if (r) {
    const count = Number(r[0]?.result ?? 0);
    return { ok: count <= max, count };
  }
  const now = Date.now();
  const entry = memory.get(k);
  if (!entry || entry.reset < now) {
    memory.set(k, { count: 1, reset: now + windowSec * 1000 });
    if (memory.size > 5000) for (const [mk, mv] of memory) if (mv.reset < now) memory.delete(mk);
    return { ok: true, count: 1 };
  }
  entry.count += 1;
  return { ok: entry.count <= max, count: entry.count };
}

/* ---------- Small shared cache (AI answers, counters) ---------- */

const memCache = new Map<string, { v: string; exp: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  const r = await redis([["GET", `c:${key}`]]);
  if (r) return (r[0]?.result as string | null) ?? null;
  const hit = memCache.get(key);
  return hit && hit.exp > Date.now() ? hit.v : null;
}

export async function cacheSet(key: string, value: string, ttlSec: number): Promise<void> {
  const r = await redis([["SET", `c:${key}`, value, "EX", ttlSec]]);
  if (!r) {
    memCache.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
    if (memCache.size > 2000) memCache.delete(memCache.keys().next().value as string);
  }
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
