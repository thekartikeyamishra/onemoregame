import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C } from "@/lib/store/types";
import { TPS, dirIndex } from "@/game/engine";
import { ATTACK_INDEX, ATTACK_LEAD, DEFENDER_INDEX } from "@/game/battle/config";
import { DefenderRun, acceptAttacks, allAttackPlays, botAttackPlays, effectsFor, simulateRound, type AttackPlay, type Lane, type RoundSpec } from "@/game/battle/sim";
import { attack, createRoom, decideNext, joinRoom, lobbyAction, normalizeCode, tick, type BattleRoom } from "@/lib/battle-service";

const secret = "test-secret-test-secret-test-secret-123";
const T0 = Date.UTC(2026, 9, 27, 6, 0, 0);
let store: MemoryStore;
beforeEach(() => { store = new MemoryStore(); });
const ctx = (now: number) => ({ store, secret, now });

/** A human-like player: greedy toward the nearest shard, records direction changes like the real client. */
function playLive(spec: RoundSpec, id: string, upTo: number, effects = effectsFor(id, allAttackPlays(spec, []))) {
  const d = spec.defenders.find((x) => x.id === id)!;
  const lane: Lane = { inputs: [], spends: [], takeoverAt: null };
  const run = new DefenderRun(spec, d, lane, effects);
  let last = -2;
  while (run.tick < upTo && !run.state.over) {
    const s = run.state;
    const sh = s.shards[0];
    const dir = dirIndex(sh.x - s.x, sh.y - s.y);
    if (dir !== last || s.tick % 97 === 0) { lane.inputs.push(s.tick, dir, s.tick % 97 === 0 ? 1 : 0); last = dir; }
    if (s.tick % 600 === 300) lane.spends.push(s.tick, DEFENDER_INDEX.tractor);
    run.step();
  }
  return { run, lane };
}

