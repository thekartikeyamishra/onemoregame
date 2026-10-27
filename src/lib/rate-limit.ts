import { C, type Store } from "./store/types";

export interface Limit {
  name: string;
  max: number;
  windowMs: number;
}

export const limits = {
  waitlistPerIp: { name: "wl-ip", max: 40, windowMs: 60 * 60 * 1000 },
  campusPerIp: { name: "cc-ip", max: 10, windowMs: 60 * 60 * 1000 },
  verifyPerIp: { name: "vf-ip", max: 30, windowMs: 60 * 60 * 1000 },
  invitePerIp: { name: "iv-ip", max: 20, windowMs: 60 * 60 * 1000 },
  signInPerIp: { name: "si-ip", max: 30, windowMs: 60 * 60 * 1000 },
  runStartPerIp: { name: "rs-ip", max: 600, windowMs: 60 * 60 * 1000 },
  runStartPerPlayer: { name: "rs-pl", max: 240, windowMs: 60 * 60 * 1000 },
  guestRunPerIp: { name: "gr-ip", max: 120, windowMs: 60 * 60 * 1000 },
  challengePerIp: { name: "ch-ip", max: 30, windowMs: 60 * 60 * 1000 },
  feedbackPerIp: { name: "fb-ip", max: 30, windowMs: 60 * 60 * 1000 },
  mcpPerIp: { name: "mcp-ip", max: 300, windowMs: 60 * 60 * 1000 },
  runFinishPerIp: { name: "rf-ip", max: 400, windowMs: 60 * 60 * 1000 },
  rankPerIp: { name: "rk-ip", max: 300, windowMs: 60 * 60 * 1000 },
  battleCreatePerIp: { name: "bc-ip", max: 20, windowMs: 60 * 60 * 1000 },
  battleJoinPerIp: { name: "bj-ip", max: 60, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, Limit>;

/**
 * Per-instance fixed-window limiter (no database cost). Used on hot game paths where every run is verified anyway
 * and a limit only needs to stop floods; Firestore-backed `consume` stays on email and creation endpoints.
 */
const local = new Map<string, { w: number; n: number }>();
export function localAllow(limit: Limit, subject: string, now = Date.now()): boolean {
  const w = Math.floor(now / limit.windowMs), key = `${limit.name}:${subject}`;
  const e = local.get(key);
  if (!e || e.w !== w) {
    if (local.size > 20000) for (const [k, v] of local) if (v.w !== w) local.delete(k);
    local.set(key, { w, n: 1 });
    return true;
  }
  return ++e.n <= limit.max;
}

/** Fixed-window counter. `subject` must already be a hash (never a raw IP or email). */
export async function consume(store: Store, limit: Limit, subject: string, now = Date.now()): Promise<boolean> {
  const window = Math.floor(now / limit.windowMs);
  const id = `${limit.name}_${subject.slice(0, 40)}_${window}`;
  return store.transaction(async (tx) => {
    const cur = await tx.get<{ count: number }>(C.rateLimits, id);
    const count = (cur?.count ?? 0) + 1;
    if (count > limit.max) return false;
    // expireAt is a Date so a Firestore TTL policy can delete old windows automatically.
    tx.set(C.rateLimits, id, { count, expireAt: new Date((window + 2) * limit.windowMs) });
    return true;
  });
}
