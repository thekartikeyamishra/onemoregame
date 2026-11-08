import { createHash } from "node:crypto";
import { C } from "./store/types";
import type { Ctx } from "./early-access";
import { dailyTwist, dayKey, twistInfo } from "./game-service";

/**
 * Web Push reminders: the external trigger of the habit loop (Hooked: trigger → action → reward → investment).
 * - Opt-in only, asked right after a Daily run (peak motivation), never on page load.
 * - Works for guests too (keyed by the push endpoint, no account or email needed).
 * - At most one notification per day, at the hour the player chose, and only if they haven't played yet today.
 * - Stops after 14 quiet days, deletes the subscription after 30 or when the browser revokes it.
 */

export const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/, /^push\.services\.mozilla\.com$/,
];

export interface PushSubscriptionJSON { endpoint: string; keys: { p256dh: string; auth: string } }
export interface PushDoc extends Record<string, unknown> {
  endpoint: string; keys: { p256dh: string; auth: string }; hourUtc: number; signupId: string | null;
  lastPlayDay: string | null; streak: number; sentDay: string | null; createdAt: number; updatedAt: number;
}

export function pushConfig(env: Record<string, string | undefined> = process.env) {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null, privateKey = env.VAPID_PRIVATE_KEY?.trim() || null;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT?.trim() || "mailto:support@onemoregame.me", enabled: !!(publicKey && privateKey) };
}

export const subId = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 40);
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** Accept only real browser push services (never let the server be pointed at arbitrary URLs: SSRF). */
export function parseSubscription(v: unknown): PushSubscriptionJSON | null {
  const s = v as Partial<PushSubscriptionJSON> | null;
  if (!s || typeof s.endpoint !== "string" || s.endpoint.length > 1000 || !s.keys) return null;
  let u: URL;
  try { u = new URL(s.endpoint); } catch { return null; }
  if (u.protocol !== "https:" || u.port || u.username || !PUSH_HOSTS.some((r) => r.test(u.hostname))) return null;
  const { p256dh, auth } = s.keys as { p256dh?: unknown; auth?: unknown };
  if (typeof p256dh !== "string" || typeof auth !== "string" || !B64URL.test(p256dh) || !B64URL.test(auth) || p256dh.length < 60 || p256dh.length > 120 || auth.length < 16 || auth.length > 40) return null;
  return { endpoint: s.endpoint, keys: { p256dh, auth } };
}

const isDay = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const hour = (h: unknown) => (Number.isInteger(h) && (h as number) >= 0 && (h as number) <= 23 ? (h as number) : 13); // 13 UTC = 6:30 pm IST

export async function saveSubscription(ctx: Ctx, sub: PushSubscriptionJSON, o: { hourUtc?: unknown; signupId?: string | null; day?: unknown; streak?: unknown }) {
  const now = ctx.now ?? Date.now(), id = subId(sub.endpoint);
  await ctx.store.transaction(async (tx) => {
    const cur = await tx.get<PushDoc>(C.pushSubs, id);
    tx.set(C.pushSubs, id, {
      endpoint: sub.endpoint, keys: sub.keys, hourUtc: hour(o.hourUtc), signupId: o.signupId ?? cur?.signupId ?? null,
      lastPlayDay: isDay(o.day) ? o.day : cur?.lastPlayDay ?? null, streak: clampStreak(o.streak, cur?.streak),
      sentDay: cur?.sentDay ?? null, createdAt: cur?.createdAt ?? now, updatedAt: now,
    } satisfies PushDoc);
  });
  return id;
}
const clampStreak = (v: unknown, fallback = 0) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 10000 ? (v as number) : fallback);

