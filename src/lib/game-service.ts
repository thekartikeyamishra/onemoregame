import { randomInt } from "node:crypto";
import { TtlCache } from "./ttl-cache";
import { hmac, randomCode, randomToken, safeEqual, sha256 } from "./crypto";
import { noAccountEmail, signInEmail } from "./emails";
import { getMailer } from "./mailer";
import { site } from "./site";
import { C, type Store, type Tx } from "./store/types";
import { splitToken } from "./validation";
import type { Ctx, Signup } from "./early-access";
import { ENGINE_VERSION, MAX_RUN_TICKS, RUN_TICKS, TPS, TWISTS, WEEKDAY_TWIST, isTwistId, replay, rulesFor, validateInputLog, type InputLog, type Rules, type RunResult, type TwistId } from "@/game/engine";
import { LEVEL_COUNT, getLevel, starsFor } from "@/game/levels";
import { isSkinId } from "@/game/cosmetics";

export const SESSION_COOKIE = "om_session";
export const SESSION_TTL_MS = 30 * 864e5;
const LOGIN_TTL_MS = 15 * 60 * 1000;
const RUN_START_TTL_MS = 30 * 60 * 1000;
/** Minimum wall-clock share of game time between start and finish (blocks instant fabricated submissions). */
const MIN_REAL_TIME_RATIO = 0.85;
/**
 * Ranked (leaderboard) runs must also finish within this wall-clock budget: game time × 1.5 + 2 min
 * (covers the countdown and normal pauses, but not slow-motion "tool-assisted" play).
 */
export const RANKED_MAX_WALL_MS = (gameMs: number) => gameMs * 1.5 + 120_000;

export type Mode = "quick" | "daily" | "challenge" | "level";

export interface Player extends Record<string, unknown> {
  displayName: string | null;
  runs: number;
  bestScore: number;
  firstRunAt: number | null;
  lastDay: string | null;
  days: number;
  played: boolean;
  repeated: boolean;
  returned: boolean;
  /** Set by an operator: runs still count for personal stats but never appear on leaderboards. */
  leaderboardBanned?: boolean;
  /** Consecutive Daily Arena days. Missing exactly one day is forgiven (the streak continues). */
  streak?: number;
  bestStreak?: number;
  lastDailyDay?: string | null;
  /** Levels mode: highest unlocked level and best score per level. */
  levels?: LevelProgress;
}

export interface LevelProgress { unlocked: number; best: Record<string, number> }

/** Pure: level progress after a Levels-mode run. Clearing level n unlocks n + 1. */
export function levelProgressAfter(prev: LevelProgress | undefined, n: number, score: number): { progress: LevelProgress; passed: boolean; newBest: boolean } {
  const p: LevelProgress = { unlocked: prev?.unlocked ?? 1, best: { ...(prev?.best ?? {}) } };
  const def = getLevel(n);
  const passed = !!def && score >= def.target;
  const newBest = score > (p.best[n] ?? -1);
  if (newBest) p.best[n] = score;
  if (passed) p.unlocked = Math.max(p.unlocked, Math.min(LEVEL_COUNT, n + 1));
  return { progress: p, passed, newBest };
}

export interface LevelResult { n: number; target: number; stars: number; passed: boolean; unlocked: number; best: number }

const EMPTY_PLAYER: Player = { displayName: null, runs: 0, bestScore: 0, firstRunAt: null, lastDay: null, days: 0, played: false, repeated: false, returned: false, streak: 0, bestStreak: 0, lastDailyDay: null };

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
}

/** Pure: player totals after one verified run. Shared by live runs and guest-run claims. */
export function playerAfterRun(prev: Player | null, run: { score: number; mode: Mode; day: string | null }, today: string, now: number): Player {
  const p: Player = { ...EMPTY_PLAYER, ...(prev ?? {}) };
  const days = p.lastDay === today ? p.days : p.days + 1;
  let streak = p.streak ?? 0, lastDailyDay = p.lastDailyDay ?? null;
  if (run.mode === "daily" && run.day && run.day !== lastDailyDay) {
    const gap = lastDailyDay ? dayDiff(lastDailyDay, run.day) : Infinity;
    streak = gap >= 1 && gap <= 2 ? streak + 1 : 1;
    lastDailyDay = run.day;
  }
  return {
    ...p, runs: p.runs + 1, bestScore: Math.max(p.bestScore, run.score), firstRunAt: p.firstRunAt ?? now, lastDay: today, days,
    played: true, repeated: p.runs + 1 >= 2, returned: days >= 2,
    streak, bestStreak: Math.max(p.bestStreak ?? 0, streak), lastDailyDay,
  };
}

/** Streak as displayed today: 0 once more than one day has been missed. */
export function currentStreak(p: Player, today: string): number {
  if (!p.lastDailyDay || !p.streak) return 0;
  return dayDiff(p.lastDailyDay, today) <= 2 ? p.streak : 0;
}

