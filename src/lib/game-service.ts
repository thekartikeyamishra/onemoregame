import { randomInt } from "node:crypto";
import { TtlCache } from "./ttl-cache";
import { hmac, randomCode, randomToken, safeEqual, sha256 } from "./crypto";
import { signInEmail } from "./emails";
import { getMailer } from "./mailer";
import { site } from "./site";
import { C, type Store } from "./store/types";
import { splitToken } from "./validation";
import type { Ctx, Signup } from "./early-access";
import { ENGINE_VERSION, RUN_TICKS, TPS, TWISTS, WEEKDAY_TWIST, isTwistId, replay, validateInputLog, type InputLog, type RunResult, type TwistId } from "@/game/engine";

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

export type Mode = "quick" | "daily" | "challenge";

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
}

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

export async function resolveSession(ctx: Ctx, token: string | undefined | null): Promise<{ sessionId: string; signupId: string } | null> {
  const parts = splitToken(token);
  if (!parts) return null;
  const s = await ctx.store.get<{ signupId: string; tokenHash: string; expiresAt: number }>(C.sessions, parts.id);
  if (!s || !safeEqual(sha256(parts.secret), s.tokenHash) || (ctx.now ?? Date.now()) > s.expiresAt) return null;
  return { sessionId: parts.id, signupId: s.signupId };
}

export async function endSession(ctx: Ctx, token: string | undefined | null) {
  const sess = await resolveSession(ctx, token);
  if (sess) await ctx.store.delete(C.sessions, sess.sessionId);
}

/** Email a sign-in link to an accepted playtester. Always resolves silently (no enumeration). */
export async function requestSignIn(ctx: Ctx, email: string): Promise<void> {
  const now = ctx.now ?? Date.now();
  const signupId = hmac(ctx.secret, `email:${email}`).slice(0, 40);
  const s = await ctx.store.get<Signup>(C.signups, signupId);
  if (!s || s.status !== "verified") return;
  const id = randomToken(12), secret = randomToken(24);
  await ctx.store.transaction(async (tx) => {
    tx.create(C.loginTokens, id, { signupId, tokenHash: sha256(secret), expiresAt: now + LOGIN_TTL_MS, usedAt: null, expireAt: new Date(now + LOGIN_TTL_MS + 3600e3) });
  });
  const mail = signInEmail(`${site.url}/play/sign-in/confirm?token=${id}.${secret}`);
  await getMailer().send({ to: s.email, ...mail, idempotencyKey: `login_${id}` });
}

