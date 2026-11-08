/**
 * Battle rooms: lobby, teams, AI fill-ins, low-bandwidth sync, server-authoritative rounds.
 *
 * Bandwidth: each player sends one small request every ~1.5 s (only new direction changes and ability presses)
 * and receives only what changed since its cursors. Every client re-simulates the other players from those inputs
 * (the engine is deterministic), so no positions are ever streamed.
 *
 * Authority: attacks are stamped with the server's tick and validated (energy, level, cooldown); round results
 * come from a full server replay of every input. Clients only render.
 */
import { TPS } from "@/game/engine";
import {
  ATTACK_ABILITIES, ATTACK_LEAD, BETWEEN_ROUNDS_MS, BOT_NAMES, COUNTDOWN_MS, DEFENDER_ABILITIES, MAX_BATTLE_INPUTS, MAX_LATE_TICKS,
  MAX_PLAYERS, MAX_TEAM, PLAYER_COLORS, ROUND_SECONDS, TAKEOVER_AFTER_TICKS, TIEBREAK_SECONDS,
  type BotLevel, type RoundSeconds, type TeamId,
} from "@/game/battle/config";
import { acceptAttacks, simulateRound, specOf, type AttackPlay, type Lane, type RoundOutcome } from "@/game/battle/sim";
export { specOf };
import { hmac, randomBytesInt, randomToken, safeEqual } from "./crypto";
import type { Ctx } from "./early-access";
import { cleanDisplayName } from "./game-service";
import { C, type Store } from "./store/types";
import { TtlCache } from "./ttl-cache";
import type { PublicRoom } from "./battle-types";
export type { PublicRoom };

export const ROOM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const FINAL_GRACE_MS = 4000;
const MIN_POST_GAP_MS = 500;

export interface BattlePlayer { id: string; name: string; color: string; team: TeamId; bot: BotLevel | null; tokenHash: string | null; joinedAt: number; seenAt?: number }
export interface RoundRecord {
  n: number; seconds: number; seed: number; defenders: TeamId[]; attackers: TeamId | null;
  roster: Array<{ id: string; team: TeamId; bot: BotLevel | null }>;
  outcome: RoundOutcome | null; finishedAt: number | null;
}
export interface BattleRoom {
  [key: string]: unknown;
  code: string; createdAt: number; expiresAt: Date; hostId: string; seconds: RoundSeconds; botLevel: BotLevel;
  status: "lobby" | "playing" | "done";
  players: BattlePlayer[];
  match: number;
  /** Current or upcoming round (1–3); its start time and seed. */
  round: number; roundStartAt: number | null;
  rounds: RoundRecord[];
  finalizing: number | null;
  winner: TeamId | "draw" | null;
  version: number;
}
/**
 * A player's lane for one round. Only the recent "head" lives in this document (small, cheap to read every sync);
 * older inputs are archived in segment documents (`battleLaneSegs`), read only by late joiners and the final replay.
 * This keeps every document far below Firestore's size and index limits and keeps sync reads small.
 */
interface LaneDoc {
  [key: string]: unknown;
  head: number[]; sh: number[]; // inputs / spends since the last archive
  base: number; sbase: number; // absolute offsets of head[0] / sh[0]
  segs: Array<[number, number]>; // [inputs base, spends base] of each archived segment
  last: [number, number]; // last input tick / last spend tick (for ordering checks)
  count: number; // total input numbers
  plays: AttackPlay[]; lastTick: number; takeoverAt: number | null; lastPostAt: number; expiresAt: Date;
}
interface SegDoc { [key: string]: unknown; i: number[]; s: number[]; expiresAt: Date }
const HEAD_MAX = 900;
const PRESENCE_WRITE_MS = 12_000;
const segId = (lane: string, k: number) => `${lane}_s${k}`;

export type BattleError = { error: string; status: number };
const err = (error: string, status = 400): BattleError => ({ error, status });

