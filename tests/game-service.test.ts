import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C } from "@/lib/store/types";
import { setMailerForTests, type MailMessage } from "@/lib/mailer";
import { deleteSignupByEmail, issueInvites, requestAccess, redeemInvite, invitationOwner, verifyEmail, signupIdFor } from "@/lib/early-access";
import {
  cleanDisplayName, confirmSignIn, createChallenge, createSession, dailySeed, dayKey, endSession, finishRun, getChallengePublic,
  getPlayer, leaderboard, playMetrics, requestSignIn, resolveSession, saveFeedback, setDisplayName, startRun,
} from "@/lib/game-service";
import { ENGINE_VERSION, InputRecorder, createGame, dirIndex, step, type TwistId } from "@/game/engine";
import { waitlistInputSchema } from "@/lib/validation";

const secret = "test-secret-test-secret-test-secret-123";
const T0 = Date.UTC(2026, 9, 21, 6, 0, 0);
let store: MemoryStore;
let sent: MailMessage[];
const link = (m: MailMessage, path: string) => m.text.match(new RegExp(`https?://\\S+${path}\\?token=(\\S+)`))![1];

function simulate(seed: number, variant = 0, twist: TwistId = "classic") {
  const s = createGame(seed, twist), rec = new InputRecorder();
  while (!s.over) {
    let b = s.shards[0], bd = Infinity;
    for (const sh of s.shards) { const d = (sh.x - s.x) ** 2 + (sh.y - s.y) ** 2; if (d < bd) { bd = d; b = sh; } }
    const input = { dir: dirIndex(b.x - s.x, b.y - s.y), dash: variant > 0 && s.tick % (150 + variant) === 0 };
    rec.record(s.tick, input); step(s, input);
  }
  return { inputs: rec.log, score: s.score, ticks: s.tick };
}

async function invitedPlayer(email = "p@example.com") {
  sent = [];
  await requestAccess({ store, secret, now: T0 }, waitlistInputSchema.parse({ email, ageConfirmed: true }));
  await verifyEmail({ store, secret, now: T0 + 1 }, link(sent[0], "/verify"));
  sent = [];
  await issueInvites({ store, secret, now: T0 + 2 }, { count: 1 });
  const token = link(sent[0], "/invite");
  expect(await redeemInvite({ store, secret, now: T0 + 3 }, token)).toBe("accepted");
  return (await invitationOwner({ store, secret }, token))!;
}

async function playRun(signupId: string | null, mode: "quick" | "daily" | "challenge", challengeId?: string, now = T0 + 10_000, variant = 0) {
  const start = await startRun({ store, secret, now }, signupId, mode, challengeId);
  if ("error" in start) throw new Error("start failed");
  const run = simulate(start.seed, variant, start.twist.id);
  const res = await finishRun({ store, secret, now: now + 70_000 }, signupId, { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: ENGINE_VERSION });
  return { start, run, res };
}

beforeEach(() => {
  store = new MemoryStore();
  sent = [];
  setMailerForTests({ send: async (m) => (sent.push(m), { ok: true, providerId: "x" }) });
});

describe("sessions and sign-in", () => {
  it("creates, resolves and ends sessions; rejects forged tokens", async () => {
    const { token } = await createSession({ store, secret, now: T0 }, "abc");
    expect(await resolveSession({ store, secret, now: T0 + 1 }, token)).toMatchObject({ signupId: "abc" });
    expect(await resolveSession({ store, secret }, token.slice(0, -1) + "x")).toBeNull();
    expect(await resolveSession({ store, secret, now: T0 + 31 * 864e5 }, token)).toBeNull();
    await endSession({ store, secret, now: T0 + 2 }, token);
    expect(await resolveSession({ store, secret, now: T0 + 3 }, token)).toBeNull();
  });

  it("emails sign-in links only to accepted playtesters, single use", async () => {
    await invitedPlayer();
    sent = [];
    await requestSignIn({ store, secret, now: T0 }, "stranger@example.com");
    expect(sent).toHaveLength(0);
    await requestSignIn({ store, secret, now: T0 }, "p@example.com");
    expect(sent).toHaveLength(1);
    const token = link(sent[0], "/play/sign-in/confirm");
    expect(await confirmSignIn({ store, secret, now: T0 + 1000 }, token)).toBe(signupIdFor(secret, "p@example.com"));
    expect(await confirmSignIn({ store, secret, now: T0 + 2000 }, token)).toBeNull();
  });

  it("sign-in links expire after 15 minutes", async () => {
    await invitedPlayer();
    sent = [];
    await requestSignIn({ store, secret, now: T0 }, "p@example.com");
    expect(await confirmSignIn({ store, secret, now: T0 + 16 * 60_000 }, link(sent[0], "/play/sign-in/confirm"))).toBeNull();
  });
});

