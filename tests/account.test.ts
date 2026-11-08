import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C } from "@/lib/store/types";
import { setMailerForTests, type MailMessage } from "@/lib/mailer";
import { requestAccess, verifyEmail, signupIdFor } from "@/lib/early-access";
import { checkDeletionToken, confirmAccountDeletion, requestAccountDeletion } from "@/lib/account";
import { confirmSignIn } from "@/lib/game-service";
import { createRoom, joinRoom, reportPlayer } from "@/lib/battle-service";
import { waitlistInputSchema } from "@/lib/validation";

const secret = "test-secret-test-secret-test-secret-123";
const T0 = Date.UTC(2026, 9, 28, 6, 0, 0);
let store: MemoryStore;
let sent: MailMessage[];
const linkToken = (m: MailMessage, path: string) => m.text.match(new RegExp(`https?://\\S+${path}\\?token=(\\S+)`))![1];

beforeEach(() => {
  store = new MemoryStore(); sent = [];
  setMailerForTests({ send: async (m) => (sent.push(m), { ok: true, providerId: "x" }) });
});

describe("account deletion", () => {
  it("emails a one-time link that deletes the account and all linked data", async () => {
    await requestAccess({ store, secret, now: T0 }, waitlistInputSchema.parse({ email: "del@example.com", ageConfirmed: true }));
    await verifyEmail({ store, secret, now: T0 + 1 }, linkToken(sent[0], "/verify"));
    const id = signupIdFor(secret, "del@example.com");
    await store.transaction(async (tx) => {
      tx.set(C.players, id, { runs: 3, bestScore: 900 });
      tx.set(C.dailyScores, `2026-10-28_${id}`, { day: "2026-10-28", signupId: id, score: 900 });
    });
    sent = [];
    await requestAccountDeletion({ store, secret, now: T0 + 10 }, "del@example.com");
    expect(sent).toHaveLength(1);
    const token = linkToken(sent[0], "/account/delete");
    expect(await checkDeletionToken({ store, secret, now: T0 + 20 }, token)).toBe(true);
    expect(await confirmSignIn({ store, secret, now: T0 + 20 }, token)).toBeNull(); // a deletion link never signs in
    expect(await confirmAccountDeletion({ store, secret, now: T0 + 30 }, token)).toBe(true);
    expect(await store.get(C.signups, id)).toBeNull();
    expect(await store.get(C.players, id)).toBeNull();
    expect(await store.get(C.dailyScores, `2026-10-28_${id}`)).toBeNull();
    expect(await confirmAccountDeletion({ store, secret, now: T0 + 40 }, token)).toBe(false); // single use
  });

  it("doesn't reveal whether an email has an account, and links expire", async () => {
    await requestAccountDeletion({ store, secret, now: T0 }, "nobody@example.com");
    expect(sent).toHaveLength(0);
    await requestAccess({ store, secret, now: T0 }, waitlistInputSchema.parse({ email: "x@example.com", ageConfirmed: true }));
    sent = [];
    await requestAccountDeletion({ store, secret, now: T0 }, "x@example.com");
    const token = linkToken(sent[0], "/account/delete");
    expect(await confirmAccountDeletion({ store, secret, now: T0 + 61 * 60_000 }, token)).toBe(false);
    expect(await confirmAccountDeletion({ store, secret, now: T0 }, token.slice(0, -2) + "zz")).toBe(false);
  });
});

describe("battle reports", () => {
  it("lets a player report another human (not bots or themselves) for moderation", async () => {
    const host = await createRoom({ store, secret, now: T0 }, { name: "Host", seconds: 180, botLevel: "easy" });
    if ("error" in host) throw new Error();
    const g = await joinRoom({ store, secret, now: T0 + 1 }, host.code, { name: "Rude Guy", team: null });
    if ("error" in g) throw new Error();
    expect(await reportPlayer({ store, secret, now: T0 + 2 }, host.code, host.token, { playerId: g.playerId, reason: "name" })).toEqual({ ok: true });
    expect(await reportPlayer({ store, secret, now: T0 + 2 }, host.code, host.token, { playerId: host.playerId })).toMatchObject({ status: 400 });
    const reports = await store.query(C.feedback, { where: [["kind", "report"]] });
    expect(reports[0].data).toMatchObject({ targetName: "Rude Guy", reason: "name", status: "open" });
  });
});