// ----------------------------------------------------------------------------------------------- per-instance caches
// Every player in a room syncs every ~1.5 s and needs the same room and lane documents. When several players are
// served by the same server instance, these short caches turn N reads into 1. Writes refresh the cache, so a player
// always sees their own changes immediately; other players' changes appear within a second.
const roomCaches = new WeakMap<Store, TtlCache<BattleRoom>>();
const laneCaches = new WeakMap<Store, TtlCache<LaneDoc | null>>();
function roomCache(store: Store) { let c = roomCaches.get(store); if (!c) roomCaches.set(store, (c = new TtlCache<BattleRoom>(600, 500))); return c; }
function laneCache(store: Store) { let c = laneCaches.get(store); if (!c) laneCaches.set(store, (c = new TtlCache<LaneDoc | null>(700, 3000))); return c; }
async function getRoom(store: Store, code: string): Promise<BattleRoom | null> {
  const hit = roomCache(store).get(code);
  if (hit) return hit;
  const room = await store.get<BattleRoom>(C.battleRooms, code);
  if (room) roomCache(store).set(code, room);
  return room;
}
async function getLanes(store: Store, ids: string[]): Promise<Array<LaneDoc | null>> {
  const cache = laneCache(store);
  const out: Array<LaneDoc | null | undefined> = ids.map((id) => cache.get(id));
  const missing = ids.filter((_, k) => out[k] === undefined);
  if (missing.length) {
    const docs = await store.getMany<LaneDoc>(C.battleLanes, missing);
    missing.forEach((id, k) => cache.set(id, docs[k]));
    for (let k = 0, m = 0; k < ids.length; k++) if (out[k] === undefined) out[k] = docs[m++];
  }
  return out as Array<LaneDoc | null>;
}

