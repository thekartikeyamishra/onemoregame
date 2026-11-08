"use client";

import { TPS } from "@/game/engine";
import { ATTACK_ABILITIES, ATTACK_LEAD } from "@/game/battle/config";
import { DefenderRun, acceptAttacks, allAttackPlays, effectsFor, specOf, type AttackPlay, type Effect, type Lane, type RoundSpec } from "@/game/battle/sim";
import type { LaneDelta, PublicRound } from "@/lib/battle-types";

interface ClientLane extends Lane { plays: AttackPlay[]; lastTick: number }
export interface FeedItem { id: string; text: string; tone: "attack" | "ko" | "good" | "info"; at: number }

/** Remote players are shown slightly in the past so their movement plays back smoothly between syncs. */
const DELAY_START = 100, DELAY_MIN = 70, DELAY_MAX = 330;

/**
 * The client's copy of a round: every defender re-simulated locally from the uploaded inputs (no positions are
 * streamed). The local defender's own run is driven live by the keyboard/touch and uploaded in small chunks.
 */
export class BattleWorld {
  readonly spec: RoundSpec;
  readonly total: number;
  readonly lanes: Record<string, ClientLane> = {};
  readonly runs = new Map<string, DefenderRun>();
  plays: AttackPlay[] = [];
  /** Local player's role this round. */
  readonly role: "defender" | "attacker" | "spectator";
  private aegisSent = new Map<string, number>();
  private uploaded = { i: 0, s: 0, to: -1 };
  lost = false;
  /** Display names by player id (set by the room view). */
  names: Record<string, string> = {};
  /** Latest events for the on-screen feed (newest last). */
  feed: FeedItem[] = [];
  private delay = new Map<string, number>();
  private lowWater = new Map<string, number>();
  private seen = new Map<string, { hits: number; level: number; combo: number }>();
  private announced = new Set<string>();

  constructor(readonly round: PublicRound, readonly me: string) {
    this.spec = specOf(round);
    this.total = round.seconds * TPS;
    for (const p of round.roster) this.lanes[p.id] = { inputs: [], spends: [], plays: [], takeoverAt: null, lastTick: -1 };
    this.role = this.spec.defenders.some((d) => d.id === me) ? "defender" : this.spec.attackers.some((a) => a.id === me) ? "attacker" : "spectator";
    this.plays = allAttackPlays(this.spec, []);
    for (const d of this.spec.defenders) this.runs.set(d.id, this.makeRun(d.id));
  }

  get myRun() { return this.runs.get(this.me) ?? null; }
  /** The local player drives their own run (unless the AI has taken over). */
  get iDrive() { return this.role === "defender" && !this.lost; }

  private makeRun(id: string): DefenderRun {
    const d = this.spec.defenders.find((x) => x.id === id)!;
    const extra: Effect[] = [];
    for (const r of this.runs.values()) if (r.spec.id !== id && r.spec.team === d.team) extra.push(...r.outgoing);
    return new DefenderRun(this.spec, d, this.lanes[id], [...effectsFor(id, this.plays), ...extra]);
  }

  /** Re-simulate one defender from scratch up to its current tick (used when an effect arrived late). */
  private rebuild(id: string) {
    const old = this.runs.get(id)!;
    const target = old.tick;
    const run = this.makeRun(id);
    let guard = 0;
    while (run.tick < target && !run.state.over && guard++ < this.total + 10) { run.step(); }
    run.fx.length = 0;
    this.runs.set(id, run);
  }

  /** Apply a sync response. Returns true if anything changed. */
  applyLanes(deltas: Record<string, LaneDelta> | undefined): boolean {
    if (!deltas) return false;
    let playsChanged = false;
    for (const [id, d] of Object.entries(deltas)) {
      const lane = this.lanes[id];
      if (!lane) continue;
      if (id === this.me && this.iDrive) {
        // Self-heal: the server already holds uploads whose response we never received.
        if (d.o[0] === this.uploaded.i && d.o[1] === this.uploaded.s && (d.i.length || d.s.length || d.lt > this.uploaded.to)) {
          this.uploaded = { i: this.uploaded.i + d.i.length, s: this.uploaded.s + d.s.length, to: Math.max(this.uploaded.to, d.lt) };
        }
      } else {
        // Append only when the delta starts exactly where we are (otherwise wait for the next sync).
        if (d.o[0] === lane.inputs.length) lane.inputs.push(...d.i);
        if (d.o[1] === lane.spends.length) lane.spends.push(...d.s);
        lane.lastTick = Math.max(lane.lastTick, d.lt);
      }
      if (d.o[2] === lane.plays.length && d.p.length) { lane.plays.push(...d.p); playsChanged = true; }
      if (d.to !== null && lane.takeoverAt === null) {
        lane.takeoverAt = d.to;
        if (id === this.me && this.role === "defender") this.lostConnection(d.to);
        else if (this.runs.has(id) && this.runs.get(id)!.tick > d.to) this.rebuild(id);
      }
    }
    if (playsChanged) {
      const human = Object.values(this.lanes).flatMap((l) => l.plays);
      this.plays = allAttackPlays(this.spec, human);
      for (const [id, run] of this.runs) if (!run.addEffects(effectsFor(id, this.plays))) this.rebuild(id);
    }
    return true;
  }

