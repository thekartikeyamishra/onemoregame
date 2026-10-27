/**
 * Battle simulation — deterministic, shared by browser and server (same rules as engine.ts: integer PRNG,
 * no trig, fixed ticks). Every defender's run is a pure function of: the round seed, their uploaded inputs and
 * ability presses, the accepted attacks against them, and teammates' Aegis casts. The server replays every round
 * in lock-step to produce the official result, so a modified client can't fake a score or an attack.
 */
import { DIRS, POWER_DURATION, TPS, createGame, dirIndex, injectHazard, injectShard, step, type GameState, type TickInput } from "../engine";
import {
  ABILITY_COOLDOWN, ATTACK_ABILITIES, ATTACK_COOLDOWN, ATTACK_ENERGY, ATTACK_GAP, ATTACK_LEAD, BOT_PROFILES, CREDIT_WINDOW,
  DEFENDER_ABILITIES, DEFENDER_ENERGY, DEFENDER_INDEX, DEFENDER_LEVELS, SECOND_WIND_GAP, attackCost, battleRules,
  type AttackAbility, type BotLevel, type TeamId,
} from "./config";

// ---------------------------------------------------------------------------------------------------------------- types
/** One attacker play as stored: issued at server tick `at`, lands at `at + ATTACK_LEAD`. `t` = defender id or "*" (team). */
export interface AttackPlay { by: string; a: number; t: string; at: number; x?: number; y?: number }
/** A defender's uploaded lane: input triples [tick, dir, dash] and ability presses [tick, abilityIndex]. */
export interface Lane { inputs: number[]; spends: number[]; takeoverAt: number | null }
export interface DefenderSpec { id: string; team: TeamId; bot: BotLevel | null }
export interface AttackerSpec { id: string; bot: BotLevel | null }
export interface RoundSpec { seed: number; seconds: number; defenders: DefenderSpec[]; attackers: AttackerSpec[]; tiebreak: boolean }
export interface Effect { tick: number; kind: AttackAbility | "aegis"; by: string; seq: number; x?: number; y?: number }

export interface DefenderStats { score: number; hits: number; maxCombo: number; pickups: number; abilities: number; shieldBlocks: number; nearMisses: number; eliminatedAt: number | null; hitsBy: Record<string, number> }
export interface RoundOutcome {
  defenders: Record<string, DefenderStats>;
  attackers: Record<string, { plays: number; hitsCaused: number }>;
  teamScore: Record<TeamId, number>; // average defending score per defender (rounded)
}

/** The part of a stored round that defines who plays what (shared by server and client). */
export interface RoundRecordLike { n: number; seconds: number; seed: number; defenders: TeamId[]; attackers: TeamId | null; roster: Array<{ id: string; team: TeamId; bot: BotLevel | null }> }

/** Who defends and who attacks. Round 3 (tie-break): everyone defends against the arena. */
export function specOf(rec: RoundRecordLike): RoundSpec {
  const defenders = rec.roster.filter((p) => rec.defenders.includes(p.team)).map((p) => ({ id: p.id, team: p.team, bot: p.bot }));
  const attackers = rec.attackers ? rec.roster.filter((p) => p.team === rec.attackers).map((p) => ({ id: p.id, bot: p.bot })) : [];
  return { seed: rec.seed, seconds: rec.seconds, defenders, attackers, tiebreak: rec.n === 3 };
}

