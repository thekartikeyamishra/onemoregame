import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C } from "@/lib/store/types";
import { finishRun, levelProgressAfter, startRun } from "@/lib/game-service";
import { ENGINE_VERSION, InputRecorder, createGame, dirIndex, replay, step, type Rules } from "@/game/engine";
import { LEVEL_COUNT, allLevels, generateLevel, getLevel, starsFor } from "@/game/levels";

const secret = "test-secret-test-secret-test-secret-123";
const T0 = Date.UTC(2026, 9, 21, 6, 0, 0);
let store: MemoryStore;
beforeEach(() => { store = new MemoryStore(); });

function bot(seed: number, rules: Partial<Rules>) {
  const s = createGame(seed, "classic", rules), rec = new InputRecorder();
  while (!s.over) {
    let b = s.shards[0], bd = Infinity;
    for (const sh of s.shards) { const d = (sh.x - s.x) ** 2 + (sh.y - s.y) ** 2; if (d < bd) { bd = d; b = sh; } }
    const input = { dir: b ? dirIndex(b.x - s.x, b.y - s.y) : -1, dash: s.tick % 157 === 0 };
    rec.record(s.tick, input); step(s, input);
  }
  return { inputs: rec.log, score: s.score, ticks: s.tick };
}

describe("level table", () => {
  it("has 30 levels with rising, distinct-kind progression and ordered stars", () => {
    const levels = allLevels();
    expect(levels).toHaveLength(LEVEL_COUNT);
    expect(new Set(levels.map((l) => l.kind)).size).toBeGreaterThanOrEqual(8);
    for (const l of levels) {
      expect(l.target).toBeGreaterThan(0);
      expect(l.stars[0]).toBe(l.target);
      expect(l.stars[1]).toBeGreaterThan(l.stars[0]);
      expect(l.stars[2]).toBeGreaterThan(l.stars[1]);
      if (l.n % 5 === 0) expect(l.kind).toBe("boss");
    }
  });

  it("the committed levels.json matches the generator (run `npm run levels` after engine changes)", () => {
    for (const n of [1, 2, 5, 13, 30]) expect(getLevel(n)).toEqual(JSON.parse(JSON.stringify(generateLevel(n))));
  });

  it("stars count thresholds", () => {
    const l = getLevel(1)!;
    expect(starsFor(l, l.target - 1)).toBe(0);
    expect(starsFor(l, l.target)).toBe(1);
    expect(starsFor(l, l.stars[2])).toBe(3);
  });

  it("level rules change the run (duration, determinism)", () => {
    const sprint = allLevels().find((l) => l.kind === "sprint")!;
    const r = bot(sprint.seed, sprint.rules);
    expect(r.ticks).toBeLessThanOrEqual(sprint.rules.durationTicks!); // a run can end early on lives
    expect(replay(sprint.seed, r.inputs, "classic", sprint.rules).score).toBe(r.score);
  });
});

describe("level progress", () => {
  it("unlocks the next level only on reaching the target, keeps bests", () => {
    const t = getLevel(1)!.target;
    let p = levelProgressAfter(undefined, 1, t - 1);
    expect(p.passed).toBe(false); expect(p.progress.unlocked).toBe(1);
    p = levelProgressAfter(p.progress, 1, t);
    expect(p.passed).toBe(true); expect(p.progress.unlocked).toBe(2); expect(p.progress.best["1"]).toBe(t);
    p = levelProgressAfter(p.progress, 1, 10);
    expect(p.progress.best["1"]).toBe(t); expect(p.progress.unlocked).toBe(2);
    expect(levelProgressAfter({ unlocked: 30, best: {} }, 30, 99_999).progress.unlocked).toBe(30);
  });

  it("server locks levels, replays with level rules and saves progress", async () => {
    const id = "player-1";
    await store.transaction(async (tx) => { tx.create(C.players, id, { runs: 0, bestScore: 0, days: 0, createdAt: T0 }); });
    expect(await startRun({ store, secret, now: T0 }, id, "level", null, 2)).toEqual({ error: "locked" });
    expect(await startRun({ store, secret, now: T0 }, null, "level", null, 2)).toEqual({ error: "locked" });
    expect(await startRun({ store, secret, now: T0 }, id, "level", null, 99)).toEqual({ error: "not-found" });

    const start = await startRun({ store, secret, now: T0 }, id, "level", null, 1);
    if ("error" in start) throw new Error("start failed");
    const def = getLevel(1)!;
    expect(start.seed).toBe(def.seed);
    expect(start.level).toMatchObject({ n: 1, target: def.target });
    const run = bot(start.seed, start.rules);
    const res = await finishRun({ store, secret, now: T0 + 70_000 }, id, { runId: start.runId, inputs: run.inputs, score: run.score, version: ENGINE_VERSION });
    if (res.status !== "ok") throw new Error(res.status);
    expect(res.level).toMatchObject({ n: 1, passed: run.score >= def.target, best: run.score });
    const player = await store.get<{ levels: { unlocked: number } }>(C.players, id);
    expect(player!.levels.unlocked).toBe(run.score >= def.target ? 2 : 1);
  });

  it("rejects a score that doesn't match the level-rules replay", async () => {
    const start = await startRun({ store, secret, now: T0 }, null, "level", null, 1);
    if ("error" in start) throw new Error("start failed");
    const run = bot(start.seed, start.rules);
    const res = await finishRun({ store, secret, now: T0 + 70_000 }, null, { runId: start.runId, inputs: run.inputs, score: run.score + 50, version: ENGINE_VERSION });
    expect(res.status).not.toBe("ok");
  });
});