  /** Our uploads were refused as too late: the server's AI now plays our seat from `at`. */
  lostConnection(at: number) {
    this.lost = true;
    this.lanes[this.me].takeoverAt = at;
    if (this.runs.has(this.me)) this.rebuild(this.me);
  }

  cursors(): Record<string, [number, number, number]> {
    const c: Record<string, [number, number, number]> = {};
    for (const [id, l] of Object.entries(this.lanes)) c[id] = id === this.me && this.iDrive ? this.myCursor() : [l.inputs.length, l.spends.length, l.plays.length];
    return c;
  }

  /** Advance every simulated defender toward `nowTick` (others only as far as their inputs are known). */
  advance(nowTick: number, maxSteps = 900) {
    const target = Math.min(nowTick, this.total);
    for (const [id, run] of this.runs) {
      if (id === this.me && this.iDrive) continue; // driven by stepLocal()
      const lane = this.lanes[id];
      const human = run.spec.bot === null && lane.takeoverAt === null;
      let limit = target, cap = maxSteps;
      if (human) {
        // Jitter buffer: play other humans `delay` ticks behind live. If their inputs run out, grow the delay
        // (no freezing and jumping); while plenty is buffered, shrink it slowly back toward real time.
        const known = lane.lastTick + 1;
        let d = this.delay.get(id) ?? DELAY_START;
        const buf = known - (target - d); // ticks of their inputs buffered ahead of the playhead
        // Low-water mark of the buffer, recovering slowly: shrink the delay only after a long stretch of surplus.
        let low = Math.min(buf, (this.lowWater.get(id) ?? buf) + 0.02);
        if (buf < 0) { d = Math.min(DELAY_MAX, d - buf + 24); low = 24; } // ran dry: re-buffer with a margin
        else if (low > 45) d = Math.max(DELAY_MIN, d - 0.25);
        this.lowWater.set(id, low);
        this.delay.set(id, d);
        limit = Math.min(known, Math.round(target - d), this.total);
        // Catch up gently (max 3 ticks per frame) unless far behind (tab was hidden): then jump.
        cap = limit - run.tick > 90 ? maxSteps : 3;
      }
      let n = 0;
      while (run.tick < limit && !run.state.over && n++ < cap) run.step();
    }
    this.shareAegis();
    this.scanFeed(nowTick);
  }

  /** Steps the local defender to `nowTick`, recording input changes (and ability presses) into our lane. */
  stepLocal(nowTick: number, input: { dir: number; dash: boolean }, ability: number | null): { usedAbility: boolean; stepped: number } {
    const run = this.myRun;
    if (!run || !this.iDrive) return { usedAbility: false, stepped: 0 };
    const lane = this.lanes[this.me];
    const target = Math.min(nowTick, this.total);
    let used = false, n = 0, lastDir = lane.inputs.length ? lane.inputs[lane.inputs.length - 2] : -2;
    while (run.tick < target && !run.state.over && n++ < 900) {
      const t = run.tick;
      // While catching up after a stall, only the latest tick gets the live input.
      const live = t === target - 1;
      const dir = live ? input.dir : lastDir === -2 ? -1 : lastDir;
      const dash = live && input.dash;
      if (dir !== lastDir || dash) { lane.inputs.push(t, dir, dash ? 1 : 0); lastDir = dir; }
      if (live && ability !== null && !used && run.canUse(ability)) { lane.spends.push(t, ability); used = true; }
      run.step();
    }
    lane.lastTick = run.tick - 1;
    this.shareAegis();
    if (n) this.scanFeed(nowTick);
    return { usedAbility: used, stepped: n };
  }

  /** Teammates' Aegis casts become effects on the other defenders' runs (rebuilding any that are already past it). */
  private shareAegis() {
    for (const [id, run] of this.runs) {
      const sent = this.aegisSent.get(id) ?? 0;
      if (run.outgoing.length <= sent) continue;
      const fresh = run.outgoing.slice(sent);
      this.aegisSent.set(id, run.outgoing.length);
      for (const [oid, other] of this.runs) {
        if (oid === id || other.spec.team !== run.spec.team) continue;
        if (!other.addEffects(fresh)) this.rebuild(oid);
      }
    }
  }

