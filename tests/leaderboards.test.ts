import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C, type DocData, type Query, type Range, type Store, type Tx } from "@/lib/store/types";
import { board, dayKey, finishRun, msToReset, standing, startRun, weekKey, wouldRank } from "@/lib/game-service";
import { ENGINE_VERSION, InputRecorder, createGame, dirIndex, step, type TwistId } from "@/game/engine";

const secret = "test-secret-test-secret-test-secret-123";
const T0 = Date.UTC(2026, 9, 26, 6, 0, 0); // Monday 26 Oct 2026, 11:30 IST
let store: MemoryStore;
beforeEach(() => { store = new MemoryStore(); });

/** Counts datastore operations (what Firestore bills). */
class Counting implements Store {
  reads = 0; writes = 0;
  constructor(private s: Store) {}
  transaction<R>(fn: (tx: Tx) => Promise<R>) {
    return this.s.transaction((tx) => fn({
      get: (c, id) => { this.reads++; return tx.get(c, id); },
      create: (c, id, d) => { this.writes++; tx.create(c, id, d); },
      set: (c, id, d) => { this.writes++; tx.set(c, id, d); },
      update: (c, id, d) => { this.writes++; tx.update(c, id, d); },
      delete: (c, id) => { this.writes++; tx.delete(c, id); },
    }));
  }
  get<T extends DocData>(c: string, id: string) { this.reads++; return this.s.get<T>(c, id); }
  getMany<T extends DocData>(c: string, ids: string[]) { this.reads += ids.length; return this.s.getMany<T>(c, ids); }
  add(c: string, d: DocData) { this.writes++; return this.s.add(c, d); }
  async query<T extends DocData>(c: string, q: Query) { const r = await this.s.query<T>(c, q); this.reads += Math.max(1, r.length); return r; }
  count(c: string, w: Array<[string, unknown]>, r?: Range) { this.reads++; return this.s.count(c, w, r); }
  delete(c: string, id: string) { this.writes++; return this.s.delete(c, id); }
}

function simulate(seed: number, twist: TwistId, variant: number) {
  const s = createGame(seed, twist), rec = new InputRecorder();
  while (!s.over) {
    const sh = s.shards[variant % s.shards.length];
    const input = { dir: dirIndex(sh.x - s.x, sh.y - s.y), dash: s.tick % (120 + variant) === 0 };
    rec.record(s.tick, input); step(s, input);
  }
  return { inputs: rec.log, score: s.score };
}

async function daily(st: Store, id: string, now: number, variant = 0) {
  const start = await startRun({ store: st, secret, now }, id, "daily");
  if ("error" in start) throw new Error("start");
  const run = simulate(start.seed, start.twist.id, variant);
  const res = await finishRun({ store: st, secret, now: now + 70_000 }, id, { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: ENGINE_VERSION });
  if (res.status !== "ok") throw new Error(res.status);
  return run.score;
}