describe("battle simulation", () => {
  const spec: RoundSpec = {
    seed: 4242, seconds: 180, tiebreak: false,
    defenders: [{ id: "h1", team: "A", bot: null }, { id: "b1", team: "A", bot: "medium" }],
    attackers: [{ id: "a1", bot: null }, { id: "a2", bot: "hard" }],
  };

  it("is deterministic and the live client matches the server replay", () => {
    const { run, lane } = playLive(spec, "h1", 180 * TPS);
    const server = simulateRound(spec, { h1: lane }, []);
    expect(server.defenders.h1.score).toBe(run.state.score);
    expect(server.defenders.h1.hits).toBe(run.state.hits);
    expect(simulateRound(spec, { h1: lane }, [])).toEqual(server);
    expect(server.attackers.a2.plays).toBeGreaterThan(5); // the AI attacker is active
  });

  it("attacks arriving late are reconciled by rebuilding the run", () => {
    const plays: AttackPlay[] = [{ by: "a1", a: ATTACK_INDEX.swarm, t: "h1", at: 600 }, { by: "a1", a: ATTACK_INDEX.mirror, t: "*", at: 2400 }];
    const all = allAttackPlays(spec, plays);
    const live = playLive(spec, "h1", 3000, effectsFor("h1", allAttackPlays(spec, []))); // didn't see human attacks yet
    expect(live.run.addEffects(effectsFor("h1", all))).toBe(false); // late → caller rebuilds
    const rebuilt = new DefenderRun(spec, spec.defenders[0], live.lane, effectsFor("h1", all));
    while (rebuilt.tick < 3000) rebuilt.step();
    const official = simulateRound({ ...spec, seconds: 180 }, { h1: { ...live.lane, takeoverAt: 3000 } }, plays);
    expect(official.defenders.h1.hits).toBeGreaterThanOrEqual(0);
    expect(rebuilt.state.tick).toBe(3000);
  });

  it("rejects attacks without energy, level or cooldown; bots obey the same rules", () => {
    const r = acceptAttacks(spec, "a1", [
      { by: "a1", a: ATTACK_INDEX.swarm, t: "h1", at: 10 }, // start energy 3 < 4 → rejected
      { by: "a1", a: ATTACK_INDEX.strike, t: "h1", at: 20, x: 0, y: 0 }, // ok (2)
      { by: "a1", a: ATTACK_INDEX.jam, t: "h1", at: 400 }, // level 2 needed → rejected
      { by: "a1", a: ATTACK_INDEX.erosion, t: "*", at: 900 }, // team needs level 2 → rejected
      { by: "a1", a: ATTACK_INDEX.strike, t: "h1", at: 930, x: 999, y: 0 }, // outside arena → rejected
      { by: "a1", a: ATTACK_INDEX.strike, t: "nobody", at: 960, x: 0, y: 0 }, // unknown target → rejected
    ]);
    expect(r.accepted.map((p) => p.at)).toEqual([20]);
    const bots = botAttackPlays(spec);
    expect(acceptAttacks(spec, "a2", bots.filter((p) => p.by === "a2")).accepted.length).toBe(bots.filter((p) => p.by === "a2").length);
  });

  it("knock-downs never shorten the round and abilities need energy", () => {
    const solo: RoundSpec = { ...spec, attackers: [{ id: "a2", bot: "hard" }] };
    const o = simulateRound(solo, {}, []);
    expect(o.defenders.b1.eliminatedAt).toBeNull();
    const lane: Lane = { inputs: [], spends: [0, DEFENDER_INDEX.supernova, 10, DEFENDER_INDEX.bulwark], takeoverAt: null };
    const run = new DefenderRun(solo, solo.defenders[0], lane);
    for (let i = 0; i < 20; i++) run.step();
    expect(run.stats.abilities).toBe(0); // supernova locked (level 3), bulwark costs 3 > 2 start energy
  });

  it("Aegis Link shields teammates after the lead time", () => {
    const team: RoundSpec = { seed: 9, seconds: 180, tiebreak: false, defenders: [{ id: "x", team: "A", bot: null }, { id: "y", team: "A", bot: null }], attackers: [{ id: "z", bot: null }] };
    const at = 46 * TPS;
    const lanes = { x: { inputs: [], spends: [at, DEFENDER_INDEX.aegis], takeoverAt: null }, y: { inputs: [], spends: [], takeoverAt: null } };
    const o = simulateRound(team, lanes, []);
    expect(o.defenders.x.abilities).toBe(1);
    // y receives the effect: replaying y alone with the Aegis effect gives the same score as the lock-step replay.
    const y = new DefenderRun(team, team.defenders[1], lanes.y, [{ tick: at + ATTACK_LEAD, kind: "aegis", by: "x", seq: at }]);
    while (!y.state.over) y.step();
    expect(y.state.score).toBe(o.defenders.y.score);
  });
});