  /** Next upload chunk for the local defender (null if nothing new). */
  chunk(serverTick: number): { to: number; i: number[]; s: number[] } | null {
    if (!this.iDrive) return null;
    const lane = this.lanes[this.me];
    const to = Math.min(lane.lastTick, serverTick + 25, this.total - 1);
    if (to <= this.uploaded.to) return null;
    const i: number[] = [], s: number[] = [];
    let ii = this.uploaded.i, si = this.uploaded.s;
    while (ii < lane.inputs.length && lane.inputs[ii] <= to) { i.push(lane.inputs[ii], lane.inputs[ii + 1], lane.inputs[ii + 2]); ii += 3; }
    while (si < lane.spends.length && lane.spends[si] <= to) { s.push(lane.spends[si], lane.spends[si + 1]); si += 2; }
    return { to, i, s };
  }
  confirmUpload(c: { to: number; i: number[]; s: number[] }) {
    this.uploaded = { i: this.uploaded.i + c.i.length, s: this.uploaded.s + c.s.length, to: c.to };
  }
  /** Server cursor for our own lane = what it has accepted. */
  myCursor(): [number, number, number] {
    return [this.uploaded.i, this.uploaded.s, this.lanes[this.me]?.plays.length ?? 0];
  }

  attackerEconomy(nowTick: number) {
    return acceptAttacks(this.spec, this.me, this.lanes[this.me]?.plays ?? [], Math.max(0, nowTick)).economy;
  }
  addMyPlay(p: AttackPlay) {
    const lane = this.lanes[this.me];
    if (lane.plays.some((x) => x.at === p.at && x.a === p.a)) return;
    lane.plays.push(p);
    this.plays = allAttackPlays(this.spec, Object.values(this.lanes).flatMap((l) => l.plays));
    for (const [id, run] of this.runs) if (!run.addEffects(effectsFor(id, this.plays))) this.rebuild(id);
  }

  private name(id: string) { return id === "arena" ? "The arena" : id === this.me ? "You" : (this.names[id] ?? "Someone"); }
  private push(key: string, text: string, tone: FeedItem["tone"], at: number) {
    if (this.announced.has(key)) return;
    this.announced.add(key);
    this.feed.push({ id: key, text, tone, at });
    if (this.feed.length > 6) this.feed.splice(0, this.feed.length - 6);
  }

  /** Turns what just happened (launches, KOs, combos, level-ups) into short feed lines. */
  private scanFeed(nowTick: number) {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    for (const p of this.plays) {
      if (p.at > nowTick || p.at < nowTick - ATTACK_LEAD) continue;
      const a = ATTACK_ABILITIES[p.a];
      if (!a) continue;
      const target = p.t === "*" ? "the whole team" : p.t === this.me ? "YOU" : this.name(p.t);
      this.push(`p:${p.by}:${p.at}:${p.a}`, `${a.icon} ${this.name(p.by)} → ${a.name} on ${target}`, "attack", now);
    }
    for (const [id, run] of this.runs) {
      const st = run.state, prev = this.seen.get(id) ?? { hits: 0, level: 1, combo: 0 };
      if (st.hits > prev.hits) this.push(`k:${id}:${st.hits}`, `💥 ${this.name(id)} got knocked out`, "ko", now);
      if (run.level > prev.level) this.push(`l:${id}:${run.level}`, `⬆ ${this.name(id)} reached level ${run.level}`, "good", now);
      if (st.combo >= 9 && prev.combo < 9) this.push(`c:${id}:${run.tick}`, `🔥 ${this.name(id)} hit MAX combo ×9`, "good", now);
      this.seen.set(id, { hits: st.hits, level: run.level, combo: st.combo });
    }
  }

  /** Feed lines from the last few seconds. */
  recentFeed(maxAgeMs = 4500): FeedItem[] {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    return this.feed.filter((f) => now - f.at < maxAgeMs).slice(-4);
  }

  /** Upcoming attacks on a defender (for warnings). */
  incoming(id: string, nowTick: number) {
    return effectsFor(id, this.plays).filter((e) => e.tick >= nowTick && e.tick - nowTick <= 200);
  }

  teamScore(): { A: number; B: number } {
    const sums = { A: { s: 0, n: 0 }, B: { s: 0, n: 0 } };
    for (const r of this.runs.values()) { sums[r.spec.team].s += r.state.score; sums[r.spec.team].n++; }
    return { A: sums.A.n ? Math.round(sums.A.s / sums.A.n) : 0, B: sums.B.n ? Math.round(sums.B.s / sums.B.n) : 0 };
  }
}