// ----------------------------------------------------------------------------------------------------------- helpers
function roomCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ROOM_ALPHABET[randomBytesInt() % ROOM_ALPHABET.length];
  return s;
}
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toUpperCase();
  return /^[A-HJ-KM-NP-Z2-9]{6}$/.test(v) ? v : null;
}
const tokenHash = (secret: string, code: string, token: string) => hmac(secret, `battle:${code}:${token}`);
const laneId = (room: BattleRoom, round: number, pid: string) => `${room.code}_${room.match}_${round}_${pid}`;
const freeColor = (room: BattleRoom) => PLAYER_COLORS.find((c) => !room.players.some((p) => p.color === c)) ?? PLAYER_COLORS[room.players.length % PLAYER_COLORS.length];
const teamSize = (room: BattleRoom, t: TeamId) => room.players.filter((p) => p.team === t).length;
function uniqueName(room: BattleRoom, name: string): string {
  if (!room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return name;
  for (let i = 2; i < 20; i++) { const n = `${name.slice(0, 13)}#${i}`; if (!room.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return n; }
  return `${name.slice(0, 10)}#${randomBytesInt() % 1000}`;
}
function roundSeed(secret: string, room: BattleRoom, n: number): number {
  return parseInt(hmac(secret, `battle-seed:${room.code}:${room.match}:${n}`).slice(0, 8), 16) % 2147483647;
}

/** Short rounds for automated tests only (never active in a real deployment: requires ALLOW_INSECURE_DEV_BACKENDS). */
function testSeconds(): number | null {
  const v = Number(process.env.BATTLE_TEST_ROUND_SECONDS);
  return process.env.ALLOW_INSECURE_DEV_BACKENDS === "true" && Number.isInteger(v) && v >= 10 && v <= 60 ? v : null;
}

function newRound(secret: string, room: BattleRoom, n: number): RoundRecord {
  const roster = room.players.map((p) => ({ id: p.id, team: p.team, bot: p.bot }));
  const seconds = testSeconds() ?? (n === 3 ? TIEBREAK_SECONDS : room.seconds);
  if (n === 3) return { n, seconds, seed: roundSeed(secret, room, n), defenders: ["A", "B"], attackers: null, roster, outcome: null, finishedAt: null };
  const defend: TeamId = n === 1 ? "A" : "B";
  return { n, seconds, seed: roundSeed(secret, room, n), defenders: [defend], attackers: defend === "A" ? "B" : "A", roster, outcome: null, finishedAt: null };
}

export function publicRoom(room: BattleRoom, you: string | null): PublicRoom {
  return {
    code: room.code, hostId: room.hostId, seconds: room.seconds, botLevel: room.botLevel, status: room.status, match: room.match,
    round: room.round, roundStartAt: room.roundStartAt, winner: room.winner, version: room.version,
    players: room.players.map(({ id, name, color, team, bot, seenAt }) => ({ id, name, color, team, bot, ...(bot ? {} : { seenAt: seenAt ?? 0 }) })),
    rounds: room.rounds.map((r) => ({ ...r, finishedAt: r.outcome ? r.finishedAt : null })),
    you,
  };
}

async function auth(ctx: Ctx, code: string, token: unknown): Promise<{ room: BattleRoom; me: BattlePlayer } | BattleError> {
  const room = await getRoom(ctx.store, code);
  if (!room) return err("Room not found.", 404);
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return err("Join the room first.", 401);
  const h = tokenHash(ctx.secret, code, token);
  const me = room.players.find((p) => p.tokenHash && safeEqual(p.tokenHash, h));
  return me ? { room, me } : err("You're not in this room (you may have been removed).", 401);
}
const isErr = (v: unknown): v is BattleError => !!v && typeof v === "object" && "error" in v && "status" in v;

/** Room mutation with optimistic retry; `fn` returns an error or mutates `room` in place. */
async function mutate(ctx: Ctx, code: string, fn: (room: BattleRoom, now: number) => BattleError | void): Promise<BattleRoom | BattleError> {
  const now = ctx.now ?? Date.now();
  return ctx.store.transaction(async (tx) => {
    const room = await tx.get<BattleRoom>(C.battleRooms, code);
    if (!room) return err("Room not found.", 404);
    const e = fn(room, now);
    if (e) return e;
    room.version++;
    room.expiresAt = new Date(now + ROOM_TTL_MS);
    tx.set(C.battleRooms, code, room as unknown as Record<string, unknown>);
    return room;
  }).then((r) => { if (!isErr(r)) roomCache(ctx.store).set(code, r); return r; });
}

// ------------------------------------------------------------------------------------------------------------ lobby
export async function createRoom(ctx: Ctx, input: { name: unknown; seconds: unknown; botLevel: unknown }) {
  const name = cleanDisplayName(input.name);
  if (!name) return err("Use a gamer tag of 3–16 letters, numbers, spaces, dots, dashes or underscores.");
  const seconds = (ROUND_SECONDS as readonly number[]).includes(Number(input.seconds)) ? (Number(input.seconds) as RoundSeconds) : 90;
  const botLevel: BotLevel = input.botLevel === "easy" || input.botLevel === "hard" ? input.botLevel : "medium";
  const now = ctx.now ?? Date.now();
  const token = randomToken(24), id = randomToken(6);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = roomCode();
    const room: BattleRoom = {
      code, createdAt: now, expiresAt: new Date(now + ROOM_TTL_MS), hostId: id, seconds, botLevel, status: "lobby",
      players: [{ id, name, color: PLAYER_COLORS[0], team: "A", bot: null, tokenHash: tokenHash(ctx.secret, code, token), joinedAt: now, seenAt: now }],
      match: 1, round: 0, roundStartAt: null, rounds: [], finalizing: null, winner: null, version: 1,
    };
    try {
      await ctx.store.transaction(async (tx) => { tx.create(C.battleRooms, code, room as unknown as Record<string, unknown>); });
      return { code, token, playerId: id, room: publicRoom(room, id) };
    } catch { /* code collision: try another */ }
  }
  return err("Couldn't create a room. Try again.", 503);
}

export async function joinRoom(ctx: Ctx, rawCode: unknown, input: { name: unknown; team: unknown; token?: unknown }) {
  const code = normalizeCode(rawCode);
  if (!code) return err("Room codes are 6 letters/numbers.", 404);
  // Re-joining with a valid token (refresh, second tab) returns the same seat.
  if (typeof input.token === "string") {
    const a = await auth(ctx, code, input.token);
    if (!isErr(a)) return { code, token: input.token, playerId: a.me.id, room: publicRoom(a.room, a.me.id) };
  }
  const name = cleanDisplayName(input.name);
  if (!name) return err("Use a gamer tag of 3–16 letters, numbers, spaces, dots, dashes or underscores.");
  const token = randomToken(24), id = randomToken(6);
  const wanted: TeamId | null = input.team === "A" || input.team === "B" ? input.team : null;
  const r = await mutate(ctx, code, (room, now) => {
    if (room.status !== "lobby") return err("This battle has already started. Ask for a rematch invite.", 409);
    if (room.players.length >= MAX_PLAYERS) {
      // Replace a bot if the room is full of bots.
      const bot = room.players.find((p) => p.bot && (!wanted || p.team === wanted));
      if (!bot) return err("This room is full (10 players).", 409);
      room.players = room.players.filter((p) => p !== bot);
    }
    let team: TeamId = wanted ?? (teamSize(room, "A") <= teamSize(room, "B") ? "A" : "B");
    if (teamSize(room, team) >= MAX_TEAM) {
      const bot = room.players.find((p) => p.bot && p.team === team);
      if (bot) room.players = room.players.filter((p) => p !== bot);
      else team = team === "A" ? "B" : "A";
    }
    if (teamSize(room, team) >= MAX_TEAM) return err("Both teams are full.", 409);
    room.players.push({ id, name: uniqueName(room, name), color: freeColor(room), team, bot: null, tokenHash: tokenHash(ctx.secret, code, token), joinedAt: now, seenAt: now });
  });
  if (isErr(r)) return r;
  return { code, token, playerId: id, room: publicRoom(r, id) };
}

type LobbyAction =
  | { action: "team"; team: unknown }
  | { action: "addBot"; team: unknown; level: unknown }
  | { action: "remove"; playerId: unknown }
  | { action: "settings"; seconds?: unknown; botLevel?: unknown }
  | { action: "start" }
  | { action: "leave" }
  | { action: "rematch" };

export async function lobbyAction(ctx: Ctx, rawCode: unknown, token: unknown, a: LobbyAction) {
  const code = normalizeCode(rawCode);
  if (!code) return err("Room not found.", 404);
  const who = await auth(ctx, code, token);
  if (isErr(who)) return who;
  const meId = who.me.id;
  const r = await mutate(ctx, code, (room, now) => {
    const me = room.players.find((p) => p.id === meId);
    if (!me) return err("You're not in this room.", 401);
    const host = room.hostId === meId;
    const inLobby = room.status === "lobby";
    switch (a.action) {
      case "team": {
        if (!inLobby) return err("Teams are locked during a battle.", 409);
        const t = a.team === "A" || a.team === "B" ? a.team : null;
        if (!t || t === me.team) return;
        if (teamSize(room, t) >= MAX_TEAM) {
          const bot = room.players.find((p) => p.bot && p.team === t);
          if (!bot) return err("That team is full.", 409);
          bot.team = me.team; // swap the bot to keep counts
        }
        me.team = t;
        return;
      }
      case "addBot": {
        if (!host) return err("Only the host can add AI players.", 403);
        if (!inLobby) return err("The battle has started.", 409);
        const t = a.team === "A" || a.team === "B" ? a.team : null;
        const level: BotLevel = a.level === "easy" || a.level === "hard" ? a.level : a.level === "medium" ? "medium" : room.botLevel;
        if (!t) return err("Pick a team.");
        if (teamSize(room, t) >= MAX_TEAM || room.players.length >= MAX_PLAYERS) return err("That team is full.", 409);
        const used = new Set(room.players.map((p) => p.name));
        const base = BOT_NAMES.find((n) => !used.has(`${n} (AI)`)) ?? "Bot";
        room.players.push({ id: randomToken(6), name: `${base} (AI)`, color: freeColor(room), team: t, bot: level, tokenHash: null, joinedAt: now });
        return;
      }
      case "remove": {
        if (!host) return err("Only the host can remove players.", 403);
        if (!inLobby) return err("Players can't be removed during a battle; the AI fills in for anyone who leaves.", 409);
        if (a.playerId === meId) return err("Use Leave instead.");
        room.players = room.players.filter((p) => p.id !== a.playerId);
        return;
      }
      case "settings": {
        if (!host) return err("Only the host can change settings.", 403);
        if (!inLobby) return err("The battle has started.", 409);
        if (a.seconds !== undefined) {
          if (!(ROUND_SECONDS as readonly number[]).includes(Number(a.seconds))) return err("Rounds are 90 seconds, 3 or 5 minutes.");
          room.seconds = Number(a.seconds) as RoundSeconds;
        }
        if (a.botLevel === "easy" || a.botLevel === "medium" || a.botLevel === "hard") {
          room.botLevel = a.botLevel;
          for (const p of room.players) if (p.bot) p.bot = a.botLevel;
        }
        return;
      }
      case "start": {
        if (!host) return err("Only the host can start.", 403);
        if (!inLobby) return err("Already started.", 409);
        // Empty team? The AI steps in so nobody waits.
        for (const t of ["A", "B"] as TeamId[]) {
          if (teamSize(room, t) === 0) {
            const used = new Set(room.players.map((p) => p.name));
            const base = BOT_NAMES.find((n) => !used.has(`${n} (AI)`)) ?? "Bot";
            room.players.push({ id: randomToken(6), name: `${base} (AI)`, color: freeColor(room), team: t, bot: room.botLevel, tokenHash: null, joinedAt: now });
          }
        }
        room.status = "playing"; room.round = 1; room.roundStartAt = now + COUNTDOWN_MS; room.winner = null; room.finalizing = null;
        room.rounds = [newRound(ctx.secret, room, 1)];
        return;
      }
      case "leave": {
        if (inLobby || room.status === "done") {
          room.players = room.players.filter((p) => p.id !== meId);
          if (!room.players.some((p) => !p.bot)) { room.status = "done"; return; }
        } else {
          me.tokenHash = null; // seat kept; the AI plays it (see takeovers)
        }
        if (host) room.hostId = room.players.find((p) => !p.bot && p.tokenHash)?.id ?? room.hostId;
        return;
      }
      case "rematch": {
        if (!host) return err("Only the host can start a rematch.", 403);
        if (room.status !== "done") return err("Finish this battle first.", 409);
        room.status = "lobby"; room.match++; room.round = 0; room.roundStartAt = null; room.rounds = []; room.winner = null; room.finalizing = null;
        room.players = room.players.filter((p) => p.bot || p.tokenHash);
        return;
      }
    }
  });
  if (isErr(r)) return r;
  return { room: publicRoom(r, meId) };
}

// ------------------------------------------------------------------------------------------------------------- live
export interface TickBody {
  v?: unknown;
  c?: unknown; // cursors: { [playerId]: [inputs, spends, plays] }
  chunk?: unknown; // defender upload: { to, i: triples, s: pairs }
}
const currentRound = (room: BattleRoom) => room.rounds.find((r) => r.n === room.round) ?? null;
const serverTick = (room: BattleRoom, now: number) => (room.roundStartAt === null ? -1 : Math.floor(((now - room.roundStartAt) * TPS) / 1000));

function validChunk(raw: unknown, lane: LaneDoc, sTick: number, total: number): { to: number; i: number[]; s: number[] } | string {
  if (!raw || typeof raw !== "object") return "bad chunk";
  const c = raw as { to?: unknown; i?: unknown; s?: unknown };
  const to = c.to, i = Array.isArray(c.i) ? c.i : [], s = Array.isArray(c.s) ? c.s : [];
  if (typeof to !== "number" || !Number.isInteger(to) || to <= lane.lastTick || to >= total) return "bad range";
  if (to > sTick + 30) return "from the future";
  if (sTick - to > MAX_LATE_TICKS) return "too late";
  if (i.length % 3 || s.length % 2 || i.length > 3000 || s.length > 200) return "bad size";
  if (lane.count + i.length > MAX_BATTLE_INPUTS * 3) return "too many inputs";
  let prev = Math.max(lane.last[0], lane.lastTick);
  for (let k = 0; k < i.length; k += 3) {
    const [t, d, dash] = [i[k], i[k + 1], i[k + 2]];
    if (!Number.isInteger(t) || t <= prev || t > to || !Number.isInteger(d) || d < -1 || d > 63 || (dash !== 0 && dash !== 1)) return "bad input";
    prev = t;
  }
  let prevS = Math.max(lane.last[1], lane.lastTick);
  for (let k = 0; k < s.length; k += 2) {
    const [t, a] = [s[k], s[k + 1]];
    if (!Number.isInteger(t) || t <= prevS || t > to || !Number.isInteger(a) || a < 0 || a >= DEFENDER_ABILITIES.length) return "bad ability";
    prevS = t;
  }
  return { to, i: i as number[], s: s as number[] };
}
const emptyLane = (now: number): LaneDoc => ({ head: [], sh: [], base: 0, sbase: 0, segs: [], last: [-1, -1], count: 0, plays: [], lastTick: -1, takeoverAt: null, lastPostAt: 0, expiresAt: new Date(now + ROOM_TTL_MS) });

/** Full inputs/spends of a lane from `from` offsets (reads archived segments only when needed). */
async function laneSlice(ctx: Ctx, id: string, d: LaneDoc, fromI: number, fromS: number): Promise<{ i: number[]; s: number[] }> {
  if (fromI >= d.base && fromS >= d.sbase) return { i: d.head.slice(fromI - d.base), s: d.sh.slice(fromS - d.sbase) };
  // First archived segment that contains either cursor.
  let k = d.segs.length - 1;
  while (k > 0 && (d.segs[k][0] > fromI || d.segs[k][1] > fromS)) k--;
  const ids: string[] = [];
  for (let j = Math.max(0, k); j < d.segs.length; j++) ids.push(segId(id, j));
  const segs = await ctx.store.getMany<SegDoc>(C.battleLaneSegs, ids);
  const allI: number[] = [], allS: number[] = [];
  const startI = d.segs[Math.max(0, k)]?.[0] ?? d.base, startS = d.segs[Math.max(0, k)]?.[1] ?? d.sbase;
  for (const sd of segs) { if (sd) { allI.push(...sd.i); allS.push(...sd.s); } }
  allI.push(...d.head); allS.push(...d.sh);
  return { i: allI.slice(Math.max(0, fromI - startI)), s: allS.slice(Math.max(0, fromS - startS)) };
}

/** One sync step for a player: optional upload, then everything new since the client's cursors. */
export async function tick(ctx: Ctx, rawCode: unknown, token: unknown, body: TickBody) {
  const code = normalizeCode(rawCode);
  if (!code) return err("Room not found.", 404);
  const who = await auth(ctx, code, token);
  if (isErr(who)) return who;
  let { room } = who;
  const me = who.me;
  const now = ctx.now ?? Date.now();
  // Presence: a cheap heartbeat (at most one write per player every 12 s) so everyone sees who's really here.
  if (room.status !== "playing" && now - (me.seenAt ?? me.joinedAt) > PRESENCE_WRITE_MS) {
    const r = await mutate(ctx, code, (rm) => { const p = rm.players.find((x) => x.id === me.id); if (p) p.seenAt = now; });
    if (!isErr(r)) room = r;
  }
  let upload: { ok: boolean; reason?: string } | undefined;

  const rec = currentRound(room);
  if (room.status === "playing" && rec && room.roundStartAt !== null) {
    const spec = specOf(rec), total = rec.seconds * TPS, sTick = serverTick(room, now);
    const isDefender = spec.defenders.some((d) => d.id === me.id);

    // 1) Upload (defenders only).
    if (body.chunk && isDefender && sTick >= 0) {
      upload = await ctx.store.transaction(async (tx) => {
        const id = laneId(room, rec.n, me.id);
        const lane = (await tx.get<LaneDoc>(C.battleLanes, id)) ?? emptyLane(now);
        if (lane.takeoverAt !== null) return { ok: false, reason: "lost" };
        if (now - lane.lastPostAt < MIN_POST_GAP_MS) return { ok: false, reason: "slow down" };
        const v = validChunk(body.chunk, lane, sTick, total);
        if (typeof v === "string") return { ok: false, reason: v === "too late" ? "lost" : v };
        lane.head.push(...v.i); lane.sh.push(...v.s); lane.count += v.i.length;
        if (v.i.length) lane.last[0] = v.i[v.i.length - 3];
        if (v.s.length) lane.last[1] = v.s[v.s.length - 2];
        lane.lastTick = v.to; lane.lastPostAt = now;
        if (lane.head.length + lane.sh.length > HEAD_MAX) {
          tx.create(C.battleLaneSegs, segId(id, lane.segs.length), { i: lane.head, s: lane.sh, expiresAt: new Date(now + ROOM_TTL_MS) });
          lane.segs.push([lane.base, lane.sbase]);
          lane.base += lane.head.length; lane.sbase += lane.sh.length; lane.head = []; lane.sh = [];
        }
        tx.set(C.battleLanes, id, lane as unknown as Record<string, unknown>);
        laneCache(ctx.store).set(id, lane);
        return { ok: true };
      });
    }

    // 2) Finalize the round once it's over (any client can trigger; a lock prevents duplicate work).
    if (now >= room.roundStartAt + rec.seconds * 1000 + FINAL_GRACE_MS) {
      const fin = await finalizeRound(ctx, room, rec.n);
      if (fin) room = fin;
    }
  }

  // Lanes (deltas) for the current round.
  const cur = currentRound(room);
  let lanes: Record<string, { i: number[]; s: number[]; p: AttackPlay[]; o: [number, number, number]; lt: number; to: number | null }> | undefined;
  if (room.status === "playing" && cur && !cur.outcome) {
    const humans = cur.roster.filter((p) => !p.bot);
    const ids = humans.map((p) => laneId(room, cur.n, p.id));
    const docs = await getLanes(ctx.store, ids);
    // 3) Takeovers: a human defender who stopped uploading is replaced by the AI from their last tick.
    const sTick = serverTick(room, now);
    if (sTick > TAKEOVER_AFTER_TICKS) {
      const defenders = new Set(specOf(cur).defenders.map((d) => d.id));
      for (let k = 0; k < humans.length; k++) {
        if (!defenders.has(humans[k].id) || docs[k]?.takeoverAt != null || sTick - (docs[k]?.lastTick ?? -1) <= TAKEOVER_AFTER_TICKS) continue;
        docs[k] = await takeover(ctx, ids[k], sTick, now);
      }
    }
    const cursors = (body.c && typeof body.c === "object" ? body.c : {}) as Record<string, unknown>;
    lanes = {};
    for (let k = 0; k < humans.length; k++) {
      const d = docs[k], p = humans[k];
      if (!d) continue;
      const c = Array.isArray(cursors[p.id]) ? (cursors[p.id] as unknown[]).map((n) => (Number.isInteger(n) && (n as number) >= 0 ? (n as number) : 0)) : [0, 0, 0];
      const [ci, cs, cp] = [Math.min(c[0] ?? 0, d.count), c[1] ?? 0, c[2] ?? 0];
      const sl = await laneSlice(ctx, ids[k], d, ci, cs);
      lanes[p.id] = { i: sl.i, s: sl.s, p: d.plays.slice(cp), o: [ci, cs, cp], lt: d.lastTick, to: d.takeoverAt };
    }
  }
  const changed = body.v !== room.version;
  return { now, v: room.version, ...(changed ? { room: publicRoom(room, me.id) } : {}), ...(lanes ? { lanes } : {}), ...(upload ? { upload } : {}) };
}

async function takeover(ctx: Ctx, id: string, sTick: number, now: number): Promise<LaneDoc> {
  return ctx.store.transaction(async (tx) => {
    const lane = (await tx.get<LaneDoc>(C.battleLanes, id)) ?? emptyLane(now);
    if (lane.takeoverAt !== null || sTick - lane.lastTick <= TAKEOVER_AFTER_TICKS) return lane;
    lane.takeoverAt = lane.lastTick + 1;
    tx.set(C.battleLanes, id, lane as unknown as Record<string, unknown>);
    laneCache(ctx.store).set(id, lane);
    return lane;
  });
}

/** Server replay of a finished round; schedules the next round or ends the match. Returns the updated room. */
export async function finalizeRound(ctx: Ctx, room: BattleRoom, n: number): Promise<BattleRoom | null> {
  const now = ctx.now ?? Date.now();
  const locked = await ctx.store.transaction(async (tx) => {
    const r = await tx.get<BattleRoom>(C.battleRooms, room.code);
    if (!r || r.status !== "playing" || r.round !== n) return null;
    const rec = r.rounds.find((x) => x.n === n);
    if (!rec || rec.outcome) return null;
    if (r.finalizing && now - r.finalizing < 20000) return null;
    r.finalizing = now;
    tx.set(C.battleRooms, r.code, r as unknown as Record<string, unknown>);
    return r;
  });
  roomCache(ctx.store).delete(room.code);
  if (!locked) return ctx.store.get<BattleRoom>(C.battleRooms, room.code);
  const rec = locked.rounds.find((x) => x.n === n)!;
  const spec = specOf(rec), total = rec.seconds * TPS;
  const humans = rec.roster.filter((p) => !p.bot);
  const laneIds = humans.map((p) => laneId(locked, n, p.id));
  const docs = await ctx.store.getMany<LaneDoc>(C.battleLanes, laneIds);
  const lanes: Record<string, Lane> = {};
  const plays: AttackPlay[] = [];
  for (let k = 0; k < humans.length; k++) {
    const d = docs[k], p = humans[k];
    if (spec.defenders.some((x) => x.id === p.id)) {
      // Anyone who stopped uploading before the end is finished by the AI.
      const takeoverAt = d?.takeoverAt ?? ((d?.lastTick ?? -1) < total - 31 ? (d?.lastTick ?? -1) + 1 : null);
      const sl = d ? await laneSlice(ctx, laneIds[k], d, 0, 0) : { i: [], s: [] };
      lanes[p.id] = { inputs: sl.i, spends: sl.s, takeoverAt };
    }
    if (d?.plays?.length) plays.push(...d.plays);
  }
  const outcome = simulateRound(spec, lanes, plays);

  return ctx.store.transaction(async (tx) => {
    const r = await tx.get<BattleRoom>(C.battleRooms, room.code);
    if (!r || r.round !== n) return r;
    const cur = r.rounds.find((x) => x.n === n);
    if (!cur || cur.outcome) return r;
    cur.outcome = outcome; cur.finishedAt = now;
    r.finalizing = null;
    const next = decideNext(r);
    if (next === "next") {
      r.round = n + 1; r.roundStartAt = now + BETWEEN_ROUNDS_MS;
      r.rounds.push(newRound(ctx.secret, r, n + 1));
    } else {
      r.status = "done"; r.winner = next; r.roundStartAt = null;
    }
    r.version++;
    r.expiresAt = new Date(now + ROOM_TTL_MS);
    tx.set(C.battleRooms, r.code, r as unknown as Record<string, unknown>);
    return r;
  }).then((r) => { if (r) roomCache(ctx.store).set(room.code, r); return r; });
}

/** After a round: play round 2, a tie-break, or declare the winner. */
export function decideNext(r: BattleRoom): "next" | TeamId | "draw" {
  const r1 = r.rounds.find((x) => x.n === 1)?.outcome, r2 = r.rounds.find((x) => x.n === 2)?.outcome, r3 = r.rounds.find((x) => x.n === 3)?.outcome;
  if (!r2) return "next";
  if (!r3) {
    const a = r1!.teamScore.A, b = r2.teamScore.B;
    return a === b ? "next" : a > b ? "A" : "B";
  }
  if (r3.teamScore.A !== r3.teamScore.B) return r3.teamScore.A > r3.teamScore.B ? "A" : "B";
  // Still level: fewer knock-downs per defender wins; otherwise a draw.
  const ko = (t: TeamId) => {
    const ids = r.rounds.find((x) => x.n === 3)!.roster.filter((p) => p.team === t).map((p) => p.id);
    return ids.reduce((s, id) => s + (r3.defenders[id]?.hits ?? 0), 0) / Math.max(1, ids.length);
  };
  const ka = ko("A"), kb = ko("B");
  return ka === kb ? "draw" : ka < kb ? "A" : "B";
}

/** Attacker play: stamped with the server tick, validated with the same rules every client uses. */
export async function attack(ctx: Ctx, rawCode: unknown, token: unknown, body: { a?: unknown; t?: unknown; x?: unknown; y?: unknown }) {
  const code = normalizeCode(rawCode);
  if (!code) return err("Room not found.", 404);
  const who = await auth(ctx, code, token);
  if (isErr(who)) return who;
  const { room, me } = who;
  const now = ctx.now ?? Date.now();
  const rec = currentRound(room);
  if (room.status !== "playing" || !rec || rec.outcome || room.roundStartAt === null) return err("No round in progress.", 409);
  const spec = specOf(rec);
  if (!spec.attackers.some((a) => a.id === me.id)) return err("You're defending this round.", 409);
  const sTick = serverTick(room, now);
  if (sTick < 0 || sTick >= rec.seconds * TPS - ATTACK_LEAD) return err("Too late in the round to attack.", 409);
  const a = typeof body.a === "number" && Number.isInteger(body.a) && ATTACK_ABILITIES[body.a] ? body.a : -1;
  if (a < 0) return err("Unknown ability.");
  const target = body.t === "*" ? "*" : typeof body.t === "string" ? body.t.slice(0, 20) : "";
  const play: AttackPlay = { by: me.id, a, t: target, at: sTick };
  if (ATTACK_ABILITIES[a].aimed) {
    const x = Number(body.x), y = Number(body.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return err("Tap where to strike.");
    play.x = Math.round(Math.max(-300, Math.min(300, x))); play.y = Math.round(Math.max(-300, Math.min(300, y)));
  }
  return ctx.store.transaction(async (tx) => {
    const id = laneId(room, rec.n, me.id);
    const lane = (await tx.get<LaneDoc>(C.battleLanes, id)) ?? emptyLane(now);
    const before = lane.plays.length;
    const { accepted } = acceptAttacks(spec, me.id, [...lane.plays, play]);
    if (accepted.length <= before || accepted[accepted.length - 1] !== play) return err("Not ready: check energy, level or cooldown.", 409);
    lane.plays.push(play);
    tx.set(C.battleLanes, id, lane as unknown as Record<string, unknown>);
    laneCache(ctx.store).set(id, lane);
    return { ok: true, play, landsAt: play.at + ATTACK_LEAD };
  });
}

/** Report a player (name or behaviour). Stored for moderation; reviewed within 24 h (see Terms). */
export async function reportPlayer(ctx: Ctx, rawCode: unknown, token: unknown, body: { playerId?: unknown; reason?: unknown }) {
  const code = normalizeCode(rawCode);
  if (!code) return err("Room not found.", 404);
  const who = await auth(ctx, code, token);
  if (isErr(who)) return who;
  const target = who.room.players.find((p) => p.id === body.playerId);
  if (!target || target.bot || target.id === who.me.id) return err("You can't report that player.");
  const reason = ["name", "behaviour", "cheating", "other"].includes(String(body.reason)) ? String(body.reason) : "other";
  await ctx.store.add(C.feedback, { kind: "report", room: code, targetId: target.id, targetName: target.name, reporterId: who.me.id, reason, createdAt: ctx.now ?? Date.now(), status: "open" });
  return { ok: true };
}

export async function battleFeedback(ctx: Ctx, rawCode: unknown, token: unknown, body: { rating?: unknown; note?: unknown }) {
  const code = normalizeCode(rawCode);
  if (!code) return err("Room not found.", 404);
  const who = await auth(ctx, code, token);
  if (isErr(who)) return who;
  const rating = Number(body.rating);
  if (![1, 2, 3].includes(rating)) return err("Pick a rating.");
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  await ctx.store.add(C.feedback, { kind: "battle", room: code, rating, note, createdAt: ctx.now ?? Date.now() });
  return { ok: true };
}

/** Public preview for invite pages (no auth): never exposes tokens. */
export async function roomPreview(ctx: Ctx, rawCode: unknown) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const room = await ctx.store.get<BattleRoom>(C.battleRooms, code);
  if (!room) return null;
  const host = room.players.find((p) => p.id === room.hostId);
  return { code, status: room.status, host: host?.name ?? null, players: room.players.length, seconds: room.seconds, teams: { A: teamSize(room, "A"), B: teamSize(room, "B") } };
}
