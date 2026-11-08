import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C } from "@/lib/store/types";
import { setMailerForTests, type MailMessage } from "@/lib/mailer";
import { dayKey } from "@/lib/game-service";
import { runWinback } from "@/lib/winback";

const secret = "test-secret-test-secret-test-secret-123";
const NOW = Date.UTC(2026, 10, 8, 4, 30, 0);
let store: MemoryStore;
let sent: MailMessage[];

async function player(id: string, daysAgo: number, signup: Record<string, unknown> | null = {}) {
  await store.transaction(async (tx) => {
    tx.set(C.players, id, { displayName: `P${id.slice(0, 3)}`, runs: 5, bestScore: 1234, firstRunAt: 1, lastDay: dayKey(NOW - daysAgo * 864e5), days: 2, played: true, repeated: true, returned: true });
    if (signup) tx.set(C.signups, id, { email: `${id.slice(0, 6)}@example.com`, status: "verified", updatesConsent: true, unsubscribed: false, ...signup });
  });
}

beforeEach(() => {
  store = new MemoryStore();
  sent = [];
  setMailerForTests({ send: async (m) => (sent.push(m), { ok: true, providerId: "x" }) });
});

describe("win-back emails", () => {
  it("emails opted-in lapsed players once per stage, with an unsubscribe link", async () => {
    await player("a".repeat(40), 3);
    await player("b".repeat(40), 7);
    await player("c".repeat(40), 21);
    await player("d".repeat(40), 5); // not a stage day
    const r = await runWinback({ store, secret, now: NOW });
    expect(r.sent).toBe(3);
    expect(sent.map((m) => m.subject)).toEqual([expect.stringContaining("Today's arena"), expect.stringContaining("Battle vs AI"), "We'll stop reminding you"]);
    expect(sent.every((m) => m.text.includes("/unsubscribe?token=") && m.unsubscribeUrl)).toBe(true);
    // Running again the same day (scheduler retry) sends nothing new.
    expect((await runWinback({ store, secret, now: NOW })).sent).toBe(0);
  });

  it("never emails people without consent, unsubscribed, unverified or banned", async () => {
    await player("e".repeat(40), 3, { updatesConsent: false });
    await player("f".repeat(40), 3, { unsubscribed: true });
    await player("1".repeat(40), 3, { status: "pending" });
    await player("2".repeat(40), 3, null);
    await store.transaction(async (tx) => tx.update(C.players, "2".repeat(40), { leaderboardBanned: true }));
    expect((await runWinback({ store, secret, now: NOW })).sent).toBe(0);
  });

  it("respects the daily cap", async () => {
    for (let i = 0; i < 5; i++) await player(String(i).repeat(40), 3);
    const r = await runWinback({ store, secret, now: NOW }, 2);
    expect(r).toMatchObject({ sent: 2, capped: true });
  });
});