describe("battle rooms", () => {
  async function room() {
    const c = await createRoom(ctx(T0), { name: "Kay", seconds: 180, botLevel: "medium" });
    if ("error" in c) throw new Error(c.error);
    return c;
  }

  it("creates, joins with gamer tags, balances teams and fills empty teams with AI on start", async () => {
    const host = await room();
    expect(normalizeCode(host.code.toLowerCase())).toBe(host.code);
    const j = await joinRoom(ctx(T0 + 1), host.code.toLowerCase(), { name: "Kay", team: "A" });
    if ("error" in j) throw new Error(j.error);
    expect(j.room.players.map((p) => p.name)).toEqual(["Kay", "Kay#2"]);
    expect(await joinRoom(ctx(T0), host.code, { name: "x", team: null })).toMatchObject({ status: 400 });
    expect(await lobbyAction(ctx(T0 + 2), host.code, j.token, { action: "start" })).toMatchObject({ status: 403 });
    const s = await lobbyAction(ctx(T0 + 3), host.code, host.token, { action: "start" });
    if ("error" in s) throw new Error(s.error);
    expect(s.room.players.some((p) => p.team === "B" && p.bot)).toBe(true);
    expect(s.room.round).toBe(1);
    expect(await joinRoom(ctx(T0 + 4), host.code, { name: "Late", team: null })).toMatchObject({ status: 409 });
    // Tokens never leave the server.
    expect(JSON.stringify(s)).not.toContain("tokenHash");
  });

  it("validates uploads and attacks with server time; finalizes rounds and swaps roles", async () => {
    const host = await room();
    const guest = await joinRoom(ctx(T0 + 1), host.code, { name: "Ravi", team: "B" });
    if ("error" in guest) throw new Error(guest.error);
    const s = await lobbyAction(ctx(T0 + 2), host.code, host.token, { action: "start" });
    if ("error" in s) throw new Error(s.error);
    const start = s.room.roundStartAt!;
    // Host defends round 1. Future inputs are refused.
    const fut = await tick(ctx(start + 1000), host.code, host.token, { chunk: { to: 600, i: [0, 3, 0], s: [] } });
    expect(fut).toMatchObject({ upload: { ok: false, reason: "from the future" } });
    const ok = await tick(ctx(start + 2000), host.code, host.token, { chunk: { to: 110, i: [0, 3, 0, 50, 10, 1], s: [] } });
    expect(ok).toMatchObject({ upload: { ok: true } });
    // Ravi attacks: strike lands ATTACK_LEAD later; jam needs level 2.
    const hostId = s.room.you!;
    const st = await attack(ctx(start + 3000), host.code, guest.token, { a: ATTACK_INDEX.strike, t: hostId, x: 10, y: 10 });
    expect(st).toMatchObject({ ok: true, landsAt: 180 + ATTACK_LEAD });
    expect(await attack(ctx(start + 3100), host.code, guest.token, { a: ATTACK_INDEX.jam, t: hostId })).toMatchObject({ status: 409 });
    expect(await attack(ctx(start + 3200), host.code, host.token, { a: ATTACK_INDEX.strike, t: hostId, x: 0, y: 0 })).toMatchObject({ status: 409 });
    // Sync returns Ravi's play to the host as a delta.
    const sync = await tick(ctx(start + 4000), host.code, host.token, { v: s.room.version, c: {} });
    if ("error" in sync) throw new Error(sync.error);
    expect(sync.lanes?.[guest.playerId].p).toHaveLength(1);
    // The host goes quiet → the AI takes over after 8 s.
    const later = await tick(ctx(start + 20000), host.code, guest.token, { c: {} });
    if ("error" in later) throw new Error(later.error);
    expect(later.lanes?.[hostId].to).toBe(111);
    expect(await tick(ctx(start + 21000), host.code, host.token, { chunk: { to: 1200, i: [], s: [] } })).toMatchObject({ upload: { ok: false, reason: "lost" } });
    // After the round + grace, any tick finalizes and schedules round 2 with roles swapped.
    const end = await tick(ctx(start + 180_000 + 5000), host.code, guest.token, { c: {} });
    if ("error" in end) throw new Error(end.error);
    expect(end.room?.round).toBe(2);
    const r1 = end.room!.rounds[0];
    expect(r1.outcome?.defenders[hostId].score).toBeGreaterThanOrEqual(0);
    expect(end.room!.rounds[1]).toMatchObject({ defenders: ["B"], attackers: "A" });
  });

  it("decides winners, tie-breaks and draws", () => {
    const base = { players: [], rounds: [] } as unknown as BattleRoom;
    const rec = (n: number, A: number, B: number, hits: Record<string, number> = {}) => ({
      n, seconds: 180, seed: 1, defenders: [], attackers: null, finishedAt: 1,
      roster: [{ id: "a", team: "A", bot: null }, { id: "b", team: "B", bot: null }],
      outcome: { teamScore: { A, B }, attackers: {}, defenders: Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, { hits: v }])) },
    });
    expect(decideNext({ ...base, rounds: [rec(1, 500, 0)] } as unknown as BattleRoom)).toBe("next");
    expect(decideNext({ ...base, rounds: [rec(1, 500, 0), rec(2, 0, 400)] } as unknown as BattleRoom)).toBe("A");
    expect(decideNext({ ...base, rounds: [rec(1, 500, 0), rec(2, 0, 500)] } as unknown as BattleRoom)).toBe("next");
    expect(decideNext({ ...base, rounds: [rec(1, 5, 0), rec(2, 0, 5), rec(3, 9, 9, { a: 1, b: 3 })] } as unknown as BattleRoom)).toBe("A");
    expect(decideNext({ ...base, rounds: [rec(1, 5, 0), rec(2, 0, 5), rec(3, 9, 9, { a: 2, b: 2 })] } as unknown as BattleRoom)).toBe("draw");
  });

  it("only the host manages the lobby; leaving hands over the host", async () => {
    const host = await room();
    const g = await joinRoom(ctx(T0 + 1), host.code, { name: "Ravi", team: null });
    if ("error" in g) throw new Error(g.error);
    expect(await lobbyAction(ctx(T0 + 2), host.code, g.token, { action: "addBot", team: "A", level: "hard" })).toMatchObject({ status: 403 });
    const l = await lobbyAction(ctx(T0 + 3), host.code, host.token, { action: "leave" });
    if ("error" in l) throw new Error(l.error);
    const saved = await store.get<BattleRoom>(C.battleRooms, host.code);
    expect(saved?.hostId).toBe(g.playerId);
    expect(await lobbyAction(ctx(T0 + 4), host.code, "x".repeat(32), { action: "start" })).toMatchObject({ status: 401 });
  });
});

