import { describe, expect, it } from "vitest";
import {
  ARENA_R, COMBO_WINDOW, DASH_COOLDOWN, DIRS, HIT_GRACE, HIT_PENALTY, MAGNET_RANGE, MAX_COMBO, NEAR_MISS_POINTS, PLAYER_R, POWER_DURATION,
  POWER_FIRST_TICK, POWER_LIFETIME, RUN_TICKS, InputRecorder, createGame, distSqToSquare, replay, step, type GameEvent, type GameState, type PowerType,
} from "@/game/engine";

const idle = { dir: -1, dash: false };
const clearField = (s: GameState) => { s.shards = s.shards.map((sh) => ({ ...sh, x: 250, y: 0 })); s.hazards = []; s.power = null; s.nextPowerTick = 1e9; };
const hazardAt = (x: number, y: number, size = 15) => ({ id: 99, x, y, vx: 0, vy: 0, s: size, hit: false, nearMissed: false });
const types = (ev: GameEvent[]) => ev.map((e) => e.type);

describe("movement & physics", () => {
  it("accelerates toward the input direction and reaches a terminal speed", () => {
    const s = createGame(1); clearField(s);
    for (let i = 0; i < 40; i++) step(s, { dir: 0, dash: false }); // terminal speed well before the wall
    const v = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    expect(v).toBeGreaterThan(4); expect(v).toBeLessThan(5.5);
    expect(s.vy).toBeCloseTo(0, 6);
  });

  it("stops smoothly without input (damping)", () => {
    const s = createGame(1); clearField(s);
    for (let i = 0; i < 30; i++) step(s, { dir: 0, dash: false });
    for (let i = 0; i < 90; i++) step(s, idle);
    expect(Math.abs(s.vx)).toBeLessThan(0.01);
  });

  it("never leaves the arena and slides along the wall instead of sticking", () => {
    const s = createGame(2); clearField(s);
    for (let i = 0; i < 200; i++) step(s, { dir: 0, dash: i % 120 === 0 });
    expect(Math.sqrt(s.x * s.x + s.y * s.y)).toBeLessThanOrEqual(ARENA_R - PLAYER_R + 1e-9);
    const y0 = s.y;
    for (let i = 0; i < 20; i++) step(s, { dir: 8, dash: false }); // push diagonally into the wall
    expect(s.y).toBeGreaterThan(y0 + 10); // tangential movement continues
  });

  it("dashes in the last movement direction even from standstill, with cooldown", () => {
    const s = createGame(3); clearField(s);
    step(s, { dir: 16, dash: false }); // face down
    for (let i = 0; i < 60; i++) step(s, idle);
    const ev = step(s, { dir: -1, dash: true });
    expect(types(ev)).toContain("dash");
    expect(s.vy).toBeGreaterThan(5);
    expect(types(step(s, { dir: -1, dash: true }))).not.toContain("dash");
    for (let i = 0; i < DASH_COOLDOWN; i++) step(s, idle);
    expect(types(step(s, { dir: -1, dash: true }))).toContain("dash");
  });

  it("uses exact circle-vs-square collision (corners and edges)", () => {
    expect(distSqToSquare(0, 0, 0, 0, 10)).toBe(0);
    expect(distSqToSquare(15, 0, 0, 0, 10)).toBe(25);
    expect(distSqToSquare(13, 14, 0, 0, 10)).toBe(9 + 16); // diagonal to corner
  });
});

describe("scoring", () => {
  it("combo grows within the window, caps at ×9, resets after exactly 1.5 s", () => {
    const s = createGame(4); clearField(s);
    const pts: number[] = [];
    for (let i = 0; i < 11; i++) {
      s.shards[0] = { x: s.x, y: s.y, born: s.tick };
      for (const e of step(s, idle)) if (e.type === "pickup") pts.push(e.points);
      s.shards = s.shards.map((sh) => ({ ...sh, x: 250, y: 0 }));
    }
    expect(pts).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 90, 90]);
    expect(s.combo).toBe(MAX_COMBO);
    for (let i = 0; i < COMBO_WINDOW - 1; i++) step(s, idle);
    expect(s.combo).toBe(MAX_COMBO); // still alive on the last tick of the window
    step(s, idle);
    expect(s.combo).toBe(0);
  });

  it("score always equals the sum of awarded points", () => {
    for (const seed of [11, 12, 13]) {
      const s = createGame(seed); let sum = 0;
      for (let t = 0; !s.over; t++) {
        for (const e of step(s, { dir: (t >> 5) % 64, dash: t % 97 === 0 })) if (e.type === "pickup" || e.type === "nearMiss") sum += e.points;
      }
      expect(s.score).toBe(sum);
    }
  });
});

