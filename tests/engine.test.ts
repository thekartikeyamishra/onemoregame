import { describe, expect, it } from "vitest";
import {
  COMBO_WINDOW, HIT_PENALTY, InputRecorder, MAX_COMBO, RUN_TICKS, createGame, dirIndex, replay, step, validateInputLog,
  type GameState,
} from "@/game/engine";

/** A scripted "player" that chases the nearest shard and dashes occasionally (deterministic). */
function bot(s: GameState) {
  let best = s.shards[0], bd = Infinity;
  for (const sh of s.shards) { const d = (sh.x - s.x) ** 2 + (sh.y - s.y) ** 2; if (d < bd) { bd = d; best = sh; } }
  return { dir: dirIndex(best.x - s.x, best.y - s.y), dash: s.tick % 200 === 50 };
}

function play(seed: number) {
  const s = createGame(seed);
  const rec = new InputRecorder();
  while (!s.over) { const input = bot(s); rec.record(s.tick, input); step(s, input); }
  return { s, log: rec.log };
}

describe("engine", () => {
  it("is deterministic: the replay of a recorded run reproduces the exact score", () => {
    for (const seed of [1, 42, 20261021, 987654321]) {
      const { s, log } = play(seed);
      expect(s.score).toBeGreaterThan(0);
      expect(replay(seed, log)).toMatchObject({ score: s.score, ticks: s.tick, pickups: s.pickups, hits: s.hits });
    }
  });

  it("different seeds produce different arenas", () => {
    expect(createGame(1).shards[0]).not.toEqual(createGame(2).shards[0]);
    expect(createGame(5).shards).toEqual(createGame(5).shards);
  });

  it("an idle run lasts exactly 60 seconds or less (hits shorten it)", () => {
    const r = replay(7, []);
    expect(r.ticks).toBeLessThanOrEqual(RUN_TICKS);
    expect(r.ticks).toBeGreaterThanOrEqual(RUN_TICKS - r.hits * HIT_PENALTY);
    expect(r.score).toBe(0); // idle player at the centre never reaches shards that spawn ≥60 units away
  });

  it("caps the combo multiplier and resets it after the window", () => {
    const s = createGame(3);
    for (let i = 0; i < 12; i++) { s.shards[0] = { x: s.x, y: s.y, born: s.tick }; step(s, { dir: -1, dash: false }); }
    expect(s.combo).toBe(MAX_COMBO);
    for (let i = 0; i < COMBO_WINDOW + 1; i++) { s.shards = s.shards.map((sh) => ({ ...sh, x: 280, y: 0 })); step(s, { dir: -1, dash: false }); }
    expect(s.combo).toBe(0);
  });

  it("a hazard hit resets the combo and costs 3 seconds", () => {
    const s = createGame(9);
    s.combo = 4; s.comboTimer = 50;
    s.hazards = [{ id: 1, x: s.x, y: s.y, vx: 0, vy: 0, s: 15, hit: false, nearMissed: false }];
    const before = s.ticksLeft;
    const ev = step(s, { dir: -1, dash: false });
    expect(ev.some((e) => e.type === "hit")).toBe(true);
    expect(s.combo).toBe(0);
    expect(s.ticksLeft).toBe(before - 1 - HIT_PENALTY);
  });

  it("dashing through a hazard is a near miss, not a hit", () => {
    const s = createGame(11);
    s.hazards = [{ id: 1, x: s.x + 5, y: s.y, vx: 0, vy: 0, s: 15, hit: false, nearMissed: false }];
    const ev = step(s, { dir: 0, dash: true });
    expect(ev.map((e) => e.type)).toContain("nearMiss");
    expect(s.hits).toBe(0);
  });

  it("validates input logs strictly", () => {
    expect(validateInputLog([0, 5, 0, 10, -1, 1])).toBe(true);
    expect(validateInputLog([10, 5, 0, 5, 5, 0])).toBe(false); // ticks not increasing
    expect(validateInputLog([0, 64, 0])).toBe(false);
    expect(validateInputLog([0, 1, 2])).toBe(false);
    expect(validateInputLog([0, 1])).toBe(false);
    expect(validateInputLog([RUN_TICKS, 1, 0])).toBe(false);
    expect(validateInputLog("nope")).toBe(false);
  });

  it("a tampered input log does not reproduce the claimed score", () => {
    const { s, log } = play(123);
    const tampered = [...log];
    tampered[1] = (tampered[1] + 32) % 64;
    expect(replay(123, tampered).score).not.toBe(s.score);
  });

  it("maps vectors to the nearest direction", () => {
    expect(dirIndex(1, 0)).toBe(0);
    expect(dirIndex(0, 1)).toBe(16);
    expect(dirIndex(-1, 0)).toBe(32);
    expect(dirIndex(0, 0)).toBe(-1);
  });
});
