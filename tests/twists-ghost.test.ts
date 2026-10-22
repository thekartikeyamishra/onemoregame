import { beforeEach, describe, expect, it } from "vitest";
import {
  GhostPlayer, InputRecorder, POWER_DURATION, POWER_FIRST_TICK, TWISTS, TWIST_IDS, WEEKDAY_TWIST, createGame, dirIndex, replay, step, type GameState, type TwistId,
} from "@/game/engine";
import { MemoryStore } from "@/lib/store/memory";
import { createChallenge, dailyTwist, finishRun, startRun } from "@/lib/game-service";
import { ENGINE_VERSION } from "@/game/engine";

const idle = { dir: -1, dash: false };
function bot(s: GameState) {
  let b = s.shards[0], bd = Infinity;
  for (const sh of s.shards) { const d = (sh.x - s.x) ** 2 + (sh.y - s.y) ** 2; if (d < bd) { bd = d; b = sh; } }
  return { dir: dirIndex(b.x - s.x, b.y - s.y), dash: s.tick % 211 === 30 };
}
function play(seed: number, twist: TwistId) {
  const s = createGame(seed, twist), rec = new InputRecorder();
  while (!s.over) { const i = bot(s); rec.record(s.tick, i); step(s, i); }
  return { s, log: rec.log };
}

describe("daily twists", () => {
  it("map to weekdays in India time", () => {
    expect(dailyTwist("2026-10-25")).toBe("classic"); // Sunday
    expect(dailyTwist("2026-10-26")).toBe("magnet");
    expect(dailyTwist("2026-10-27")).toBe("turbo");
    expect(dailyTwist("2026-10-21")).toBe("wide");
    expect(dailyTwist("2026-10-22")).toBe("shield");
    expect(dailyTwist("2026-10-23")).toBe("frenzy");
    expect(dailyTwist("2026-10-24")).toBe("swarm");
    expect(new Set(WEEKDAY_TWIST).size).toBe(7);
  });

  it("every twist replays deterministically", () => {
    for (const t of TWIST_IDS) {
      const { s, log } = play(4242, t);
      expect(replay(4242, log, t).score, t).toBe(s.score);
    }
  });

  it("the same inputs give a different result under a different twist (twist is part of the simulation)", () => {
    const { s, log } = play(777, "wide");
    expect(replay(777, log, "classic").score).not.toBe(s.score);
  });

  it("each twist changes what it says", () => {
    expect(createGame(1, "shield").active.shield).toBe(POWER_DURATION.shield);
    expect(createGame(1, "classic").active.shield).toBe(0);

    const m = createGame(5, "magnet");
    while (!m.power) { m.invuln = 999; step(m, idle); }
    expect(m.power.type).toBe("magnet");

    const f = createGame(5, "frenzy"), c = createGame(5, "classic");
    for (const g of [f, c]) while (!g.power) { g.invuln = 999; step(g, idle); }
    expect(f.tick).toBe(c.tick); // first spawn time is unchanged …
    for (const g of [f, c]) { g.power = null; g.nextPowerTick = g.tick + 1e9; }
    // … but the gap between power-ups is shorter
    const gapOf = (twist: TwistId) => { const g = createGame(9, twist); while (!g.power) { g.invuln = 999; step(g, idle); } const born = g.power.born; g.power = { ...g.power, x: g.x, y: g.y }; step(g, idle); return g.nextPowerTick - born; };
    expect(gapOf("frenzy")).toBeLessThan(500);
    expect(gapOf("classic")).toBeGreaterThanOrEqual(600);

    const turbo = createGame(3, "turbo"), base = createGame(3, "classic");
    for (const g of [turbo, base]) while (g.hazards.length === 0) { g.invuln = 999; step(g, idle); }
    const sp = (g: GameState) => Math.sqrt(g.hazards[0].vx ** 2 + g.hazards[0].vy ** 2);
    expect(sp(turbo) / sp(base)).toBeCloseTo(1.25, 6);

    let maxSwarm = 0, maxBase = 0;
    for (const seed of [1, 2, 3, 4]) {
      const a = createGame(seed, "swarm"), b = createGame(seed, "classic");
      while (!a.over) { a.invuln = 999; step(a, idle); maxSwarm = Math.max(maxSwarm, a.hazards.length); }
      while (!b.over) { b.invuln = 999; step(b, idle); maxBase = Math.max(maxBase, b.hazards.length); }
    }
    expect(maxSwarm).toBeGreaterThan(maxBase);
    expect(TWISTS.wide.shardR).toBeGreaterThan(8);
    expect(POWER_FIRST_TICK).toBe(480);
  });
});

describe("ghost", () => {
  it("replays a recorded run in lock-step to the identical final state", () => {
    const { s, log } = play(31337, "turbo");
    const g = new GhostPlayer(31337, log, "turbo");
    while (!g.state.over) g.step();
    expect(g.state.score).toBe(s.score);
    expect([g.state.x, g.state.y]).toEqual([s.x, s.y]);
  });

  describe("challenge storage", () => {
    const secret = "test-secret-test-secret-test-secret-123";
    let store: MemoryStore;
    beforeEach(() => { store = new MemoryStore(); });

    async function guestRun(now: number) {
      const start = await startRun({ store, secret, now }, null, "daily");
      if ("error" in start) throw new Error();
      const { s, log } = play(start.seed, start.twist.id);
      const res = await finishRun({ store, secret, now: now + 70_000 }, null, { runId: start.runId, inputs: log, score: s.score, version: ENGINE_VERSION });
      expect(res.status).toBe("ok");
      return { start, log, score: s.score };
    }

    it("stores a verified ghost and serves it with the challenge's seed and twist", async () => {
      const T0 = Date.UTC(2026, 9, 23, 6); // Friday → frenzy
      const g = await guestRun(T0);
      expect(g.start.twist.id).toBe("frenzy");
      const id = (await createChallenge({ store, secret }, null, g.start.runId, g.log))!;
      const c = await startRun({ store, secret, now: T0 + 100_000 }, null, "challenge", id);
      if ("error" in c) throw new Error();
      expect(c).toMatchObject({ seed: g.start.seed, target: g.score, twist: { id: "frenzy" } });
      expect(c.ghost).toEqual(g.log);
    });

    it("rejects a ghost recording that doesn't reproduce the run's score (challenge still created, no ghost)", async () => {
      const g = await guestRun(Date.UTC(2026, 9, 23, 6));
      const fake = [0, 5, 1];
      const id = (await createChallenge({ store, secret }, null, g.start.runId, fake))!;
      const c = await startRun({ store, secret }, null, "challenge", id);
      if ("error" in c) throw new Error();
      expect(c.ghost).toBeNull();
    });
  });
});