describe("leaderboards", () => {
  it("weekly totals add each day's best; days and resets use India time", async () => {
    await store.transaction(async (tx) => { tx.set(C.players, "p1", { displayName: "Asha", runs: 0, bestScore: 0 }); });
    const d1 = await daily(store, "p1", T0, 1);
    const d1b = await daily(store, "p1", T0 + 3_600_000, 2); // second run same day: only the best counts
    const d2 = await daily(store, "p1", T0 + 864e5, 3);
    const wk = await board(store, "week", weekKey(dayKey(T0)), T0);
    expect(wk.entries[0]).toMatchObject({ score: Math.max(d1, d1b) + d2, days: 2 });
    expect(weekKey("2026-11-01")).toBe("2026-10-26"); // Sunday belongs to the week starting Monday
    expect(weekKey("2026-11-02")).toBe("2026-11-02");
    expect(msToReset(Date.UTC(2026, 9, 26, 18, 0))).toBe(30 * 60 * 1000); // 23:30 IST → 30 min
  });

  it("standing shows rank, the player ahead and behind; guests see where they'd place", async () => {
    const day = dayKey(T0);
    await store.transaction(async (tx) => {
      for (const [id, name, score] of [["a", "Asha", 900], ["b", "Ravi", 700], ["c", "Kay", 700], ["d", "Mo", 300]] as const) {
        tx.set(C.dailyScores, `${day}_${id}`, { day, week: weekKey(day), signupId: id, displayName: name, score, streak: id === "a" ? 4 : 0 });
      }
    });
    const pub = await board(store, "day", day, T0);
    expect(pub.entries.map((e) => e.rank)).toEqual([1, 2, 2, 4]); // ties share a rank
    expect(pub.entries[0].streak).toBe(4);
    expect(pub.players).toBe(4);
    expect(JSON.stringify(pub)).not.toContain('"signupId"');
    const me = await standing(store, "day", day, "d");
    expect(me).toMatchObject({ rank: 4, players: 4, ahead: { score: 700, gap: 400 }, behind: null });
    const top = await standing(store, "day", day, "a");
    expect(top).toMatchObject({ rank: 1, ahead: null, behind: { name: "Ravi", gap: 200 } });
    expect(await wouldRank(store, day, 800)).toMatchObject({ rank: 2, players: 4 });
    expect((await standing(store, "day", day, "nobody")).rank).toBeNull();
  });

  it("run tickets are single use and can't be forged or moved to another player", async () => {
    const start = await startRun({ store, secret, now: T0 }, null, "daily");
    if ("error" in start) throw new Error();
    const run = simulate(start.seed, start.twist.id, 0);
    const body = { runId: start.runId, ticket: start.ticket, inputs: run.inputs, score: run.score, version: ENGINE_VERSION };
    const forged = start.ticket.replace(/^[^.]+/, Buffer.from(JSON.stringify({ r: start.runId, s: null, m: "daily", seed: 1, d: null, tw: "classic", lv: null, c: null, t: T0 })).toString("base64url"));
    expect((await finishRun({ store, secret, now: T0 + 70_000 }, null, { ...body, ticket: forged })).status).toBe("expired");
    expect((await finishRun({ store, secret, now: T0 + 70_000 }, "someone", body)).status).toBe("forbidden");
    expect((await finishRun({ store, secret, now: T0 + 70_000 }, null, { ...body, runId: "x".repeat(16) })).status).toBe("expired");
    expect((await finishRun({ store, secret, now: T0 + 70_000 }, null, body)).status).toBe("ok");
    expect((await finishRun({ store, secret, now: T0 + 80_000 }, null, body)).status).toBe("expired");
    expect((await finishRun({ store, secret, now: T0 + 31 * 60_000 }, null, { ...body })).status).toBe("expired");
  });

  it("keeps database cost per run low", async () => {
    const c = new Counting(store);
    await store.transaction(async (tx) => { tx.set(C.players, "p1", { displayName: "Asha", runs: 0, bestScore: 0 }); });
    await daily(c, "p1", T0, 1);
    // start: 0 reads/writes; finish: duplicate check + tx reads (run, player, daily, weekly) + writes (run, player, daily, weekly)
    expect(c.writes).toBeLessThanOrEqual(4);
    expect(c.reads).toBeLessThanOrEqual(5);
    c.reads = 0; c.writes = 0;
    const day = dayKey(T0);
    await board(c, "day", day); await board(c, "day", day); await board(c, "day", day);
    expect(c.reads).toBeLessThanOrEqual(2); // top list + player count, then served from cache
  });
});

describe("weekly podium", () => {
  it("shows last week's top 3 on the weekly board", async () => {
    const { prevWeekKey } = await import("@/lib/game-service");
    const week = weekKey(dayKey(T0)), prev = prevWeekKey(week);
    expect(prev).toBe("2026-10-19");
    await store.transaction(async (tx) => {
      for (const [id, name, score] of [["a", "Asha", 9000], ["b", "Ravi", 7000], ["c", "Kay", 5000], ["d", "Mo", 100]] as const) tx.set(C.weeklyScores, `${prev}_${id}`, { week: prev, signupId: id, displayName: name, score });
    });
    const b = await board(store, "week", week, T0);
    expect(b.champions?.map((c) => c.name)).toEqual(["Asha", "Ravi", "Kay"]);
    expect((await board(store, "day", dayKey(T0), T0)).champions).toBeUndefined();
  });
});