/** After each Daily run: remember the player played today (so today's reminder is skipped). */
export async function touchSubscription(ctx: Ctx, endpoint: string, day: unknown, streak: unknown): Promise<boolean> {
  if (!isDay(day)) return false;
  const id = subId(endpoint);
  return ctx.store.transaction(async (tx) => {
    const cur = await tx.get<PushDoc>(C.pushSubs, id);
    if (!cur || cur.endpoint !== endpoint) return false;
    tx.update(C.pushSubs, id, { lastPlayDay: day, streak: clampStreak(streak, cur.streak), updatedAt: ctx.now ?? Date.now() });
    return true;
  });
}

export async function removeSubscription(ctx: Ctx, endpoint: string) {
  await ctx.store.transaction(async (tx) => { tx.delete(C.pushSubs, subId(endpoint)); });
}

export interface PushMessage { title: string; body: string; url: string; tag: string }
export function reminderFor(d: PushDoc, today: string): PushMessage {
  const twist = twistInfo(dailyTwist(today));
  const url = "/play?utm_source=push&utm_medium=reminder";
  if (d.streak >= 2 && d.lastPlayDay) {
    return { title: `🔥 ${d.streak}-day streak on the line`, body: `Today's arena: ${twist.name}. One 60-second run keeps it alive.`, url, tag: "om-daily" };
  }
  return { title: `Today's arena is live: ${twist.name}`, body: `${twist.description} One run. Sixty seconds. Beat your best.`, url, tag: "om-daily" };
}

export type Sender = (sub: PushSubscriptionJSON, msg: PushMessage) => Promise<{ ok: true } | { ok: false; gone: boolean }>;

export interface PushReport { checked: number; sent: number; skipped: number; removed: number; failed: number }

/** Called hourly: remind this hour's subscribers who haven't played today. */
export async function runPushReminders(ctx: Ctx, send: Sender, cap = 2000): Promise<PushReport> {
  const now = ctx.now ?? Date.now(), today = dayKey(now), h = new Date(now).getUTCHours();
  const rows = await ctx.store.query<PushDoc>(C.pushSubs, { where: [["hourUtc", h]], limit: cap });
  const r: PushReport = { checked: 0, sent: 0, skipped: 0, removed: 0, failed: 0 };
  for (const row of rows) {
    r.checked++;
    const d = row.data;
    const quietDays = d.lastPlayDay ? Math.round((Date.parse(today) - Date.parse(d.lastPlayDay)) / 864e5) : Math.round((now - d.createdAt) / 864e5);
    if (quietDays > 30) { await ctx.store.transaction(async (tx) => { tx.delete(C.pushSubs, row.id); }); r.removed++; continue; }
    if (d.lastPlayDay === today || d.sentDay === today || quietDays > 14) { r.skipped++; continue; }
    // Claim first: a retried cron run never double-notifies.
    const claimed = await ctx.store.transaction(async (tx) => {
      const cur = await tx.get<PushDoc>(C.pushSubs, row.id);
      if (!cur || cur.sentDay === today || cur.lastPlayDay === today) return false;
      tx.update(C.pushSubs, row.id, { sentDay: today });
      return true;
    });
    if (!claimed) { r.skipped++; continue; }
    const res = await send({ endpoint: d.endpoint, keys: d.keys }, reminderFor(d, today));
    if (res.ok) r.sent++;
    else if (res.gone) { await ctx.store.transaction(async (tx) => { tx.delete(C.pushSubs, row.id); }); r.removed++; }
    else r.failed++;
  }
  return r;
}

/** Real sender (web-push, VAPID). Imported lazily so the library only loads in the cron route. */
export async function webPushSender(): Promise<Sender | null> {
  const cfg = pushConfig();
  if (!cfg.enabled) return null;
  const wp = (await import("web-push")).default;
  wp.setVapidDetails(cfg.subject, cfg.publicKey!, cfg.privateKey!);
  return async (sub, msg) => {
    try {
      await wp.sendNotification(sub, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "normal", topic: msg.tag, timeout: 10_000 });
      return { ok: true };
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      return { ok: false, gone: code === 404 || code === 410 };
    }
  };
}
