import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C } from "@/lib/store/types";
import { parseSubscription, runPushReminders, saveSubscription, subId, touchSubscription, type PushDoc, type Sender } from "@/lib/push";
import { dayKey } from "@/lib/game-service";

const secret = "test-secret-test-secret-test-secret-123";
const NOW = Date.UTC(2026, 10, 8, 13, 2, 0); // 13:02 UTC = 18:32 IST
const keys = { p256dh: "B" + "a".repeat(86), auth: "c".repeat(22) };
const sub = (n: number) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/abc${n}`, keys });
let store: MemoryStore, sent: string[], gone: Set<string>;
const send: Sender = async (s, m) => { if (gone.has(s.endpoint)) return { ok: false, gone: true }; sent.push(`${s.endpoint}|${m.title}`); return { ok: true }; };
const ctx = (now = NOW) => ({ store, secret, now });

beforeEach(() => { store = new MemoryStore(); sent = []; gone = new Set(); });

describe("push subscriptions", () => {
  it("only accepts real browser push services (no SSRF) and valid keys", () => {
    expect(parseSubscription(sub(1))).not.toBeNull();
    expect(parseSubscription({ endpoint: "https://web.push.apple.com/QX", keys })).not.toBeNull();
    for (const endpoint of ["http://fcm.googleapis.com/x", "https://evil.example/x", "https://fcm.googleapis.com.evil.io/x", "https://169.254.169.254/latest", "https://fcm.googleapis.com:8443/x", "https://user@fcm.googleapis.com/x"]) {
      expect(parseSubscription({ endpoint, keys })).toBeNull();
    }
    expect(parseSubscription({ endpoint: sub(1).endpoint, keys: { p256dh: "short", auth: keys.auth } })).toBeNull();
  });
});

describe("hourly reminders", () => {
  it("reminds this hour's subscribers once a day, only if they haven't played, with the streak when they have one", async () => {
    const today = dayKey(NOW), yesterday = dayKey(NOW - 864e5);
    await saveSubscription(ctx(), sub(1), { hourUtc: 13, day: yesterday, streak: 4 });
    await saveSubscription(ctx(), sub(2), { hourUtc: 13, day: yesterday, streak: 0 });
    await saveSubscription(ctx(), sub(3), { hourUtc: 13, day: yesterday });
    await saveSubscription(ctx(), sub(4), { hourUtc: 9, day: yesterday }); // other hour
    expect(await touchSubscription(ctx(), sub(3).endpoint, today, 1)).toBe(true); // played today
    const r = await runPushReminders(ctx(), send);
    expect(r).toMatchObject({ sent: 2, skipped: 1 });
    expect(sent[0]).toContain("4-day streak");
    expect(sent[1]).toContain("Today's arena");
    expect((await runPushReminders(ctx(NOW + 60_000), send)).sent).toBe(0); // retry in the same hour: no duplicates
  });

  it("stops after 14 quiet days and cleans up revoked or long-dead subscriptions", async () => {
    await saveSubscription(ctx(), sub(5), { hourUtc: 13, day: dayKey(NOW - 20 * 864e5) });
    await saveSubscription(ctx(), sub(6), { hourUtc: 13, day: dayKey(NOW - 40 * 864e5) });
    await saveSubscription(ctx(), sub(7), { hourUtc: 13, day: dayKey(NOW - 864e5) });
    gone.add(sub(7).endpoint);
    const r = await runPushReminders(ctx(), send);
    expect(r).toMatchObject({ sent: 0, removed: 2, skipped: 1 });
    expect(await store.get<PushDoc>(C.pushSubs, subId(sub(6).endpoint))).toBeNull();
    expect(await store.get<PushDoc>(C.pushSubs, subId(sub(7).endpoint))).toBeNull();
    expect(await store.get<PushDoc>(C.pushSubs, subId(sub(5).endpoint))).not.toBeNull();
  });
});