describe("hazards", () => {
  it("a hit costs 3 s, resets combo, and grants a short grace period", () => {
    const s = createGame(5); clearField(s);
    s.combo = 5; s.comboTimer = 40; s.hazards = [hazardAt(s.x, s.y)];
    const before = s.ticksLeft;
    expect(types(step(s, idle))).toContain("hit");
    expect(s.ticksLeft).toBe(before - 1 - HIT_PENALTY);
    expect(s.combo).toBe(0);
    s.hazards = [hazardAt(s.x, s.y)];
    for (let i = 0; i < HIT_GRACE - 1; i++) expect(types(step(s, idle))).not.toContain("hit");
    expect(types(step(s, idle))).toContain("hit");
  });

  it("the same hazard can only hit once", () => {
    const s = createGame(6); clearField(s);
    s.hazards = [hazardAt(s.x, s.y)];
    step(s, idle);
    for (let i = 0; i < 100; i++) step(s, idle);
    expect(s.hits).toBe(1);
  });

  it("dashing through a hazard scores a near miss once and no hit", () => {
    const s = createGame(7); clearField(s);
    s.hazards = [hazardAt(s.x + 4, s.y)];
    const ev = step(s, { dir: 0, dash: true });
    expect(types(ev)).toContain("nearMiss");
    for (let i = 0; i < 5; i++) step(s, idle);
    expect(s.nearMisses).toBe(1); expect(s.hits).toBe(0);
    expect(s.score).toBe(NEAR_MISS_POINTS);
  });

  it("gets harder over time (more simultaneous hazards allowed late)", () => {
    let early = 0, late = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = createGame(seed);
      while (!s.over && s.tick < RUN_TICKS) {
        step(s, idle);
        if (s.tick > 600 && s.tick < 1200) early = Math.max(early, s.hazards.length);
        if (s.tick > 2900) late = Math.max(late, s.hazards.length);
        s.invuln = 999; // keep the run going full length for the measurement
      }
    }
    expect(late).toBeGreaterThan(early);
  });
});

describe("power-ups", () => {
  function grab(type: PowerType) {
    const s = createGame(8); clearField(s);
    s.power = { type, x: s.x, y: s.y, born: s.tick };
    const ev = step(s, idle);
    expect(ev).toContainEqual(expect.objectContaining({ type: "power", power: type }));
    return s;
  }

  it("spawn deterministically, one at a time, starting at 8 s, and expire if ignored", () => {
    const s = createGame(9);
    while (s.tick < POWER_FIRST_TICK) { step(s, idle); s.invuln = 999; expect(s.power).toBeNull(); }
    step(s, idle);
    expect(s.power).not.toBeNull();
    const born = s.power!.born;
    while (s.tick - born <= POWER_LIFETIME) { s.invuln = 999; expect(s.power).not.toBeNull(); step(s, idle); }
    expect(s.power).toBeNull();
    expect(s.nextPowerTick).toBeGreaterThanOrEqual(s.tick + 599);
    expect(createGameSpawn(9)).toBe(createGameSpawn(9));
  });

  it("shield absorbs one hit with no time penalty, then is gone", () => {
    const s = grab("shield");
    const before = s.ticksLeft; s.hazards = [hazardAt(s.x, s.y)];
    expect(types(step(s, idle))).toContain("shieldBreak");
    expect(s.ticksLeft).toBe(before - 1); expect(s.hits).toBe(0); expect(s.active.shield).toBe(0);
  });

  it("shield expires after its duration", () => {
    const s = grab("shield");
    for (let i = 0; i < POWER_DURATION.shield; i++) step(s, idle);
    expect(s.active.shield).toBe(0);
  });

  it("slow-mo halves hazard speed for 4 s", () => {
    const s = grab("slow");
    s.hazards = [{ ...hazardAt(-200, -200), vx: 2, vy: 0 }];
    step(s, idle);
    expect(s.hazards[0].x).toBeCloseTo(-199, 9);
    for (let i = 0; i < POWER_DURATION.slow; i++) step(s, idle);
    const x = s.hazards[0].x; step(s, idle);
    expect(s.hazards[0].x - x).toBeCloseTo(2, 9);
  });

  it("magnet pulls nearby shards in, but not distant ones", () => {
    const s = grab("magnet");
    s.shards = [{ x: s.x + MAGNET_RANGE - 10, y: s.y, born: 0 }, { x: s.x - 250, y: s.y, born: 0 }];
    let collected = 0;
    for (let i = 0; i < 60; i++) for (const e of step(s, idle)) if (e.type === "pickup") collected++;
    expect(collected).toBeGreaterThanOrEqual(1);
    expect(s.shards.some((sh) => sh.x < -200)).toBe(true);
  });

  it("double doubles shard and near-miss points while active", () => {
    const s = grab("double");
    s.shards[0] = { x: s.x, y: s.y, born: s.tick };
    const ev = step(s, idle);
    expect(ev.find((e) => e.type === "pickup")).toMatchObject({ points: 20 });
  });
});

describe("determinism & replay", () => {
  it("fuzz: random input logs always replay to the same result as live play", () => {
    let seed = 12345;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let run = 0; run < 40; run++) {
      const s = createGame(Math.floor(rand() * 1e9)); const rec = new InputRecorder();
      let dir = -1;
      while (!s.over) {
        if (rand() < 0.08) dir = rand() < 0.15 ? -1 : Math.floor(rand() * 64);
        const input = { dir, dash: rand() < 0.01 };
        rec.record(s.tick, input); step(s, input);
        expect(s.combo).toBeLessThanOrEqual(MAX_COMBO);
      }
      const r = replay(s.seed, rec.log);
      expect(r.score).toBe(s.score); expect(r.ticks).toBe(s.tick); expect(r.powerUps).toBe(s.powerUps);
      expect(r.ticks).toBeLessThanOrEqual(RUN_TICKS);
    }
  });

  it("direction table is unit length", () => {
    for (const [x, y] of DIRS) expect(Math.abs(x * x + y * y - 1)).toBeLessThan(1e-5);
  });
});

/** Helper: what type spawns first for a seed (same procedure, independent instance). */
function createGameSpawn(seed: number) {
  const s = createGame(seed);
  while (s.tick <= POWER_FIRST_TICK) { s.invuln = 999; step(s, idle); }
  return s.power!.type;
}