export async function confirmSignIn(ctx: Ctx, token: unknown): Promise<string | null> {
  const parts = splitToken(token);
  if (!parts) return null;
  const now = ctx.now ?? Date.now();
  const signupId = await ctx.store.transaction(async (tx) => {
    const t = await tx.get<{ signupId: string; tokenHash: string; expiresAt: number; usedAt: number | null }>(C.loginTokens, parts.id);
    if (!t || t.usedAt || now > t.expiresAt || !safeEqual(sha256(parts.secret), t.tokenHash)) return null;
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
  seed: number; score: number; ownerId: string | null; twist?: TwistId;
  /** The challenger's verified input recording, shown as a ghost. Stored only when the player shares. */
  ghost?: InputLog | null; displayName: string | null; referralCode: string | null;
  createdAt: number; attempts: number; beaten: number;
}

export type StartResult =
  | { runId: string; seed: number; mode: Mode; day: string | null; target: number | null; twist: ReturnType<typeof twistInfo>; ghost: InputLog | null; ghostName: string | null }
  | { error: "not-found" };

export async function startRun(ctx: Ctx, signupId: string | null, mode: Mode, challengeId?: string | null): Promise<StartResult> {
  const now = ctx.now ?? Date.now();
  let seed: number, day: string | null = null, target: number | null = null, twist: TwistId = "classic";
  let ghost: InputLog | null = null, ghostName: string | null = null;
  if (mode === "daily") { day = dayKey(now); seed = dailySeed(ctx.secret, day); twist = dailyTwist(day); }
  else if (mode === "challenge") {
    if (!challengeId || !/^[a-hj-km-np-z2-9]{10}$/.test(challengeId)) return { error: "not-found" };
    const c = await ctx.store.get<Challenge>(C.challenges, challengeId);
    if (!c) return { error: "not-found" };
    seed = c.seed; target = c.score; twist = isTwistId(c.twist) ? c.twist : "classic";
    ghost = Array.isArray(c.ghost) ? c.ghost : null; ghostName = c.displayName;
  } else seed = randomInt(1, 2147483647);
  const runId = randomToken(12);
  await ctx.store.transaction(async (tx) => {
    tx.create(C.runStarts, runId, { signupId, mode, seed, day, twist, challengeId: mode === "challenge" ? challengeId : null, startedAt: now, used: false, expireAt: new Date(now + RUN_START_TTL_MS) });
  });
  return { runId, seed, mode, day, target, twist: twistInfo(twist), ghost, ghostName };
}

export type UnrankedReason = "paused-too-long" | "duplicate-inputs" | "leaderboard-banned" | "guest";
export type FinishResult =
  | { status: "ok"; result: RunResult; personalBest: number | null; newBest: boolean; target: number | null; beat: boolean | null; ranked: boolean; unrankedReason: UnrankedReason | null; streak: number | null; guest: boolean }
  | { status: "invalid" | "mismatch" | "too-fast" | "expired" | "forbidden" | "outdated" };

export async function finishRun(
  ctx: Ctx, signupId: string | null, body: { runId: unknown; inputs: unknown; score: unknown; version: unknown },
): Promise<FinishResult> {
  const now = ctx.now ?? Date.now();
  if (typeof body.runId !== "string" || !/^[A-Za-z0-9_-]{8,40}$/.test(body.runId)) return { status: "invalid" };
  if (body.version !== ENGINE_VERSION) return { status: "outdated" };
  if (!validateInputLog(body.inputs) || !Number.isInteger(body.score)) return { status: "invalid" };
  const start = await ctx.store.get<{ signupId: string | null; mode: Mode; seed: number; day: string | null; twist?: TwistId; challengeId: string | null; startedAt: number; used: boolean }>(C.runStarts, body.runId);
  if (!start || start.used || now - start.startedAt > RUN_START_TTL_MS) return { status: "expired" };
  if (start.signupId !== signupId) return { status: "forbidden" };

  const twist: TwistId = isTwistId(start.twist) ? start.twist : "classic";
  const result = replay(start.seed, body.inputs as InputLog, twist);
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
    const st = await tx.get<{ used: boolean }>(C.runStarts, runId);
    if (!st || st.used) return { status: "expired" };
    const player = signupId ? (await tx.get<Player>(C.players, signupId)) : null;
    const dailyId = signupId && start.mode === "daily" && start.day ? `${start.day}_${signupId}` : null;
    const daily = dailyId ? await tx.get<{ score: number }>(C.dailyScores, dailyId) : null;
    const challenge = start.challengeId ? await tx.get<Challenge>(C.challenges, start.challengeId) : null;

    if (dailyId && player?.leaderboardBanned && !unrankedReason) unrankedReason = "leaderboard-banned";
    tx.update(C.runStarts, runId, { used: true });
    tx.create(C.runs, runId, {
      signupId, mode: start.mode, seed: start.seed, day: start.day, twist, challengeId: start.challengeId,
      score: result.score, ticks: result.ticks, pickups: result.pickups, hits: result.hits, nearMisses: result.nearMisses,
      maxCombo: result.maxCombo, powerUps: result.powerUps, shieldBlocks: result.shieldBlocks, inputEvents: result.inputEvents,
      inputHash, elapsedMs: elapsed, engine: ENGINE_VERSION, createdAt: now,
      // rankEligible: passed integrity checks; a guest Daily run can still be claimed onto the leaderboard after sign-up.
      rankEligible: start.mode === "daily" ? unrankedReason === null : null,
      ranked: start.mode === "daily" ? unrankedReason === null && !!signupId : null, unrankedReason,
      claimedAt: null,
    });

    let personalBest: number | null = null, newBest = false, streak: number | null = null;
    if (signupId) {
      const next = playerAfterRun(player, { score: result.score, mode: start.mode, day: start.day }, day, now);
      newBest = result.score > (player?.bestScore ?? 0);
      personalBest = next.bestScore;
      streak = currentStreak(next, day);
      tx.set(C.players, signupId, next);
      if (dailyId && !unrankedReason && (!daily || result.score > daily.score)) {
        tx.set(C.dailyScores, dailyId, { day: start.day, signupId, displayName: next.displayName, score: result.score, runId, updatedAt: now });
        invalidateLeaderboard(ctx.store, start.day!); // the player sees their own new score immediately on this instance
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
      unrankedReason: guestDaily && !unrankedReason ? "guest" : unrankedReason, streak, guest: !signupId,
    };
  });
}

/** Create a shareable challenge from a verified run. Guests can share their own (unclaimed) runs too; the run ID is the proof of ownership. */
export async function createChallenge(ctx: Ctx, signupId: string | null, runId: unknown, inputs?: unknown): Promise<string | null> {
  if (typeof runId !== "string" || !/^[A-Za-z0-9_-]{8,40}$/.test(runId)) return null;
  const run = await ctx.store.get<{ signupId: string | null; seed: number; score: number; twist?: TwistId; challengeId?: string | null }>(C.runs, runId);
  if (!run || run.signupId !== signupId) return null;
  const twist: TwistId = isTwistId(run.twist) ? run.twist : "classic";
  // The ghost recording is re-verified: it must replay to exactly this run's score.
  const ghost = validateInputLog(inputs) && replay(run.seed, inputs, twist).score === run.score ? inputs : null;
  const [player, signup] = signupId ? await Promise.all([getPlayer(ctx.store, signupId), ctx.store.get<Signup>(C.signups, signupId)]) : [null, null];
  const id = randomCode(10);
  await ctx.store.transaction(async (tx) => {
    tx.create(C.challenges, id, {
      seed: run.seed, score: run.score, twist, ghost, ownerId: signupId, displayName: player?.displayName ?? null, referralCode: signup?.referralCode ?? null,
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

type TopRow = { id: string; data: { displayName: string | null; score: number; signupId: string } };
/** Public top-20 is identical for everyone: cache it briefly per instance (cuts reads under load). */
const topCaches = new WeakMap<Store, TtlCache<TopRow[]>>();
function topCache(store: Store) {
  let c = topCaches.get(store);
  if (!c) topCaches.set(store, (c = new TtlCache<TopRow[]>(10_000)));
  return c;
}

export function invalidateLeaderboard(store: Store, day: string) {
  topCache(store).delete(day);
}

export async function leaderboard(store: Store, day: string, signupId: string | null) {
  const top = await topCache(store).getOrLoad(day, () => store.query<TopRow["data"]>(C.dailyScores, {
    where: [["day", day]], orderBy: { field: "score", direction: "desc" }, limit: 20,
  }));
  const mine = signupId ? await store.get<{ score: number }>(C.dailyScores, `${day}_${signupId}`) : null;
  return {
    day,
    entries: top.map((r, i) => ({ rank: i + 1, name: r.data.displayName ?? "Anonymous player", score: r.data.score, me: r.data.signupId === signupId })),
    myScore: mine?.score ?? null,
  };
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
    const run = await tx.get<{ signupId: string | null; claimedAt: number | null; mode: Mode; day: string | null; score: number; rankEligible: boolean | null }>(C.runs, runId);
    const player = await tx.get<Player>(C.players, signupId);
    const dailyId = run?.mode === "daily" && run.day === today && run.rankEligible ? `${today}_${signupId}` : null;
    const daily = dailyId ? await tx.get<{ score: number }>(C.dailyScores, dailyId) : null;
    tx.update(C.signups, signupId, { claimRunId: null });
    if (!run || run.signupId !== null || run.claimedAt) return null;
    const next = playerAfterRun(player, run, today, now);
    tx.set(C.players, signupId, next);
    tx.update(C.runs, runId, { signupId, claimedAt: now, ranked: !!dailyId && !player?.leaderboardBanned });
    if (dailyId && !player?.leaderboardBanned && (!daily || run.score > daily.score)) {
      tx.set(C.dailyScores, dailyId, { day: today, signupId, displayName: next.displayName, score: run.score, runId, updatedAt: now });
      invalidateLeaderboard(ctx.store, today);
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
  await Promise.all(entries.map((e) => store.delete(C.dailyScores, e.id)));
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
