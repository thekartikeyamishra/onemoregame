import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { createRoom, joinRoom, tick } from "@/lib/battle-service";
import { TouchStick } from "@/game/touch-stick";
import { BattleWorld } from "@/components/battle/world";
import type { PublicRound } from "@/lib/battle-types";

const secret = "test-secret-test-secret-test-secret-123";
const T0 = Date.UTC(2026, 10, 8, 6, 0, 0);
let store: MemoryStore;
beforeEach(() => { store = new MemoryStore(); });
const ctx = (now: number) => ({ store, secret, now });
const touch = (pointerId: number) => ({ pointerType: "touch", pointerId }) as PointerEvent;

describe("thumb-stick (touch steering)", () => {
  it("steers by drag direction, ignores tiny jitters, and dashes with a second finger", () => {
    const s = new TouchStick();
    expect(s.down({ pointerType: "mouse", pointerId: 1 } as PointerEvent, 0, 0)).toBeNull();
    expect(s.down(touch(7), 100, 100)).toBe("stick");
    s.move(touch(7), 104, 102);
    expect(s.vector()).toBeNull(); // inside the dead zone
    s.move(touch(7), 160, 100);
    expect(s.vector()).toEqual({ dx: 60, dy: 0 });
    expect(s.down(touch(8), 300, 300)).toBe("dash");
    s.move(touch(8), 0, 0); // the second finger never moves the stick
    expect(s.vector()).toEqual({ dx: 60, dy: 0 });
    s.move(touch(7), 400, 100); // dragging far: the base follows the thumb
    expect(s.vector()!.dx).toBeLessThanOrEqual(s.R * 1.6 + 0.001);
    s.up(touch(7));
    expect(s.vector()).toBeNull();
  });
});

describe("lobby presence and quick rounds", () => {
  it("defaults to Quick 90 s rounds and heartbeats players at most every 12 s", async () => {
    const host = await createRoom(ctx(T0), { name: "Host", seconds: "nope", botLevel: "easy" });
    if ("error" in host) throw new Error(host.error);
    expect(host.room.seconds).toBe(90);
    const friend = await joinRoom(ctx(T0 + 500), host.code, { name: "Friend", team: "B" });
    if ("error" in friend) throw new Error(friend.error);
    expect(friend.room.players.find((p) => p.name === "Friend")?.seenAt).toBe(T0 + 500);
    // A tick soon after joining doesn't write; one after 12 s refreshes presence (and bumps the version).
    const t1 = await tick(ctx(T0 + 5_000), host.code, friend.token, {});
    if ("error" in t1) throw new Error(t1.error);
    const t2 = await tick(ctx(T0 + 14_000), host.code, friend.token, { v: t1.v });
    if ("error" in t2) throw new Error(t2.error);
    expect(t2.v).toBeGreaterThan(t1.v);
    expect(t2.room?.players.find((p) => p.name === "Friend")?.seenAt).toBe(T0 + 14_000);
  });
});

describe("remote playback jitter buffer", () => {
  const round: PublicRound = {
    n: 1, seconds: 90, seed: 777, defenders: ["A"], attackers: "B", outcome: null, finishedAt: null,
    roster: [{ id: "me", team: "B", bot: null }, { id: "them", team: "A", bot: null }],
  };
  it("plays other players smoothly behind live instead of freezing and jumping", () => {
    const w = new BattleWorld(round, "me");
    w.names = { them: "Them" };
    const run = w.runs.get("them")!;
    // Their inputs arrive in 1.5 s batches (like real syncs, with ±0.3 s network jitter) while we render 60 fps.
    let maxStep = 0, frozen = 0, sent = 0;
    for (let now = 0; now < 1200; now++) {
      const due = now - 20 - (now % 7) * 3;
      if (now % 90 === 0 && due > sent) {
        w.applyLanes({ them: { i: sent === 0 ? [0, 3, 0] : [], s: [], p: [], o: [sent === 0 ? 0 : 3, 0, 0], lt: due, to: null } });
        sent = due;
      }
      const before = run.tick;
      w.advance(now);
      if (now > 300) { maxStep = Math.max(maxStep, run.tick - before); if (run.tick === before) frozen++; }
      expect(run.tick).toBeLessThanOrEqual(sent + 1); // never ahead of what we actually know
    }
    expect(maxStep).toBeLessThanOrEqual(3); // no teleports
    expect(frozen).toBeLessThan(40); // and (almost) no stalls
  });
});