// ------------------------------------------------------------------------------------------------------------- helpers
/** Integer hash → [0, 2^32). Deterministic across engines. */
export function hash32(...parts: number[]): number {
  let h = 0x811c9dc5 | 0;
  for (const p of parts) { h = Math.imul(h ^ (p | 0), 0x01000193); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
  return h >>> 0;
}
export function strHash(s: string): number {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
const sq = (v: number) => v * v;
const ticksOf = (spec: RoundSpec) => spec.seconds * TPS;
const effectOrder = (a: Effect, b: Effect) => a.tick - b.tick || (a.by < b.by ? -1 : a.by > b.by ? 1 : 0) || a.seq - b.seq;

export function defenderLevel(score: number): 1 | 2 | 3 {
  return score >= DEFENDER_LEVELS[2] ? 3 : score >= DEFENDER_LEVELS[1] ? 2 : 1;
}

// ------------------------------------------------------------------------------------------------- attacker economy
/** Energy regen interval for each attacker: total attack pressure per defender stays the same in 1v5 and 5v1. */
export function attackRegenTicks(attackers: number, defenders: number): number {
  const v = Math.round((ATTACK_ENERGY.baseRegenTicks * Math.max(1, attackers)) / Math.max(1, defenders));
  return Math.max(30, Math.min(450, v));
}
export function attackerLevel(tick: number, plays: number, roundTicks: number): 1 | 2 | 3 {
  const l2 = tick >= roundTicks * 0.25 || plays >= 5;
  const l3 = tick >= roundTicks * 0.6 || plays >= 12;
  return l3 ? 3 : l2 ? 2 : 1;
}

export interface AttackerEconomy { energy: number; level: 1 | 2 | 3; ready: Record<string, number> }

/**
 * Accepts or rejects one attacker's plays in order (energy, level, cooldowns, targets). Used by the server before
 * storing a play, by the client for its HUD, and by the replay. Returns the accepted plays and the final economy.
 */
export function acceptAttacks(spec: RoundSpec, attackerId: string, plays: AttackPlay[], upTo = Infinity): { accepted: AttackPlay[]; economy: AttackerEconomy } {
  const R = attackRegenTicks(spec.attackers.length, spec.defenders.length), total = ticksOf(spec);
  const defenderIds = new Set(spec.defenders.map((d) => d.id));
  let energy: number = ATTACK_ENERGY.start, acc = 0, last = -Infinity;
  const lastUse: Record<number, number> = {};
  const accepted: AttackPlay[] = [];
  const regen = (t: number) => {
    const g = Math.floor((t - acc) / R);
    if (g > 0) { energy = Math.min(ATTACK_ENERGY.max, energy + g); acc += g * R; }
    if (energy >= ATTACK_ENERGY.max) acc = t;
  };
  for (const p of plays) {
    if (p.by !== attackerId || p.at > upTo) continue;
    const def = ATTACK_ABILITIES[p.a];
    if (!def || !Number.isInteger(p.at) || p.at < 0 || p.at >= total - ATTACK_LEAD) continue;
    if (p.at < last) continue; // must be in order
    regen(p.at);
    const team = p.t === "*";
    const level = attackerLevel(p.at, accepted.length, total);
    if ((!team && !defenderIds.has(p.t)) || (team && !def.teamable) || (team && level < 2) || level < def.level) continue;
    if (def.aimed && (typeof p.x !== "number" || typeof p.y !== "number" || p.x * p.x + p.y * p.y > 300 * 300)) continue;
    if (p.at - last < ATTACK_GAP || p.at - (lastUse[p.a] ?? -Infinity) < ATTACK_COOLDOWN) continue;
    const cost = attackCost(def, team);
    if (energy < cost) continue;
    energy -= cost; last = p.at; lastUse[p.a] = p.at;
    accepted.push(p);
  }
  if (Number.isFinite(upTo)) regen(upTo);
  const now = Number.isFinite(upTo) ? upTo : total;
  const ready: Record<string, number> = {};
  for (const a of ATTACK_ABILITIES) ready[a.id] = Math.max(0, (lastUse[ATTACK_ABILITIES.indexOf(a)] ?? -Infinity) + ATTACK_COOLDOWN - now, last + ATTACK_GAP - now);
  return { accepted, economy: { energy, level: attackerLevel(now, accepted.length, total), ready } };
}

/** Plays made by AI attackers: a pure schedule (seeded), so every client and the server agree with no network. */
export function botAttackPlays(spec: RoundSpec): AttackPlay[] {
  const out: AttackPlay[] = [];
  const total = ticksOf(spec);
  const defenders = spec.defenders.map((d) => d.id);
  if (!defenders.length) return out;
  spec.attackers.forEach((a, k) => {
    if (!a.bot) return;
    const prof = BOT_PROFILES[a.bot];
    const candidates: AttackPlay[] = [];
    let t = 4 * TPS + (hash32(spec.seed, k, 1) % prof.attackEvery);
    let i = 0;
    while (t < total - ATTACK_LEAD) {
      const h = hash32(spec.seed, k, t, 7);
      const team = (h % 100) / 100 < prof.teamChance;
      // Prefer stronger abilities; acceptAttacks drops anything not yet affordable or unlocked.
      const order: AttackAbility[] = a.bot === "easy" ? ["strike", "swarm", "erosion"] : a.bot === "medium" ? ["swarm", "mirror", "erosion", "surge", "strike"] : ["eclipse", "jam", "surge", "mirror", "swarm"];
      const ability = order[(h >>> 8) % order.length];
      const idx = ATTACK_ABILITIES.findIndex((x) => x.id === ability);
      const target = team && ATTACK_ABILITIES[idx].teamable ? "*" : defenders[(h >>> 16) % defenders.length];
      const p: AttackPlay = { by: a.id, a: idx, t: target, at: t };
      if (ATTACK_ABILITIES[idx].aimed) {
        const d = DIRS[(h >>> 4) % 64], r = (1 - prof.aimSkill) * 200 + 20;
        p.x = Math.round(d[0] * r); p.y = Math.round(d[1] * r);
        if (target === "*") p.t = defenders[(h >>> 16) % defenders.length];
      }
      candidates.push(p);
      i++;
      t += prof.attackEvery + (hash32(spec.seed, k, i, 3) % (2 * TPS));
    }
    out.push(...acceptAttacks(spec, a.id, candidates).accepted);
  });
  return out;
}

/** Tie-break round: the arena itself attacks everyone every 15 s. */
export function environmentPlays(spec: RoundSpec): AttackPlay[] {
  if (!spec.tiebreak) return [];
  const out: AttackPlay[] = [];
  const order: AttackAbility[] = ["swarm", "surge", "erosion", "mirror", "swarm"];
  for (let t = 12 * TPS, i = 0; t < ticksOf(spec) - ATTACK_LEAD; t += 15 * TPS, i++) {
    out.push({ by: "arena", a: ATTACK_ABILITIES.findIndex((x) => x.id === order[i % order.length]), t: "*", at: t });
  }
  return out;
}

/** Effects that land on one defender from a list of accepted plays. */
export function effectsFor(defenderId: string, plays: AttackPlay[]): Effect[] {
  const out: Effect[] = [];
  const nth: Record<string, number> = {};
  for (const p of plays) {
    // seq = position in that attacker's own list: stable as new plays arrive (lists only grow at the end).
    const seq = (nth[p.by] = (nth[p.by] ?? -1) + 1);
    if (p.t !== defenderId && p.t !== "*") continue;
    out.push({ tick: p.at + ATTACK_LEAD, kind: ATTACK_ABILITIES[p.a].id, by: p.by, seq, ...(p.x !== undefined ? { x: p.x, y: p.y } : {}) });
  }
  return out.sort(effectOrder);
}

// ------------------------------------------------------------------------------------------------------ defender run
export interface ActiveMods { mirror: number; erosion: number; surge: number; jam: number; blackout: number }

export class DefenderRun {
  readonly state: GameState;
  readonly spec: DefenderSpec;
  energy: number = DEFENDER_ENERGY.start;
  readonly until: ActiveMods = { mirror: 0, erosion: 0, surge: 0, jam: 0, blackout: 0 };
  readonly lastUse: number[] = DEFENDER_ABILITIES.map(() => -Infinity);
  readonly stats: DefenderStats = { score: 0, hits: 0, maxCombo: 0, pickups: 0, abilities: 0, shieldBlocks: 0, nearMisses: 0, eliminatedAt: null, hitsBy: {} };
  /** Effects landing on this defender (kept sorted). */
  readonly queue: Effect[] = [];
  /** Aegis casts produced by this defender, for teammates (tick already includes the lead). */
  readonly outgoing: Effect[] = [];
  /** Recent visual events for the renderer (cleared by the renderer). */
  fx: Array<{ kind: string; tick: number; x?: number; y?: number; by?: string }> = [];
  private qi = 0;
  private li = 0;
  private si = 0;
  private dir = -1;
  private botDir = -1;
  private lastSecondWind = -Infinity;
  /** Knocked down: respawning at the centre until this tick (inputs ignored). */
  downUntil = 0;
  private credit: { by: string; until: number } | null = null;
  private readonly baseShardR: number;

  constructor(readonly round: RoundSpec, spec: DefenderSpec, readonly lane: Lane, effects: Effect[] = []) {
    this.spec = spec;
    this.state = createGame(round.seed, "classic", battleRules(round.seconds));
    this.baseShardR = this.state.rules.shardR;
    this.state.mods = { hazardScale: 1, jam: false };
    this.addEffects(effects);
  }

  get tick() { return this.state.tick; }
  get level() { return defenderLevel(this.state.score); }
  /** True while this run is controlled by the AI (a bot, or a human after a takeover). */
  get aiControlled() { return this.spec.bot !== null || (this.lane.takeoverAt !== null && this.state.tick >= this.lane.takeoverAt); }

  /** Adds effects; returns false if any of them should already have happened (the caller must rebuild the run). */
  addEffects(list: Effect[]): boolean {
    let onTime = true;
    for (const e of list) {
      if (this.queue.some((q) => q.tick === e.tick && q.by === e.by && q.seq === e.seq && q.kind === e.kind)) continue;
      if (e.tick < this.state.tick) onTime = false;
      this.queue.push(e);
    }
    this.queue.sort(effectOrder);
    // Keep the read pointer after everything already applied.
    this.qi = this.queue.findIndex((q) => q.tick >= this.state.tick);
    if (this.qi < 0) this.qi = this.queue.length;
    return onTime;
  }

  canUse(i: number): boolean {
    const a = DEFENDER_ABILITIES[i], t = this.state.tick;
    if (!a || this.state.over || this.until.jam > t) return false;
    if (this.energy < a.cost || t - this.lastUse[i] < ABILITY_COOLDOWN || this.level < a.level) return false;
    if (a.minTick !== undefined && t < a.minTick) return false;
    return true;
  }

  private applyEffect(e: Effect) {
    const s = this.state, t = s.tick, def = e.kind === "aegis" ? null : ATTACK_ABILITIES.find((x) => x.id === e.kind)!;
    if (e.kind === "aegis") { s.active.shield = Math.max(s.active.shield, POWER_DURATION.shield); this.fx.push({ kind: "aegis", tick: t, by: e.by }); return; }
    switch (e.kind) {
      case "strike": injectHazard(s, e.x ?? 0, e.y ?? 0, 0, 0, 15, def!.duration); break;
      case "swarm":
        for (let k = 0; k < 2; k++) {
          const from = DIRS[hash32(e.tick, strHash(e.by), e.seq, k) % 64];
          const sx = from[0] * 330, sy = from[1] * 330;
          const dx = s.x - sx, dy = s.y - sy, len = Math.sqrt(dx * dx + dy * dy) || 1;
          injectHazard(s, sx, sy, (dx / len) * 2.6, (dy / len) * 2.6, 13);
        }
        break;
      case "mirror": this.until.mirror = Math.max(this.until.mirror, t + def!.duration); break;
      case "erosion": this.until.erosion = Math.max(this.until.erosion, t + def!.duration); break;
      case "surge": this.until.surge = Math.max(this.until.surge, t + def!.duration); break;
      case "jam": this.until.jam = Math.max(this.until.jam, t + def!.duration); break;
      case "eclipse": this.until.blackout = Math.max(this.until.blackout, t + def!.duration); this.until.surge = Math.max(this.until.surge, t + def!.duration); break;
    }
    this.credit = { by: e.by, until: t + (def?.duration ?? 0) + CREDIT_WINDOW };
    this.fx.push({ kind: e.kind, tick: t, x: e.x, y: e.y, by: e.by });
  }

  private useAbility(i: number) {
    if (!this.canUse(i)) { this.fx.push({ kind: "fizzle", tick: this.state.tick }); return; }
    const a = DEFENDER_ABILITIES[i], s = this.state, t = s.tick;
    this.energy -= a.cost; this.lastUse[i] = t; this.stats.abilities++;
    switch (a.id) {
      case "bulwark": s.active.shield = Math.max(s.active.shield, POWER_DURATION.shield); break;
      case "tractor": s.active.magnet = Math.max(s.active.magnet, 6 * TPS); break;
      case "stasis": s.active.slow = Math.max(s.active.slow, 4 * TPS); break;
      case "overdrive": s.active.double = Math.max(s.active.double, 5 * TPS); break;
      case "purge": this.until.mirror = this.until.erosion = this.until.surge = this.until.jam = this.until.blackout = t; s.invuln = Math.max(s.invuln, 30); break;
      case "aegis":
        s.active.shield = Math.max(s.active.shield, POWER_DURATION.shield);
        this.outgoing.push({ tick: t + ATTACK_LEAD, kind: "aegis", by: this.spec.id, seq: t });
        break;
      case "supernova":
        for (const h of s.hazards) if (h.x * h.x + h.y * h.y < 280 * 280) injectShard(s, h.x, h.y);
        s.hazards.length = 0;
        break;
    }
    this.fx.push({ kind: a.id, tick: t });
  }

  /** Deterministic AI pilot (bots, and humans after a takeover). */
  private botInput(level: BotLevel): { input: TickInput; ability: number | null } {
    const s = this.state, p = BOT_PROFILES[level], t = s.tick, id = strHash(this.spec.id);
    let dash = false, ability: number | null = null;
    if (t % p.reaction === hash32(id, 5) % p.reaction || this.botDir < 0) {
      let tx = 0, ty = 0, best = Infinity;
      for (const sh of s.shards) { const d = sq(sh.x - s.x) + sq(sh.y - s.y); if (d < best) { best = d; tx = sh.x; ty = sh.y; } }
      if (s.power && !this.until.jam && sq(s.power.x - s.x) + sq(s.power.y - s.y) < best * 1.5) { tx = s.power.x; ty = s.power.y; }
      let dx = tx - s.x, dy = ty - s.y;
      // Dodge: steer away from the closest threatening hazard (deterministic "attention" roll).
      if (hash32(id, t, 9) % 100 < p.dodge) {
        let hx = 0, hy = 0, hd = 70 * 70;
        for (const h of s.hazards) { const d = sq(h.x - s.x) + sq(h.y - s.y); if (d < hd) { hd = d; hx = h.x; hy = h.y; } }
        if (hd < 70 * 70) { dx = (s.x - hx) * 2 + dx * 0.3; dy = (s.y - hy) * 2 + dy * 0.3; if (p.dashAware && hd < 34 * 34 && s.dashCooldown === 0) dash = true; }
      }
      this.botDir = dirIndex(dx, dy);
      // Hard bots learn to steer through Mirror after a moment.
      if (this.until.mirror > t && level === "hard" && this.until.mirror - t < 150 && this.botDir >= 0) this.botDir = (this.botDir + 32) % 64;
    }
    if (t > 0 && t % p.abilityEvery === hash32(id, 11) % p.abilityEvery) {
      const has = (k: keyof ActiveMods) => this.until[k] > t;
      const pick = (id2: keyof typeof DEFENDER_INDEX) => (this.canUse(DEFENDER_INDEX[id2]) ? DEFENDER_INDEX[id2] : null);
      ability = (s.hazards.length >= 4 ? pick("supernova") : null)
        ?? (has("mirror") || has("surge") || has("erosion") ? pick("purge") : null)
        ?? pick("overdrive") ?? [pick("bulwark"), pick("tractor"), pick("stasis")][hash32(id, t) % 3] ?? null;
    }
    return { input: { dir: this.botDir, dash }, ability };
  }

  /** Advance one tick. The local player appends this tick's input/ability to the lane before calling step(). */
  step(): void {
    const s = this.state;
    if (s.over) return;
    const t = s.tick;
    while (this.qi < this.queue.length && this.queue[this.qi].tick <= t) {
      const e = this.queue[this.qi++];
      if (e.tick === t) this.applyEffect(e);
    }

    let input: TickInput, ability: number | null = null;
    if (this.aiControlled) {
      const r = this.botInput(this.spec.bot ?? "medium");
      input = r.input; ability = r.ability;
    } else {
      let dash = false;
      while (this.li < this.lane.inputs.length && this.lane.inputs[this.li] < t) this.li += 3;
      if (this.li < this.lane.inputs.length && this.lane.inputs[this.li] === t) { this.dir = this.lane.inputs[this.li + 1]; dash = this.lane.inputs[this.li + 2] === 1; this.li += 3; }
      input = { dir: this.dir, dash };
      while (this.si < this.lane.spends.length && this.lane.spends[this.si] < t) this.si += 2;
      if (this.si < this.lane.spends.length && this.lane.spends[this.si] === t) { ability = this.lane.spends[this.si + 1]; this.si += 2; }
    }
    if (ability !== null) this.useAbility(ability);

    // Sabotage modifiers for this tick.
    s.mods = { hazardScale: this.until.surge > t ? 1.6 : 1, jam: this.until.jam > t };
    s.rules.shardR = this.until.erosion > t ? Math.max(4, this.baseShardR / 2) : this.baseShardR;
    if (this.until.mirror > t && input.dir >= 0) input = { dir: (input.dir + 32) % 64, dash: input.dash };
    if (this.downUntil > t) input = { dir: -1, dash: false };

    const comboBefore = s.combo, timerBefore = s.comboTimer;
    const events = step(s, input);
    for (const ev of events) {
      if (ev.type === "hit") {
        // Battle knock-down: the clock isn't shortened; you respawn at the centre (1 s, briefly invulnerable) and lose your combo.
        s.ticksLeft = ticksOf(this.round) - s.tick; // undo the solo-mode time penalty (exactly, even near the end)
        if (s.ticksLeft > 0) s.over = false;
        s.x = 0; s.y = 0; s.vx = 0; s.vy = 0;
        s.invuln = Math.max(s.invuln, 100);
        this.downUntil = t + TPS;
        if (this.credit && t <= this.credit.until) this.stats.hitsBy[this.credit.by] = (this.stats.hitsBy[this.credit.by] ?? 0) + 1;
        if (this.level >= 2 && comboBefore >= 3 && t - this.lastSecondWind >= SECOND_WIND_GAP) {
          s.combo = comboBefore; s.comboTimer = Math.max(timerBefore, 30); this.lastSecondWind = t;
          this.fx.push({ kind: "secondWind", tick: t });
        }
      }
      if (ev.type !== "end") this.fx.push({ kind: ev.type, tick: t, x: "x" in ev ? ev.x : undefined, y: "y" in ev ? ev.y : undefined });
    }
    if ((t + 1) % DEFENDER_ENERGY.regenTicks === 0) this.energy = Math.min(DEFENDER_ENERGY.max, this.energy + 1);
    if (this.fx.length > 80) this.fx.splice(0, this.fx.length - 80);
    const st = this.stats;
    st.score = s.score; st.hits = s.hits; st.maxCombo = s.maxCombo; st.pickups = s.pickups; st.shieldBlocks = s.shieldBlocks; st.nearMisses = s.nearMisses;
    if (s.over && s.tick < ticksOf(this.round)) st.eliminatedAt = s.tick;
  }
}

// ------------------------------------------------------------------------------------------------- official replay
export function allAttackPlays(spec: RoundSpec, humanPlays: AttackPlay[]): AttackPlay[] {
  const humans = spec.attackers.filter((a) => !a.bot).flatMap((a) => acceptAttacks(spec, a.id, humanPlays.filter((p) => p.by === a.id).sort((x, y) => x.at - y.at)).accepted);
  return [...humans, ...botAttackPlays(spec), ...environmentPlays(spec)];
}

/** Lock-step replay of a whole round: the official result. */
export function simulateRound(spec: RoundSpec, lanes: Record<string, Lane>, humanPlays: AttackPlay[]): RoundOutcome {
  const plays = allAttackPlays(spec, humanPlays);
  const empty: Lane = { inputs: [], spends: [], takeoverAt: 0 };
  const runs = spec.defenders.map((d) => new DefenderRun(spec, d, d.bot ? empty : lanes[d.id] ?? empty, effectsFor(d.id, plays)));
  const total = ticksOf(spec);
  const sent = new Map<DefenderRun, number>();
  for (let t = 0; t < total; t++) {
    let alive = false;
    for (const r of runs) { r.step(); r.fx.length = 0; if (!r.state.over) alive = true; }
    for (const r of runs) {
      const from = sent.get(r) ?? 0;
      if (r.outgoing.length > from) {
        const fresh = r.outgoing.slice(from);
        sent.set(r, r.outgoing.length);
        for (const o of runs) if (o !== r && o.spec.team === r.spec.team) o.addEffects(fresh);
      }
    }
    if (!alive) break;
  }
  const defenders: RoundOutcome["defenders"] = {};
  const attackers: RoundOutcome["attackers"] = {};
  for (const a of spec.attackers) attackers[a.id] = { plays: plays.filter((p) => p.by === a.id).length, hitsCaused: 0 };
  const sums: Record<TeamId, { s: number; n: number }> = { A: { s: 0, n: 0 }, B: { s: 0, n: 0 } };
  for (const r of runs) {
    defenders[r.spec.id] = { ...r.stats, hitsBy: { ...r.stats.hitsBy } };
    for (const [by, n] of Object.entries(r.stats.hitsBy)) if (attackers[by]) attackers[by].hitsCaused += n;
    sums[r.spec.team].s += r.stats.score; sums[r.spec.team].n++;
  }
  const teamScore = { A: sums.A.n ? Math.round(sums.A.s / sums.A.n) : 0, B: sums.B.n ? Math.round(sums.B.s / sums.B.n) : 0 };
  return { defenders, attackers, teamScore };
}