describe("runs", () => {
  it("verifies a legitimate run and updates player stats", async () => {
    const id = await invitedPlayer();
    const { res, run } = await playRun(id, "quick");
    expect(res).toMatchObject({ status: "ok", personalBest: run.score, newBest: true });
    const p = await getPlayer(store, id);
    expect(p).toMatchObject({ runs: 1, played: true, repeated: false, bestScore: run.score });
  });

  it("rejects a tampered score, a replayed submission and instant submissions", async () => {
    const id = await invitedPlayer();
    const start = await startRun({ store, secret, now: T0 }, id, "quick");
    if ("error" in start) throw new Error();
    const run = simulate(start.seed, 0, start.twist.id);
    expect((await finishRun({ store, secret, now: T0 + 70_000 }, id, { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score + 10, version: ENGINE_VERSION })).status).toBe("mismatch");
    expect((await finishRun({ store, secret, now: T0 + 1_000 }, id, { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: ENGINE_VERSION })).status).toBe("too-fast");
    expect((await finishRun({ store, secret, now: T0 + 70_000 }, id, { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: ENGINE_VERSION })).status).toBe("ok");
    expect((await finishRun({ store, secret, now: T0 + 80_000 }, id, { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: ENGINE_VERSION })).status).toBe("expired");
  });

  it("rejects another session's run and malformed payloads", async () => {
    const id = await invitedPlayer();
    const start = await startRun({ store, secret, now: T0 }, id, "quick");
    if ("error" in start) throw new Error();
    const run = simulate(start.seed, 0, start.twist.id);
    expect((await finishRun({ store, secret, now: T0 + 70_000 }, "someone-else", { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: ENGINE_VERSION })).status).toBe("forbidden");
    expect((await finishRun({ store, secret }, id, { runId: start.runId, ticket: start.ticket, inputs: [1, 2], score: 1, version: ENGINE_VERSION })).status).toBe("invalid");
    expect((await finishRun({ store, secret }, id, { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: 999 })).status).toBe("outdated");
  });

  it("daily arena: same seed for everyone, best score on the leaderboard", async () => {
    const a = await invitedPlayer("a@example.com");
    const b = await invitedPlayer("b@example.com");
    await setDisplayName({ store, secret }, a, "Asha");
    const ra = await playRun(a, "daily");
    const rb = await playRun(b, "daily", undefined, T0 + 10_000, 7); // a different human plays differently
    expect(ra.start.seed).toBe(rb.start.seed);
    expect(ra.start.seed).toBe(dailySeed(secret, dayKey(T0 + 10_000)));
    const lb = await leaderboard(store, dayKey(T0 + 10_000), a);
    expect(lb.entries).toHaveLength(2);
    expect(lb.entries.find((e) => e.me)?.name).toBe("Asha");
    expect(lb.entries.find((e) => !e.me)?.name).toBe("Anonymous player");
  });

  it("uses India time for the daily reset", () => {
    expect(dayKey(Date.UTC(2026, 9, 21, 18, 29))).toBe("2026-10-21");
    expect(dayKey(Date.UTC(2026, 9, 21, 18, 31))).toBe("2026-10-22");
  });

  it("guests can only play challenges", async () => {
    const id = await invitedPlayer();
    const { start } = await playRun(id, "quick");
    const cid = await createChallenge({ store, secret }, id, start.runId);
    expect(cid).toMatch(/^[a-z2-9]{10}$/);
    const pub = await getChallengePublic(store, cid!);
    expect(pub).not.toHaveProperty("ownerId");
    const guest = await playRun(null, "challenge", cid!);
    expect(guest.start.seed).toBe(start.seed);
    expect(guest.res.status).toBe("ok");
    expect((await getChallengePublic(store, cid!))!.attempts).toBe(1);
    expect(await createChallenge({ store, secret }, "other", start.runId)).toBeNull();
    expect(await startRun({ store, secret }, null, "challenge", "zzzzzzzzzz")).toEqual({ error: "not-found" });
  });

  it("tracks repeat play and multi-day returns for demand validation", async () => {
    const id = await invitedPlayer();
    await playRun(id, "quick", undefined, T0 + 10_000);
    await playRun(id, "quick", undefined, T0 + 200_000);
    await playRun(id, "quick", undefined, T0 + 864e5 + 10_000);
    await saveFeedback({ store, secret }, id, { runId: "x".repeat(12), wouldReplay: true, note: "fun" });
    const m = await playMetrics(store);
    expect(m).toMatchObject({ playersWithFirstRun: 1, playersWithRepeatPlay: 1, playersReturnedOnAnotherDay: 1, totalRuns: 3, feedbackWouldReplay: 1 });
  });
});