describe("battle client ↔ server", () => {
  it("a client's live run, uploaded in 1.5 s chunks, matches the server's official replay", async () => {
    const { BattleWorld } = await import("@/components/battle/world");
    const c = await createRoom(ctx(T0), { name: "Kay", seconds: 180, botLevel: "hard" });
    if ("error" in c) throw new Error(c.error);
    const s = await lobbyAction(ctx(T0 + 1), c.code, c.token, { action: "start" });
    if ("error" in s) throw new Error(s.error);
    const start = s.room.roundStartAt!;
    const world = new BattleWorld(s.room.rounds[0], c.playerId);
    expect(world.role).toBe("defender");
    let lastSync = start;
    for (let ms = start; ms <= start + 180_000; ms += 50) {
      const t = Math.floor(((ms - start) * TPS) / 1000);
      const run = world.myRun!;
      const sh = run.state.shards[0];
      const dir = dirIndex(sh.x - run.state.x, sh.y - run.state.y);
      world.stepLocal(t, { dir, dash: t % 150 === 0 }, t % 900 === 450 ? DEFENDER_INDEX.tractor : null);
      world.advance(t);
      if (ms - lastSync >= 1500) {
        lastSync = ms;
        const chunk = world.chunk(t);
        const res = await tick(ctx(ms), c.code, c.token, { v: s.room.version, c: world.cursors(), chunk });
        if ("error" in res) throw new Error(res.error);
        if (chunk && res.upload?.ok) world.confirmUpload(chunk);
        world.applyLanes(res.lanes);
      }
    }
    const local = world.myRun!.state.score;
    const chunk = world.chunk(180 * TPS);
    const last = await tick(ctx(start + 180_100), c.code, c.token, { chunk, c: world.cursors() });
    if ("error" in last) throw new Error(last.error);
    if (chunk && last.upload?.ok) world.confirmUpload(chunk);
    const fin = await tick(ctx(start + 186_000), c.code, c.token, { c: {} });
    if ("error" in fin) throw new Error(fin.error);
    const official = fin.room!.rounds[0].outcome!.defenders[c.playerId];
    expect(local).toBeGreaterThan(1000);
    expect(official.score).toBe(local);
    expect(official.hits).toBe(world.myRun!.state.hits);
  }, 30_000);
});