/** Day key in India Standard Time (UTC+05:30), the Daily Arena reset boundary. */
export function dayKey(now = Date.now()): string {
  return new Date(now + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Week key: the Monday (India time) of the week containing `day`. Weekly leaderboards reset Monday 00:00 IST. */
export function weekKey(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
/** The Monday key of the week before. */
export function prevWeekKey(week: string): string {
  const d = new Date(`${week}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}
/** Milliseconds until the next Daily reset (midnight IST). */
export function msToReset(now = Date.now()): number {
  const ist = now + 5.5 * 3600 * 1000;
  return 864e5 - (ist % 864e5);
}

/** Retention (Firestore TTL policies delete documents after `expireAt`). */
const DAY_MS = 864e5;
const RUN_RETENTION_MS = 120 * DAY_MS;
const DAILY_RETENTION_MS = 400 * DAY_MS;
const WEEKLY_RETENTION_MS = 400 * DAY_MS;
const CHALLENGE_RETENTION_MS = 365 * DAY_MS;

/**
 * Run tickets: the start of a run is a signed, self-contained token instead of a database document (saves a write
 * on start and a read + write on finish). Single use is enforced by creating the `runs/{runId}` document.
 */
interface TicketData { r: string; s: string | null; m: Mode; seed: number; d: string | null; tw: TwistId; lv: number | null; c: string | null; t: number }
function signTicket(secret: string, t: TicketData): string {
  const body = Buffer.from(JSON.stringify(t)).toString("base64url");
  return `${body}.${hmac(secret, `run-ticket:${body}`).slice(0, 32)}`;
}
function readTicket(secret: string, raw: unknown): TicketData | null {
  if (typeof raw !== "string" || raw.length > 600) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(secret, `run-ticket:${body}`).slice(0, 32))) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TicketData; } catch { return null; }
}

/** The Daily twist for a day key (weekday in India time). */
export function dailyTwist(day: string): TwistId {
  return WEEKDAY_TWIST[new Date(`${day}T00:00:00Z`).getUTCDay()];
}

export function twistInfo(id: TwistId) {
  const t = TWISTS[id];
  return { id: t.id, name: t.name, description: t.description };
}

export function dailySeed(secret: string, day: string): number {
  return parseInt(hmac(secret, `daily:${day}`).slice(0, 8), 16) % 2147483647;
}

// ---------------------------------------------------------------- sessions

export async function createSession(ctx: Ctx, signupId: string): Promise<{ token: string; expiresAt: number }> {
  const now = ctx.now ?? Date.now();
  const id = randomToken(12), secret = randomToken(24);
  const expiresAt = now + SESSION_TTL_MS;
  await ctx.store.transaction(async (tx) => {
    tx.create(C.sessions, id, { signupId, tokenHash: sha256(secret), createdAt: now, expiresAt, expireAt: new Date(expiresAt) });
  });
  return { token: `${id}.${secret}`, expiresAt };
}

type SessionDoc = { signupId: string; tokenHash: string; expiresAt: number };
const sessionCaches = new WeakMap<Store, TtlCache<SessionDoc>>();
function sessionCache(store: Store) {
  let c = sessionCaches.get(store);
  if (!c) sessionCaches.set(store, (c = new TtlCache<SessionDoc>(60_000, 2000)));
  return c;
}

export async function resolveSession(ctx: Ctx, token: string | undefined | null): Promise<{ sessionId: string; signupId: string } | null> {
  const parts = splitToken(token);
  if (!parts) return null;
  // Sessions are read on every request: keep them for a minute per instance (sign-out clears it on this instance).
  const cache = sessionCache(ctx.store);
  let s = cache.get(parts.id) ?? null;
  if (!s) { s = await ctx.store.get<SessionDoc>(C.sessions, parts.id); if (s) cache.set(parts.id, s); }
  if (!s || !safeEqual(sha256(parts.secret), s.tokenHash) || (ctx.now ?? Date.now()) > s.expiresAt) return null;
  return { sessionId: parts.id, signupId: s.signupId };
}

export async function endSession(ctx: Ctx, token: string | undefined | null) {
  const sess = await resolveSession(ctx, token);
  if (sess) { sessionCache(ctx.store).delete(sess.sessionId); await ctx.store.delete(C.sessions, sess.sessionId); }
}

export type SignInOutcome = "sent" | "cooldown" | "failed";

/**
 * Email a link for this address, whatever its state, so nobody is left waiting for an email that never comes:
 * confirmed → a sign-in link; new or unconfirmed → a confirmation link (confirming also signs in).
 * The response never reveals whether an account exists (same wording either way).
 */
export async function requestSignIn(ctx: Ctx, email: string): Promise<SignInOutcome> {
  const now = ctx.now ?? Date.now();
  const signupId = hmac(ctx.secret, `email:${email}`).slice(0, 40);
  const s = await ctx.store.get<Signup>(C.signups, signupId);
  if (s && s.status !== "verified") {
    // Signed up but never confirmed: send the confirmation link again (confirming also signs in).
    const { requestAccess } = await import("./early-access");
    const r = await requestAccess(ctx, { email, audience: s.audience, updatesConsent: s.updatesConsent, ageConfirmed: true, website: "", source: "sign-in" });
    return r.outcome === "cooldown" || r.outcome === "noop" ? "cooldown" : r.emailAccepted ? "sent" : "failed";
  }
  if (!s) {
    // No account: say so by email (the page shows the same message either way, so nobody can probe addresses).
    // Sign-up stays on the sign-up form, where the 18+ confirmation is required.
    const recent = await ctx.store.get<{ at: number }>(C.mailOutbox, `noacct_${signupId}`);
    if (recent && now - recent.at < 10 * 60_000) return "cooldown";
    const r = await getMailer().send({ to: email, ...noAccountEmail(`${site.url}/early-access?email=${encodeURIComponent(email)}#request`), idempotencyKey: `noacct_${signupId}_${Math.floor(now / 600_000)}` });
    await ctx.store.transaction(async (tx) => { tx.set(C.mailOutbox, `noacct_${signupId}`, { kind: "no-account", status: r.ok ? "sent" : "failed", at: now, expireAt: new Date(now + 864e5) }); });
    return r.ok ? "sent" : "failed";
  }
  const id = randomToken(12), secret = randomToken(24);
  await ctx.store.transaction(async (tx) => {
    tx.create(C.loginTokens, id, { signupId, tokenHash: sha256(secret), expiresAt: now + LOGIN_TTL_MS, usedAt: null, expireAt: new Date(now + LOGIN_TTL_MS + 3600e3) });
  });
  const mail = signInEmail(`${site.url}/play/sign-in/confirm?token=${id}.${secret}`);
  const r = await getMailer().send({ to: s.email, ...mail, idempotencyKey: `login_${id}` });
  return r.ok ? "sent" : "failed";
}

export async function confirmSignIn(ctx: Ctx, token: unknown): Promise<string | null> {
  const parts = splitToken(token);
  if (!parts) return null;
  const now = ctx.now ?? Date.now();
  const signupId = await ctx.store.transaction(async (tx) => {
    const t = await tx.get<{ signupId: string; purpose?: string; tokenHash: string; expiresAt: number; usedAt: number | null }>(C.loginTokens, parts.id);
    if (!t || t.purpose || t.usedAt || now > t.expiresAt || !safeEqual(sha256(parts.secret), t.tokenHash)) return null;
    tx.update(C.loginTokens, parts.id, { usedAt: now });
    return t.signupId;
  });
  return signupId;
}

// ---------------------------------------------------------------- profile

const BLOCKED = /(fuck|shit|bitch|cunt|nigg|fag|rape|nazi|chutiya|madarchod|bhenchod|randi|gandu)/i;

export function cleanDisplayName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().replace(/\s+/g, " ");
  if (!/^[A-Za-z0-9_ .-]{3,16}$/.test(v) || BLOCKED.test(v.replace(/[^a-z]/gi, ""))) return null;
  return v;
}

export async function getPlayer(store: Store, signupId: string): Promise<Player> {
  return { ...EMPTY_PLAYER, ...((await store.get<Player>(C.players, signupId)) ?? {}) };
}

export async function setDisplayName(ctx: Ctx, signupId: string, name: string) {
  await ctx.store.transaction(async (tx) => {
    const cur = await tx.get<Player>(C.players, signupId);
    tx.set(C.players, signupId, { ...(cur ?? (await getPlayer(ctx.store, signupId))), displayName: name });
  });
}

// ---------------------------------------------------------------- runs

export interface Challenge extends Record<string, unknown> {
  seed: number; score: number; ownerId: string | null; twist?: TwistId; level?: number | null;
  /** The challenger's verified input recording, shown as a ghost. Stored only when the player shares. */
  ghost?: InputLog | null; displayName: string | null; referralCode: string | null;
  createdAt: number; attempts: number; beaten: number;
}

export type StartResult =
  | { runId: string; ticket: string; seed: number; mode: Mode; day: string | null; target: number | null; twist: ReturnType<typeof twistInfo>; ghost: InputLog | null; ghostName: string | null; level: LevelInfo | null; rules: Partial<Rules> }
  | { error: "not-found" | "locked" };

export interface LevelInfo { n: number; name: string; description: string; target: number; stars: readonly number[] }
function levelInfo(n: number | null): LevelInfo | null {
  const d = n ? getLevel(n) : null;
  return d ? { n: d.n, name: d.name, description: d.description, target: d.target, stars: d.stars } : null;
}

export async function startRun(ctx: Ctx, signupId: string | null, mode: Mode, challengeId?: string | null, levelNo?: number | null): Promise<StartResult> {
  const now = ctx.now ?? Date.now();
  let seed: number, day: string | null = null, target: number | null = null, twist: TwistId = "classic";
  let ghost: InputLog | null = null, ghostName: string | null = null, level: number | null = null;
  if (mode === "daily") { day = dayKey(now); seed = dailySeed(ctx.secret, day); twist = dailyTwist(day); }
  else if (mode === "level") {
    const def = levelNo ? getLevel(levelNo) : null;
    if (!def) return { error: "not-found" };
    // Guests can try Level 1; confirmed players play any level they have unlocked.
    const unlocked = signupId ? ((await ctx.store.get<Player>(C.players, signupId))?.levels?.unlocked ?? 1) : 1;
    if (def.n > unlocked) return { error: "locked" };
    seed = def.seed; target = def.target; level = def.n;
  }
  else if (mode === "challenge") {
    if (!challengeId || !/^[a-hj-km-np-z2-9]{10}$/.test(challengeId)) return { error: "not-found" };
    const c = await ctx.store.get<Challenge>(C.challenges, challengeId);
    if (!c) return { error: "not-found" };
    seed = c.seed; target = c.score; twist = isTwistId(c.twist) ? c.twist : "classic";
    level = typeof c.level === "number" && getLevel(c.level) ? c.level : null;
    ghost = Array.isArray(c.ghost) ? c.ghost : null; ghostName = c.displayName;
  } else seed = randomInt(1, 2147483647);
  const runId = randomToken(12);
  const ticket = signTicket(ctx.secret, { r: runId, s: signupId, m: mode, seed, d: day, tw: twist, lv: level, c: mode === "challenge" ? challengeId ?? null : null, t: now });
  const info = levelInfo(level);
  return { runId, ticket, seed, mode, day, target, twist: twistInfo(twist), ghost, ghostName, level: info, rules: level ? getLevel(level)!.rules : {} };
}

export type UnrankedReason = "paused-too-long" | "duplicate-inputs" | "leaderboard-banned" | "guest";
export type FinishResult =
  | { status: "ok"; result: RunResult; personalBest: number | null; newBest: boolean; target: number | null; beat: boolean | null; ranked: boolean; unrankedReason: UnrankedReason | null; streak: number | null; guest: boolean; level: LevelResult | null }
  | { status: "invalid" | "mismatch" | "too-fast" | "expired" | "forbidden" | "outdated" };

export async function finishRun(
  ctx: Ctx, signupId: string | null, body: { runId: unknown; ticket?: unknown; inputs: unknown; score: unknown; version: unknown },
): Promise<FinishResult> {
  const now = ctx.now ?? Date.now();
  if (typeof body.runId !== "string" || !/^[A-Za-z0-9_-]{8,40}$/.test(body.runId)) return { status: "invalid" };
  if (body.version !== ENGINE_VERSION) return { status: "outdated" };
  if (!validateInputLog(body.inputs, MAX_RUN_TICKS) || !Number.isInteger(body.score)) return { status: "invalid" };
  const tk = readTicket(ctx.secret, body.ticket);
  if (!tk || tk.r !== body.runId) return { status: "expired" };
  const start = { signupId: tk.s, mode: tk.m, seed: tk.seed, day: tk.d, twist: tk.tw, level: tk.lv, challengeId: tk.c, startedAt: tk.t };
  if (now - start.startedAt > RUN_START_TTL_MS || now < start.startedAt) return { status: "expired" };
  if (start.signupId !== signupId) return { status: "forbidden" };

  const twist: TwistId = isTwistId(start.twist) ? start.twist : "classic";
  const levelDef = start.level ? getLevel(start.level) : null;
  const levelRules = levelDef?.rules ?? {};
  if (!validateInputLog(body.inputs, rulesFor(twist, levelRules).durationTicks)) return { status: "invalid" };
  const result = replay(start.seed, body.inputs as InputLog, twist, levelRules);
  if (result.score !== body.score) return { status: "mismatch" };
  if (now - start.startedAt < (result.ticks / TPS) * 1000 * MIN_REAL_TIME_RATIO) return { status: "too-fast" };

  const runId = body.runId;
  const day = dayKey(now);
  const elapsed = now - start.startedAt;
  // Anti-cheat signals for ranked Daily runs. They don't reject the run (it's a valid replay); they keep it off the leaderboard.
  const inputHash = sha256(JSON.stringify(body.inputs));
  let unrankedReason: UnrankedReason | null = null;
  if (start.mode === "daily") {
    if (elapsed > RANKED_MAX_WALL_MS((result.ticks / TPS) * 1000)) unrankedReason = "paused-too-long";
    else {
      const twins = await ctx.store.query<{ signupId: string | null }>(C.runs, { where: [["seed", start.seed], ["inputHash", inputHash]], limit: 5 });
      if (twins.some((t) => t.data.signupId !== signupId)) unrankedReason = "duplicate-inputs";
    }
  }
  return ctx.store.transaction<FinishResult>(async (tx) => {
    if (await tx.get(C.runs, runId)) return { status: "expired" }; // already submitted (tickets are single use)
    const player = signupId ? (await tx.get<Player>(C.players, signupId)) : null;
    const dailyId = signupId && start.mode === "daily" && start.day ? `${start.day}_${signupId}` : null;
    const daily = dailyId ? await tx.get<{ score: number }>(C.dailyScores, dailyId) : null;
    const weeklyId = dailyId ? `${weekKey(start.day!)}_${signupId}` : null;
    const weekly = weeklyId ? await tx.get<WeeklyDoc>(C.weeklyScores, weeklyId) : null;
    const challenge = start.challengeId ? await tx.get<Challenge>(C.challenges, start.challengeId) : null;

    if (dailyId && player?.leaderboardBanned && !unrankedReason) unrankedReason = "leaderboard-banned";
    tx.create(C.runs, runId, {
      signupId, mode: start.mode, seed: start.seed, day: start.day, twist, level: levelDef?.n ?? null, challengeId: start.challengeId,
      score: result.score, ticks: result.ticks, pickups: result.pickups, hits: result.hits, nearMisses: result.nearMisses,
      maxCombo: result.maxCombo, powerUps: result.powerUps, shieldBlocks: result.shieldBlocks, inputEvents: result.inputEvents,
      inputHash, elapsedMs: elapsed, engine: ENGINE_VERSION, createdAt: now,
      // rankEligible: passed integrity checks; a guest Daily run can still be claimed onto the leaderboard after sign-up.
      rankEligible: start.mode === "daily" ? unrankedReason === null : null,
      ranked: start.mode === "daily" ? unrankedReason === null && !!signupId : null, unrankedReason,
      claimedAt: null, expireAt: new Date(now + RUN_RETENTION_MS),
    });

    let personalBest: number | null = null, newBest = false, streak: number | null = null;
    let levelResult: LevelResult | null = null;
    if (!signupId && start.mode === "level" && levelDef) {
      // Guests see their result; progress is saved when they confirm an email (see claimGuestRun).
      const passed = result.score >= levelDef.target;
      levelResult = { n: levelDef.n, target: levelDef.target, stars: starsFor(levelDef, result.score), passed, unlocked: passed ? Math.min(LEVEL_COUNT, levelDef.n + 1) : 1, best: result.score };
    }
    if (signupId) {
      const next = playerAfterRun(player, { score: result.score, mode: start.mode, day: start.day }, day, now);
      if (start.mode === "level" && levelDef) {
        const lp = levelProgressAfter(player?.levels, levelDef.n, result.score);
        next.levels = lp.progress;
        levelResult = { n: levelDef.n, target: levelDef.target, stars: starsFor(levelDef, result.score), passed: lp.passed, unlocked: lp.progress.unlocked, best: lp.progress.best[levelDef.n] };
      }
      newBest = result.score > (player?.bestScore ?? 0);
      personalBest = next.bestScore;
      streak = currentStreak(next, day);
      tx.set(C.players, signupId, next);
      if (dailyId && !unrankedReason && (!daily || result.score > daily.score)) {
        writeDailyBest(tx, ctx.store, { day: start.day!, signupId, displayName: next.displayName, score: result.score, prev: daily?.score ?? 0, runId, streak, now, weekly, flair: flair(next) });
      }
    }
    let beat: boolean | null = null;
    if (challenge && start.challengeId) {
      beat = result.score > challenge.score;
      tx.update(C.challenges, start.challengeId, { attempts: challenge.attempts + 1, beaten: challenge.beaten + (beat ? 1 : 0) });
      challengeCache(ctx.store).delete(start.challengeId);
    }
    const guestDaily = !signupId && start.mode === "daily";
    return {
      status: "ok", result, personalBest, newBest, target: challenge?.score ?? null, beat,
      ranked: start.mode === "daily" && !unrankedReason && !!signupId,
      unrankedReason: guestDaily && !unrankedReason ? "guest" : unrankedReason, streak, guest: !signupId, level: levelResult,
    };
  });
}

/** Create a shareable challenge from a verified run. Guests can share their own (unclaimed) runs too; the run ID is the proof of ownership. */
export async function createChallenge(ctx: Ctx, signupId: string | null, runId: unknown, inputs?: unknown): Promise<string | null> {
  if (typeof runId !== "string" || !/^[A-Za-z0-9_-]{8,40}$/.test(runId)) return null;
  const run = await ctx.store.get<{ signupId: string | null; seed: number; score: number; twist?: TwistId; level?: number | null; challengeId?: string | null }>(C.runs, runId);
  if (!run || run.signupId !== signupId) return null;
  const twist: TwistId = isTwistId(run.twist) ? run.twist : "classic";
  // The ghost recording is re-verified: it must replay to exactly this run's score.
  const levelRules = run.level ? getLevel(run.level)?.rules ?? {} : {};
  const ghost = validateInputLog(inputs, rulesFor(twist, levelRules).durationTicks) && replay(run.seed, inputs, twist, levelRules).score === run.score ? inputs : null;
  const [player, signup] = signupId ? await Promise.all([getPlayer(ctx.store, signupId), ctx.store.get<Signup>(C.signups, signupId)]) : [null, null];
  const id = randomCode(10);
  await ctx.store.transaction(async (tx) => {
    tx.create(C.challenges, id, {
      expireAt: new Date((ctx.now ?? Date.now()) + CHALLENGE_RETENTION_MS),
      seed: run.seed, score: run.score, twist, level: run.level ?? null, ghost, ownerId: signupId, displayName: player?.displayName ?? null, referralCode: signup?.referralCode ?? null,
      createdAt: ctx.now ?? Date.now(), attempts: 0, beaten: 0,
    } satisfies Challenge);
  });
  return id;
}

export async function getChallengePublic(store: Store, id: string) {
  return challengeCache(store).getOrLoad(id, () => loadChallengePublic(store, id));
}

/** Challenge cards are effectively immutable (only the attempt counter changes): cache for 30 s per instance. */
const challengeCaches = new WeakMap<Store, TtlCache<Awaited<ReturnType<typeof loadChallengePublic>>>>();
function challengeCache(store: Store) {
  let c = challengeCaches.get(store);
  if (!c) challengeCaches.set(store, (c = new TtlCache(30_000)));
  return c;
}

async function loadChallengePublic(store: Store, id: string) {
  if (!/^[a-hj-km-np-z2-9]{10}$/.test(id)) return null;
  const c = await store.get<Challenge>(C.challenges, id);
  return c ? { score: c.score, displayName: c.displayName, referralCode: c.referralCode, attempts: c.attempts, hasGhost: Array.isArray(c.ghost), twist: twistInfo(isTwistId(c.twist) ? c.twist : "classic") } : null;
}

// ------------------------------------------------------------------------------------------------- leaderboards
/**
 * Two boards: Today (best run of the day) and This week (sum of your best score on each day, Monday–Sunday IST,
 * so coming back every day is what wins the week). Public top lists are identical for everyone: they are cached
 * per instance and at the CDN. Personal standing (rank, the player just ahead/behind) costs ~3 small reads.
 */
export type BoardScope = "day" | "week";
export interface WeeklyDoc extends Record<string, unknown> { week: string; signupId: string; displayName: string | null; score: number; days: Record<string, number>; streak: number; updatedAt: number }
interface BoardRow extends Record<string, unknown> { displayName: string | null; score: number; signupId: string; streak?: number; days?: Record<string, number>; badge?: string | null; skin?: string | null }
type TopRow = { id: string; data: BoardRow };
const BOARD = { day: { col: C.dailyScores, field: "day" }, week: { col: C.weeklyScores, field: "week" } } as const;

const topCaches = new WeakMap<Store, TtlCache<TopRow[]>>();
const countCaches = new WeakMap<Store, TtlCache<number>>();
function topCache(store: Store) {
  let c = topCaches.get(store);
  if (!c) topCaches.set(store, (c = new TtlCache<TopRow[]>(10_000)));
  return c;
}
const champCaches = new WeakMap<Store, TtlCache<TopRow[]>>();
function champCache(store: Store) {
  let c = champCaches.get(store);
  if (!c) champCaches.set(store, (c = new TtlCache<TopRow[]>(600_000, 20)));
  return c;
}
function countCache(store: Store) {
  let c = countCaches.get(store);
  if (!c) countCaches.set(store, (c = new TtlCache<number>(30_000, 1000)));
  return c;
}

export function invalidateLeaderboard(store: Store, day: string) {
  topCache(store).delete(`day:${day}`);
  topCache(store).delete(`week:${weekKey(day)}`);
}

/** Writes a new daily best and updates the weekly total in the same transaction (reads were done by the caller). */
/** Cosmetic flair copied onto leaderboard rows when a score is written (no extra reads when the board is shown). */
function flair(p: Player): { badge: string | null; skin: string | null } {
  const skin = (p.equipped as { skin?: unknown } | undefined)?.skin;
  return { badge: typeof p.badge === "string" ? p.badge : null, skin: typeof skin === "string" && skin !== "classic" ? skin : null };
}

function writeDailyBest(tx: Tx, store: Store, a: { day: string; signupId: string; displayName: string | null; score: number; prev: number; runId: string; streak: number | null; now: number; weekly: WeeklyDoc | null; flair?: { badge: string | null; skin: string | null } }) {
  const week = weekKey(a.day);
  const fl = a.flair ?? { badge: null, skin: null };
  tx.set(C.dailyScores, `${a.day}_${a.signupId}`, {
    day: a.day, week, signupId: a.signupId, displayName: a.displayName, score: a.score, runId: a.runId, streak: a.streak ?? 0, ...fl,
    updatedAt: a.now, expireAt: new Date(a.now + DAILY_RETENTION_MS),
  });
  const days = { ...(a.weekly?.days ?? {}), [a.day]: a.score };
  const total = Object.values(days).reduce((x, y) => x + y, 0);
  tx.set(C.weeklyScores, `${week}_${a.signupId}`, {
    week, signupId: a.signupId, displayName: a.displayName, score: total, days, streak: a.streak ?? 0, ...fl,
    updatedAt: a.now, expireAt: new Date(a.now + WEEKLY_RETENTION_MS),
  });
  invalidateLeaderboard(store, a.day); // the player sees their own new score immediately on this instance
}

function competitionRanks(rows: TopRow[]) {
  let rank = 0, prev = Infinity;
  return rows.map((r, i) => { if (r.data.score !== prev) { rank = i + 1; prev = r.data.score; } return rank; });
}

/** Public board: top 20 with ranks (ties share a rank), number of players, time to reset. */
export async function board(store: Store, scope: BoardScope, key: string, now = Date.now()) {
  const b = BOARD[scope];
  const top = await topCache(store).getOrLoad(`${scope}:${key}`, () => store.query<BoardRow>(b.col, {
    where: [[b.field, key]], orderBy: { field: "score", direction: "desc" }, limit: 20,
  }));
  const players = await countCache(store).getOrLoad(`n:${scope}:${key}`, () => store.count(b.col, [[b.field, key]]));
  const ranks = competitionRanks(top);
  // Weekly board also shows last week's podium ("be next week's champion"): a finished week never changes, so it is
  // cached for 10 minutes per instance.
  let champions: Array<{ rank: number; name: string; score: number }> | undefined;
  if (scope === "week") {
    const prev = prevWeekKey(key);
    const podium = await champCache(store).getOrLoad(prev, () => store.query<BoardRow>(b.col, { where: [[b.field, prev]], orderBy: { field: "score", direction: "desc" }, limit: 3 }));
    const pr = competitionRanks(podium);
    champions = podium.map((r, i) => ({ rank: pr[i], name: r.data.displayName ?? "Anonymous player", score: r.data.score }));
  }
  const reset = scope === "day" ? msToReset(now) : msToReset(now) + ((7 - ((new Date(`${dayKey(now)}T00:00:00Z`).getUTCDay() + 6) % 7) - 1) * DAY_MS);
  return {
    scope, key, players: Math.max(players, top.length), resetsInMs: reset, ...(champions ? { champions } : {}),
    entries: top.map((r, i) => ({ rank: ranks[i], id: r.data.signupId.slice(0, 8), name: r.data.displayName ?? "Anonymous player", score: r.data.score, streak: r.data.streak ?? 0, days: r.data.days ? Object.keys(r.data.days).length : undefined, badge: r.data.badge === "founder" ? "founder" : null, skin: isSkinId(r.data.skin) && r.data.skin !== "classic" ? r.data.skin : null })),
  };
}

/** A signed-in player's position: rank, and the players just ahead and behind (the "one more" targets). */
export async function standing(store: Store, scope: BoardScope, key: string, signupId: string) {
  const b = BOARD[scope];
  const mine = await store.get<BoardRow>(b.col, `${key}_${signupId}`);
  const players = await countCache(store).getOrLoad(`n:${scope}:${key}`, () => store.count(b.col, [[b.field, key]]));
  if (!mine) return { scope, key, score: null, rank: null, players, ahead: null, behind: null, id: signupId.slice(0, 8) };
  const [above, ahead, behind] = await Promise.all([
    store.count(b.col, [[b.field, key]], { field: "score", op: ">", value: mine.score }),
    store.query<BoardRow>(b.col, { where: [[b.field, key]], range: { field: "score", op: ">", value: mine.score }, orderBy: { field: "score", direction: "asc" }, limit: 1 }),
    store.query<BoardRow>(b.col, { where: [[b.field, key]], range: { field: "score", op: "<", value: mine.score }, orderBy: { field: "score", direction: "desc" }, limit: 1 }),
  ]);
  const near = (r?: { data: BoardRow }) => (r ? { name: r.data.displayName ?? "Anonymous player", score: r.data.score, gap: Math.abs(r.data.score - mine.score) } : null);
  return { scope, key, score: mine.score, rank: above + 1, players: Math.max(players, above + 1), ahead: near(ahead[0]), behind: near(behind[0]), id: signupId.slice(0, 8) };
}

/** Where a score would place today (for guests: "this run would be #14 — claim it"). Cached per score for 30 s. */
export async function wouldRank(store: Store, day: string, score: number) {
  const s = Math.max(0, Math.floor(score));
  const above = await countCache(store).getOrLoad(`r:${day}:${s}`, () => store.count(C.dailyScores, [["day", day]], { field: "score", op: ">", value: s }));
  const players = await countCache(store).getOrLoad(`n:day:${day}`, () => store.count(C.dailyScores, [["day", day]]));
  return { day, rank: above + 1, players: Math.max(players, above + 1) };
}

/** Compatibility wrapper (MCP server, older callers): today's board plus the caller's own score. */
export async function leaderboard(store: Store, day: string, signupId: string | null) {
  const b = await board(store, "day", day);
  const mine = signupId ? await store.get<{ score: number }>(C.dailyScores, `${day}_${signupId}`) : null;
  const me = signupId?.slice(0, 8);
  return { day, entries: b.entries.map((e) => ({ rank: e.rank, name: e.name, score: e.score, me: e.id === me })), myScore: mine?.score ?? null };
}

export async function saveFeedback(ctx: Ctx, signupId: string | null, body: { runId: unknown; wouldReplay: unknown; note: unknown }) {
  if (typeof body.wouldReplay !== "boolean") return false;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  const runId = typeof body.runId === "string" && body.runId.length <= 40 ? body.runId : null;
  await ctx.store.add(C.feedback, { signupId, runId, wouldReplay: body.wouldReplay, note, createdAt: ctx.now ?? Date.now() });
  return true;
}

/**
 * After a guest confirms their email, attach the guest run they chose to save (their personal stats, and today's
 * leaderboard if it is still today's arena and passed the integrity checks). Single use; returns the score or null.
 */
export async function claimGuestRun(ctx: Ctx, signupId: string): Promise<number | null> {
  const now = ctx.now ?? Date.now();
  const today = dayKey(now);
  return ctx.store.transaction(async (tx) => {
    const s = await tx.get<Signup>(C.signups, signupId);
    const runId = s?.claimRunId as string | null | undefined;
    if (!s || !runId) return null;
    const run = await tx.get<{ signupId: string | null; claimedAt: number | null; mode: Mode; day: string | null; score: number; rankEligible: boolean | null; level?: number | null }>(C.runs, runId);
    const player = await tx.get<Player>(C.players, signupId);
    const dailyId = run?.mode === "daily" && run.day === today && run.rankEligible ? `${today}_${signupId}` : null;
    const daily = dailyId ? await tx.get<{ score: number }>(C.dailyScores, dailyId) : null;
    const weekly = dailyId ? await tx.get<WeeklyDoc>(C.weeklyScores, `${weekKey(today)}_${signupId}`) : null;
    tx.update(C.signups, signupId, { claimRunId: null });
    if (!run || run.signupId !== null || run.claimedAt) return null;
    const next = playerAfterRun(player, run, today, now);
    if (run.mode === "level" && run.level) next.levels = levelProgressAfter(player?.levels, run.level, run.score).progress;
    tx.set(C.players, signupId, next);
    tx.update(C.runs, runId, { signupId, claimedAt: now, ranked: !!dailyId && !player?.leaderboardBanned });
    if (dailyId && !player?.leaderboardBanned && (!daily || run.score > daily.score)) {
      writeDailyBest(tx, ctx.store, { day: today, signupId, displayName: next.displayName, score: run.score, prev: daily?.score ?? 0, runId, streak: currentStreak(next, today), now, weekly, flair: flair(next) });
    }
    return run.score;
  });
}

/** Operator review of a day's leaderboard with the stats needed to spot implausible runs. */
export async function reviewDay(store: Store, day: string) {
  const lb = await store.query<{ signupId: string; displayName: string | null; score: number; runId: string }>(C.dailyScores, {
    where: [["day", day]], orderBy: { field: "score", direction: "desc" }, limit: 50,
  });
  // One batched read for all runs (no N+1).
  const runs = await store.getMany<Record<string, unknown>>(C.runs, lb.map((e) => e.data.runId));
  return lb.map((e, i) => {
    const run = runs[i];
    return { rank: i + 1, signupId: e.data.signupId, name: e.data.displayName, score: e.data.score,
      hits: run?.hits, pickups: run?.pickups, maxCombo: run?.maxCombo, powerUps: run?.powerUps, inputEvents: run?.inputEvents,
      seconds: run ? Math.round(Number(run.ticks) / TPS) : null, wallSeconds: run ? Math.round(Number(run.elapsedMs) / 1000) : null };
  });
}

/** Operator action: remove a player from leaderboards (their daily entries are deleted, future runs unranked). */
export async function banFromLeaderboard(store: Store, signupId: string) {
  const entries = await store.query<{ day: string }>(C.dailyScores, { where: [["signupId", signupId]], limit: 500 });
  const weeks = await store.query<{ week: string }>(C.weeklyScores, { where: [["signupId", signupId]], limit: 200 });
  await Promise.all([...entries.map((e) => store.delete(C.dailyScores, e.id)), ...weeks.map((e) => store.delete(C.weeklyScores, e.id))]);
  for (const e of entries) invalidateLeaderboard(store, e.data.day);
  await store.transaction(async (tx) => {
    const p = await tx.get<Player>(C.players, signupId);
    tx.set(C.players, signupId, { ...(p ?? { displayName: null, runs: 0, bestScore: 0, firstRunAt: null, lastDay: null, days: 0, played: false, repeated: false, returned: false }), leaderboardBanned: true });
  });
  return entries.length;
}

export async function playMetrics(store: Store) {
  const [players, repeated, returned, guestRuns, totalRuns, yes, no, challenges, claimed] = await Promise.all([
    store.count(C.players, [["played", true]]),
    store.count(C.players, [["repeated", true]]),
    store.count(C.players, [["returned", true]]),
    store.count(C.runs, [["signupId", null]]),
    store.count(C.runs, []),
    store.count(C.feedback, [["wouldReplay", true]]),
    store.count(C.feedback, [["wouldReplay", false]]),
    store.count(C.challenges, []),
    store.count(C.runs, [["mode", "daily"], ["ranked", true]]),
  ]);
  return { playersWithFirstRun: players, playersWithRepeatPlay: repeated, playersReturnedOnAnotherDay: returned, totalRuns, unclaimedGuestRuns: guestRuns, rankedDailyRuns: claimed, challengesCreated: challenges, feedbackWouldReplay: yes, feedbackWouldNotReplay: no };
}

export { RUN_TICKS };