describe("profile and privacy", () => {
  it("validates display names", () => {
    expect(cleanDisplayName("Asha_99")).toBe("Asha_99");
    expect(cleanDisplayName("ab")).toBeNull();
    expect(cleanDisplayName("<script>")).toBeNull();
    expect(cleanDisplayName("f.u.c.k")).toBeNull();
    expect(cleanDisplayName("a".repeat(17))).toBeNull();
  });

  it("deletion removes gameplay data too", async () => {
    const id = await invitedPlayer();
    await createSession({ store, secret }, id);
    const { start } = await playRun(id, "daily");
    await createChallenge({ store, secret }, id, start.runId);
    expect(await deleteSignupByEmail({ store, secret }, "p@example.com")).toBe(true);
    for (const c of [C.players, C.runs, C.dailyScores, C.challenges, C.sessions, C.signups]) expect(await store.count(c, []), c).toBe(0);
  });
});

describe("anti-cheat ranking", () => {
  it("identical input logs from another account on the same daily seed are kept off the leaderboard", async () => {
    const a = await invitedPlayer("dupe-a@example.com");
    const b = await invitedPlayer("dupe-b@example.com");
    const ra = await playRun(a, "daily");
    const sb = await startRun({ store, secret, now: T0 + 10_000 }, b, "daily");
    if ("error" in sb) throw new Error();
    const res = await finishRun({ store, secret, now: T0 + 80_000 }, b, { runId: sb.runId, ticket: sb.ticket, inputs: ra.run.inputs, score: ra.run.score, version: ENGINE_VERSION });
    expect(res).toMatchObject({ status: "ok", ranked: false, unrankedReason: "duplicate-inputs" });
    const lb = await leaderboard(store, dayKey(T0 + 10_000), b);
    expect(lb.entries).toHaveLength(1);
    expect(lb.myScore).toBeNull();
  });

  it("daily runs that took far longer than real time are valid but unranked", async () => {
    const a = await invitedPlayer();
    const start = await startRun({ store, secret, now: T0 }, a, "daily");
    if ("error" in start) throw new Error();
    const run = simulate(start.seed, 0, start.twist.id);
    const res = await finishRun({ store, secret, now: T0 + 25 * 60_000 }, a, { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: ENGINE_VERSION });
    expect(res).toMatchObject({ status: "ok", ranked: false, unrankedReason: "paused-too-long" });
    expect((await getPlayer(store, a)).bestScore).toBe(run.score); // personal stats still count
  });

  it("operators can remove a player from leaderboards", async () => {
    const { banFromLeaderboard, reviewDay } = await import("@/lib/game-service");
    const a = await invitedPlayer();
    await playRun(a, "daily");
    const day = dayKey(T0 + 10_000);
    expect((await reviewDay(store, day))[0]).toMatchObject({ signupId: a, seconds: expect.any(Number) });
    expect(await banFromLeaderboard(store, a)).toBe(1);
    expect((await leaderboard(store, day, a)).entries).toHaveLength(0);
    const again = await playRun(a, "daily", undefined, T0 + 200_000);
    expect(again.res).toMatchObject({ ranked: false, unrankedReason: "leaderboard-banned" });
  });
});

describe("open play, claiming and streaks", () => {
  it("guests can play today's Daily Arena (unranked) but not Quick Play via the API rule", async () => {
    const g = await playRun(null, "daily");
    expect(g.res).toMatchObject({ status: "ok", ranked: false, unrankedReason: "guest", guest: true, streak: null });
    expect((await leaderboard(store, dayKey(T0 + 10_000), null)).entries).toHaveLength(0);
  });

  it("a guest Daily run is claimed onto the profile and leaderboard after confirming", async () => {
    const { claimGuestRun } = await import("@/lib/game-service");
    const g = await playRun(null, "daily");
    sent = [];
    await requestAccess({ store, secret, now: T0 + 90_000 }, waitlistInputSchema.parse({ email: "guest@example.com", ageConfirmed: true, claimRunId: g.start.runId }));
    const v = await verifyEmail({ store, secret, now: T0 + 95_000 }, link(sent[0], "/verify"));
    if (v.status !== "verified") throw new Error();
    expect(await claimGuestRun({ store, secret, now: T0 + 96_000 }, v.signupId)).toBe(g.run.score);
    expect((await getPlayer(store, v.signupId))).toMatchObject({ bestScore: g.run.score, runs: 1, streak: 1 });
    expect((await leaderboard(store, dayKey(T0), v.signupId)).myScore).toBe(g.run.score);
    // single use; another account can't claim it again
    expect(await claimGuestRun({ store, secret, now: T0 + 97_000 }, v.signupId)).toBeNull();
  });

  it("a claimed run from a past day saves stats but not the leaderboard; owned runs can't be claimed", async () => {
    const { claimGuestRun } = await import("@/lib/game-service");
    const g = await playRun(null, "daily");
    const owner = await invitedPlayer("owner@example.com");
    const owned = await playRun(owner, "quick");
    sent = [];
    await requestAccess({ store, secret, now: T0 + 2 * 864e5 }, waitlistInputSchema.parse({ email: "late@example.com", ageConfirmed: true, claimRunId: g.start.runId }));
    const v = await verifyEmail({ store, secret, now: T0 + 2 * 864e5 + 1 }, link(sent[0], "/verify"));
    if (v.status !== "verified") throw new Error();
    expect(await claimGuestRun({ store, secret, now: T0 + 2 * 864e5 + 2 }, v.signupId)).toBe(g.run.score);
    expect((await leaderboard(store, dayKey(T0 + 2 * 864e5), v.signupId)).myScore).toBeNull();
    sent = [];
    await requestAccess({ store, secret, now: T0 + 3 * 864e5 }, waitlistInputSchema.parse({ email: "thief@example.com", ageConfirmed: true, claimRunId: owned.start.runId }));
    const t = await verifyEmail({ store, secret, now: T0 + 3 * 864e5 + 1 }, link(sent[0], "/verify"));
    if (t.status !== "verified") throw new Error();
    expect(await claimGuestRun({ store, secret, now: T0 + 3 * 864e5 + 2 }, t.signupId)).toBeNull();
  });

  it("streaks count consecutive Daily days and forgive exactly one missed day", async () => {
    const { playerAfterRun, currentStreak } = await import("@/lib/game-service");
    let p = playerAfterRun(null, { score: 10, mode: "daily", day: "2026-10-01" }, "2026-10-01", 0);
    p = playerAfterRun(p, { score: 10, mode: "daily", day: "2026-10-01" }, "2026-10-01", 0); // same day: no change
    expect(p.streak).toBe(1);
    p = playerAfterRun(p, { score: 10, mode: "daily", day: "2026-10-02" }, "2026-10-02", 0);
    p = playerAfterRun(p, { score: 10, mode: "daily", day: "2026-10-04" }, "2026-10-04", 0); // skipped one day
    expect(p.streak).toBe(3);
    p = playerAfterRun(p, { score: 10, mode: "quick", day: null }, "2026-10-05", 0); // quick play doesn't count
    expect(p.streak).toBe(3);
    expect(currentStreak(p, "2026-10-06")).toBe(3);
    expect(currentStreak(p, "2026-10-07")).toBe(0);
    p = playerAfterRun(p, { score: 10, mode: "daily", day: "2026-10-08" }, "2026-10-08", 0);
    expect(p).toMatchObject({ streak: 1, bestStreak: 3 });
  });

  it("guests can create a challenge from their own run only", async () => {
    const g = await playRun(null, "daily");
    const id = await createChallenge({ store, secret }, null, g.start.runId);
    expect(id).toMatch(/^[a-z2-9]{10}$/);
    expect((await getChallengePublic(store, id!))).toMatchObject({ displayName: null, referralCode: null });
    const owner = await invitedPlayer("o2@example.com");
    const owned = await playRun(owner, "quick");
    expect(await createChallenge({ store, secret }, null, owned.start.runId)).toBeNull();
  });

  it("confirmed (not only invited) players can request sign-in links", async () => {
    sent = [];
    await requestAccess({ store, secret, now: T0 }, waitlistInputSchema.parse({ email: "v@example.com", ageConfirmed: true }));
    await verifyEmail({ store, secret, now: T0 + 1 }, link(sent[0], "/verify"));
    sent = [];
    await requestSignIn({ store, secret, now: T0 + 2 }, "v@example.com");
    expect(sent).toHaveLength(1);
  });
});
