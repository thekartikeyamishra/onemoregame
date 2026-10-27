/**
 * ONE MORE game engine — deterministic, dependency-free, shared by browser and server.
 *
 * Determinism rules (do not break): fixed 60 Hz ticks; only + - * / and Math.sqrt / Math.floor
 * (IEEE-754 exact on every JS engine); no Math.sin/cos/atan2/hypot/pow/exp/random in simulation.
 * Directions come from the literal table below. The server replays recorded inputs with this file
 * to validate every submitted score.
 */

export const ENGINE_VERSION = 3;
export const TPS = 60;
export const RUN_TICKS = 60 * TPS;
/** Longest run any mode may use (Levels can be shorter or longer than 60 s). */
export const MAX_RUN_TICKS = 90 * TPS;
export const ARENA_R = 300;
export const PLAYER_R = 10;
export const SHARD_R = 8;
export const POWER_R = 11;
export const COMBO_WINDOW = 90; // 1.5 s
export const MAX_COMBO = 9;
export const HIT_PENALTY = 180; // 3 s
export const DASH_COOLDOWN = 120;
export const DASH_INVULN = 12;
export const HIT_GRACE = 30;
export const NEAR_MISS_POINTS = 25;
export const MAX_INPUT_EVENTS = 6000;

/** Power-ups: one on the field at a time, first at 8 s, then every 10–15 s; uncollected ones vanish after 6 s. */
export const POWER_TYPES = ["shield", "slow", "magnet", "double"] as const;
export type PowerType = (typeof POWER_TYPES)[number];
export const POWER_DURATION: Record<PowerType, number> = { shield: 600, slow: 240, magnet: 360, double: 300 };
export const POWER_LIFETIME = 360;
export const POWER_FIRST_TICK = 480;
export const MAGNET_RANGE = 110;

/** Daily twists: one rule change per weekday (India time). Quick Play uses "classic". Part of the deterministic simulation. */
export const TWIST_IDS = ["classic", "magnet", "turbo", "wide", "shield", "frenzy", "swarm"] as const;
export type TwistId = (typeof TWIST_IDS)[number];
export interface Twist {
  id: TwistId; name: string; description: string;
  powerOnly?: PowerType; hazardSpeed?: number; shardR?: number; startShield?: boolean; powerGap?: [number, number]; extraHazards?: number;
}
export const TWISTS: Record<TwistId, Twist> = {
  classic: { id: "classic", name: "Classic Sunday", description: "The original rules. No twist." },
  magnet: { id: "magnet", name: "Magnet Monday", description: "Every power-up is a Magnet.", powerOnly: "magnet" },
  turbo: { id: "turbo", name: "Turbo Tuesday", description: "Hazards move 25% faster.", hazardSpeed: 1.25 },
  wide: { id: "wide", name: "Wide Wednesday", description: "Shards are bigger and easier to grab.", shardR: 12 },
  shield: { id: "shield", name: "Shield Thursday", description: "You start with a Shield.", startShield: true },
  frenzy: { id: "frenzy", name: "Frenzy Friday", description: "Power-ups appear twice as often.", powerGap: [300, 180] },
  swarm: { id: "swarm", name: "Swarm Saturday", description: "Two extra hazards on the field.", extraHazards: 2 },
};
/**
 * The complete rule set of one run. Twists and Levels are just different Rules; the simulation reads only these.
 * Defaults reproduce the classic game exactly.
 */
export interface Rules {
  durationTicks: number;
  hazardSpeed: number;
  extraHazards: number;
  /** Multiplier on the per-tick hazard spawn chance. */
  spawnRate: number;
  shardR: number;
  powerOnly: PowerType | null;
  powerGap: readonly [number, number];
  startShield: boolean;
  /** Upper bound on simultaneous hazards (Battle rounds last minutes; classic runs never reach it). */
  hazardCap: number;
}

export const CLASSIC_RULES: Rules = {
  durationTicks: RUN_TICKS, hazardSpeed: 1, extraHazards: 0, spawnRate: 1, shardR: SHARD_R, powerOnly: null, powerGap: [600, 300], startShield: false, hazardCap: 99,
};

export function rulesFor(twist: TwistId = "classic", override: Partial<Rules> = {}): Rules {
  const t = TWISTS[twist];
  return {
    ...CLASSIC_RULES,
    ...(t.hazardSpeed !== undefined ? { hazardSpeed: t.hazardSpeed } : {}),
    ...(t.extraHazards !== undefined ? { extraHazards: t.extraHazards } : {}),
    ...(t.shardR !== undefined ? { shardR: t.shardR } : {}),
    ...(t.powerOnly !== undefined ? { powerOnly: t.powerOnly } : {}),
    ...(t.powerGap !== undefined ? { powerGap: t.powerGap } : {}),
    ...(t.startShield !== undefined ? { startShield: t.startShield } : {}),
    ...override,
  };
}

/** Sunday = 0 … Saturday = 6. */
export const WEEKDAY_TWIST: TwistId[] = ["classic", "magnet", "turbo", "wide", "shield", "frenzy", "swarm"];

export function isTwistId(v: unknown): v is TwistId {
  return typeof v === "string" && (TWIST_IDS as readonly string[]).includes(v);
}

const ACCEL = 0.55;
const DAMPING = 0.9;
const DASH_IMPULSE = 9;

/** 64 unit vectors, index 0 = +x, increasing clockwise in screen space (y down). */
export const DIRS: ReadonlyArray<readonly [number, number]> = [[1,0],[0.995185,0.098017],[0.980785,0.19509],[0.95694,0.290285],[0.92388,0.382683],[0.881921,0.471397],[0.83147,0.55557],[0.77301,0.634393],[0.707107,0.707107],[0.634393,0.77301],[0.55557,0.83147],[0.471397,0.881921],[0.382683,0.92388],[0.290285,0.95694],[0.19509,0.980785],[0.098017,0.995185],[0,1],[-0.098017,0.995185],[-0.19509,0.980785],[-0.290285,0.95694],[-0.382683,0.92388],[-0.471397,0.881921],[-0.55557,0.83147],[-0.634393,0.77301],[-0.707107,0.707107],[-0.77301,0.634393],[-0.83147,0.55557],[-0.881921,0.471397],[-0.92388,0.382683],[-0.95694,0.290285],[-0.980785,0.19509],[-0.995185,0.098017],[-1,0],[-0.995185,-0.098017],[-0.980785,-0.19509],[-0.95694,-0.290285],[-0.92388,-0.382683],[-0.881921,-0.471397],[-0.83147,-0.55557],[-0.77301,-0.634393],[-0.707107,-0.707107],[-0.634393,-0.77301],[-0.55557,-0.83147],[-0.471397,-0.881921],[-0.382683,-0.92388],[-0.290285,-0.95694],[-0.19509,-0.980785],[-0.098017,-0.995185],[0,-1],[0.098017,-0.995185],[0.19509,-0.980785],[0.290285,-0.95694],[0.382683,-0.92388],[0.471397,-0.881921],[0.55557,-0.83147],[0.634393,-0.77301],[0.707107,-0.707107],[0.77301,-0.634393],[0.83147,-0.55557],[0.881921,-0.471397],[0.92388,-0.382683],[0.95694,-0.290285],[0.980785,-0.19509],[0.995185,-0.098017]];

export interface Shard { x: number; y: number; born: number }
/** Hazards are axis-aligned squares (half-size `s`); collision is exact circle-vs-square. */
export interface Hazard { id: number; x: number; y: number; vx: number; vy: number; s: number; hit: boolean; nearMissed: boolean; /** Battle: ticks until it vanishes. */ ttl?: number }
export interface PowerUp { type: PowerType; x: number; y: number; born: number }
export type GameEvent =
  | { type: "pickup"; x: number; y: number; combo: number; points: number }
  | { type: "hit"; x: number; y: number }
  | { type: "shieldBreak"; x: number; y: number }
  | { type: "nearMiss"; x: number; y: number; points: number }
  | { type: "power"; power: PowerType; x: number; y: number }
  | { type: "powerExpired"; power: PowerType }
  | { type: "dash" }
  | { type: "end" };

export interface GameState {
  seed: number;
  twist: TwistId;
  rules: Rules;
  rng: number;
  tick: number;
  ticksLeft: number;
  x: number; y: number; vx: number; vy: number;
  dir: number; // -1 = no thrust
  facing: number; // last thrust direction, used for dashing from standstill
  dashCooldown: number;
  invuln: number;
  dashing: number;
  score: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  shards: Shard[];
  hazards: Hazard[];
  nextHazardId: number;
  power: PowerUp | null;
  nextPowerTick: number;
  /** Remaining ticks for each active power-up (0 = inactive). */
  active: Record<PowerType, number>;
  pickups: number;
  hits: number;
  shieldBlocks: number;
  nearMisses: number;
  powerUps: number;
  over: boolean;
  /** Battle modifiers (absent in solo modes, so solo simulation is unchanged). */
  mods?: { hazardScale: number; jam: boolean };
}

export interface TickInput { dir: number; dash: boolean }

/** mulberry32 — integer-only PRNG, identical in every engine. */
function next(s: GameState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function normalizeSeed(seed: number): number {
  return (Math.floor(Math.abs(seed)) % 2147483647) | 0;
}

export function createGame(seed: number, twist: TwistId = "classic", override: Partial<Rules> = {}): GameState {
  const rules = rulesFor(twist, override);
  const s: GameState = {
    seed: normalizeSeed(seed), twist, rules, rng: normalizeSeed(seed), tick: 0, ticksLeft: rules.durationTicks,
    x: 0, y: 0, vx: 0, vy: 0, dir: -1, facing: 0, dashCooldown: 0, invuln: 0, dashing: 0,
    score: 0, combo: 0, comboTimer: 0, maxCombo: 0, shards: [], hazards: [], nextHazardId: 1,
    power: null, nextPowerTick: POWER_FIRST_TICK, active: { shield: rules.startShield ? POWER_DURATION.shield : 0, slow: 0, magnet: 0, double: 0 },
    pickups: 0, hits: 0, shieldBlocks: 0, nearMisses: 0, powerUps: 0, over: false,
  };
  for (let i = 0; i < 4; i++) spawnShard(s);
  return s;
}

/** Random point inside the arena, at least `minGap` from the player when possible. */
function spawnPoint(s: GameState, minGap: number): { x: number; y: number } {
  let x = 0, y = 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    const d = DIRS[Math.floor(next(s) * 64)];
    const r = Math.sqrt(next(s)) * ARENA_R * 0.85;
    x = d[0] * r; y = d[1] * r;
    const dx = x - s.x, dy = y - s.y;
    if (dx * dx + dy * dy > minGap * minGap) break;
  }
  return { x, y };
}

function spawnShard(s: GameState) {
  const p = spawnPoint(s, 60);
  s.shards.push({ x: p.x, y: p.y, born: s.tick });
}

function spawnHazard(s: GameState) {
  const from = DIRS[Math.floor(next(s) * 64)];
  const sx = from[0] * ARENA_R * 1.15, sy = from[1] * ARENA_R * 1.15;
  // Aim at a random point inside the inner arena.
  const to = DIRS[Math.floor(next(s) * 64)];
  const tr = next(s) * ARENA_R * 0.6;
  const dx = to[0] * tr - sx, dy = to[1] * tr - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const progress = s.tick / s.rules.durationTicks;
  const speed = (1.5 + next(s) * 1.0) * (1 + progress * 0.6) * s.rules.hazardSpeed; // units per tick
  s.hazards.push({ id: s.nextHazardId++, x: sx, y: sy, vx: (dx / len) * speed, vy: (dy / len) * speed, s: 12 + next(s) * 8, hit: false, nearMissed: false });
}

function nextPowerGap(s: GameState): number {
  const [base, span] = s.rules.powerGap;
  return s.tick + base + Math.floor(next(s) * span);
}

/** Squared distance from point (px,py) to an axis-aligned square centred at (hx,hy) with half-size hs. */
export function distSqToSquare(px: number, py: number, hx: number, hy: number, hs: number): number {
  const cx = Math.max(hx - hs, Math.min(px, hx + hs));
  const cy = Math.max(hy - hs, Math.min(py, hy + hs));
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy;
}

function addPoints(s: GameState, pts: number) {
  const total = s.active.double > 0 ? pts * 2 : pts;
  s.score += total;
  return total;
}

/** Advance exactly one tick. Returns events for rendering/audio. */
export function step(s: GameState, input: TickInput): GameEvent[] {
  if (s.over) return [];
  const ev: GameEvent[] = [];
  s.dir = input.dir >= 0 && input.dir < 64 ? Math.floor(input.dir) : -1;
  if (s.dir >= 0) s.facing = s.dir;

  // --- Movement
  if (s.dir >= 0) { const d = DIRS[s.dir]; s.vx += d[0] * ACCEL; s.vy += d[1] * ACCEL; }
  if (input.dash && s.dashCooldown === 0) {
    const d = DIRS[s.facing];
    s.vx += d[0] * DASH_IMPULSE; s.vy += d[1] * DASH_IMPULSE;
    s.dashCooldown = DASH_COOLDOWN; s.dashing = DASH_INVULN; s.invuln = Math.max(s.invuln, DASH_INVULN);
    ev.push({ type: "dash" });
  }
  s.vx *= DAMPING; s.vy *= DAMPING;
  s.x += s.vx; s.y += s.vy;
  const dist = Math.sqrt(s.x * s.x + s.y * s.y);
  const maxR = ARENA_R - PLAYER_R;
  if (dist > maxR) {
    // Slide along the wall: remove the outward velocity component.
    const nx = s.x / dist, ny = s.y / dist;
    s.x = nx * maxR; s.y = ny * maxR;
    const out = s.vx * nx + s.vy * ny;
    if (out > 0) { s.vx -= out * nx; s.vy -= out * ny; }
  }
  if (s.dashCooldown > 0) s.dashCooldown--;
  if (s.invuln > 0) s.invuln--;
  if (s.dashing > 0) s.dashing--;

  // --- Power-up timers
  for (const t of POWER_TYPES) {
    if (s.active[t] > 0) { s.active[t]--; if (s.active[t] === 0) ev.push({ type: "powerExpired", power: t }); }
  }

  // --- Shards (with magnet pull)
  if (s.active.magnet > 0) {
    for (const sh of s.shards) {
      const dx = s.x - sh.x, dy = s.y - sh.y, d2 = dx * dx + dy * dy;
      if (d2 < MAGNET_RANGE * MAGNET_RANGE && d2 > 0) { const d = Math.sqrt(d2); const pull = Math.min(4, d); sh.x += (dx / d) * pull; sh.y += (dy / d) * pull; }
    }
  }
  const sr = s.rules.shardR;
  const reach = (PLAYER_R + sr) * (PLAYER_R + sr);
  for (let i = s.shards.length - 1; i >= 0; i--) {
    const sh = s.shards[i];
    const dx = sh.x - s.x, dy = sh.y - s.y;
    if (dx * dx + dy * dy <= reach) {
      s.combo = s.comboTimer > 0 ? Math.min(s.combo + 1, MAX_COMBO) : 1;
      s.comboTimer = COMBO_WINDOW + 1; // +1: this tick's decrement below leaves a full window
      const pts = addPoints(s, 10 * s.combo);
      s.pickups++;
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;
      ev.push({ type: "pickup", x: sh.x, y: sh.y, combo: s.combo, points: pts });
      s.shards.splice(i, 1);
    }
  }
  while (s.shards.length < 4) spawnShard(s);
  if (s.comboTimer > 0) { s.comboTimer--; if (s.comboTimer === 0) s.combo = 0; }

  // --- Power-up spawn / pickup / despawn
  if (s.power) {
    const dx = s.power.x - s.x, dy = s.power.y - s.y, r = PLAYER_R + POWER_R;
    if (dx * dx + dy * dy <= r * r && !s.mods?.jam) {
      const t = s.power.type;
      s.active[t] = POWER_DURATION[t];
      s.powerUps++;
      ev.push({ type: "power", power: t, x: s.power.x, y: s.power.y });
      s.power = null;
      s.nextPowerTick = nextPowerGap(s);
    } else if (s.tick - s.power.born >= POWER_LIFETIME) {
      s.power = null;
      s.nextPowerTick = nextPowerGap(s);
    }
  } else if (s.tick >= s.nextPowerTick) {
    const p = spawnPoint(s, 90);
    const roll = POWER_TYPES[Math.floor(next(s) * POWER_TYPES.length)];
    s.power = { type: s.rules.powerOnly ?? roll, x: p.x, y: p.y, born: s.tick };
  }

  // --- Hazards
  const progress = s.tick / s.rules.durationTicks;
  const maxHazards = Math.min(s.rules.hazardCap, 3 + Math.floor(s.tick / 900) + s.rules.extraHazards);
  if (s.hazards.length < maxHazards && next(s) < (0.012 + 0.02 * progress) * s.rules.spawnRate) spawnHazard(s);
  const speedScale = (s.active.slow > 0 ? 0.5 : 1) * (s.mods ? s.mods.hazardScale : 1);
  const limit = ARENA_R * 1.4 * (ARENA_R * 1.4);
  for (let i = s.hazards.length - 1; i >= 0; i--) {
    const h = s.hazards[i];
    h.x += h.vx * speedScale; h.y += h.vy * speedScale;
    const touching = !h.hit && distSqToSquare(s.x, s.y, h.x, h.y, h.s) < PLAYER_R * PLAYER_R;
    if (touching) {
      if (s.dashing > 0) {
        if (!h.nearMissed) { h.nearMissed = true; s.nearMisses++; ev.push({ type: "nearMiss", x: h.x, y: h.y, points: addPoints(s, NEAR_MISS_POINTS) }); }
      } else if (s.invuln === 0) {
        h.hit = true;
        if (s.active.shield > 0) {
          s.active.shield = 0; s.shieldBlocks++; s.invuln = HIT_GRACE;
          ev.push({ type: "shieldBreak", x: s.x, y: s.y });
        } else {
          s.hits++; s.combo = 0; s.comboTimer = 0;
          s.ticksLeft = Math.max(0, s.ticksLeft - HIT_PENALTY);
          s.invuln = HIT_GRACE;
          ev.push({ type: "hit", x: s.x, y: s.y });
        }
      }
    }
    if (h.ttl !== undefined && --h.ttl <= 0) { s.hazards.splice(i, 1); continue; }
    if (h.x * h.x + h.y * h.y > limit) s.hazards.splice(i, 1);
  }

  s.tick++;
  s.ticksLeft--;
  if (s.ticksLeft <= 0) { s.ticksLeft = 0; s.over = true; ev.push({ type: "end" }); }
  return ev;
}

/** Battle: add a hazard directly (attacker abilities). Deterministic; uses no randomness. */
export function injectHazard(s: GameState, x: number, y: number, vx: number, vy: number, size: number, ttl?: number): void {
  s.hazards.push({ id: s.nextHazardId++, x, y, vx, vy, s: size, hit: false, nearMissed: false, ...(ttl !== undefined ? { ttl } : {}) });
}

/** Battle: add a shard at a point (defender abilities). */
export function injectShard(s: GameState, x: number, y: number): void {
  s.shards.push({ x, y, born: s.tick });
}

/** Input log: flat array of [tick, dir, dash] triples, one per tick where input changed or dash pressed. */
export type InputLog = number[];

export class InputRecorder {
  log: InputLog = [];
  private lastDir = -1;
  record(tick: number, input: TickInput) {
    if (input.dir !== this.lastDir || input.dash) {
      this.log.push(tick, input.dir, input.dash ? 1 : 0);
      this.lastDir = input.dir;
    }
  }
}

/** Validates a recorded input log. `maxTicks` is the run length (pass `rules.durationTicks` for longer level runs). */
export function validateInputLog(log: unknown, maxTicks: number = RUN_TICKS): log is InputLog {
  if (!Array.isArray(log) || log.length % 3 !== 0 || log.length > MAX_INPUT_EVENTS * 3) return false;
  let prev = -1;
  for (let i = 0; i < log.length; i += 3) {
    const [t, d, k] = [log[i], log[i + 1], log[i + 2]];
    if (!Number.isInteger(t) || t <= prev || t < 0 || t >= maxTicks) return false;
    if (!Number.isInteger(d) || d < -1 || d > 63) return false;
    if (k !== 0 && k !== 1) return false;
    prev = t;
  }
  return true;
}

export interface RunResult { score: number; ticks: number; pickups: number; hits: number; nearMisses: number; maxCombo: number; powerUps: number; shieldBlocks: number; inputEvents: number }

/** Lock-step player for a recorded run (used to render a friend's ghost alongside a live run). */
export class GhostPlayer {
  readonly state: GameState;
  private i = 0;
  private dir = -1;
  constructor(seed: number, private log: InputLog, twist: TwistId = "classic", override: Partial<Rules> = {}) { this.state = createGame(seed, twist, override); }
  step(): void {
    const s = this.state;
    if (s.over) return;
    let dash = false;
    if (this.i < this.log.length && this.log[this.i] === s.tick) { this.dir = this.log[this.i + 1]; dash = this.log[this.i + 2] === 1; this.i += 3; }
    step(s, { dir: this.dir, dash });
  }
}

export function resultOf(s: GameState, inputEvents: number): RunResult {
  return { score: s.score, ticks: s.tick, pickups: s.pickups, hits: s.hits, nearMisses: s.nearMisses, maxCombo: s.maxCombo, powerUps: s.powerUps, shieldBlocks: s.shieldBlocks, inputEvents };
}

/** Re-simulate a full run from its seed and input log. */
export function replay(seed: number, log: InputLog, twist: TwistId = "classic", override: Partial<Rules> = {}): RunResult {
  const s = createGame(seed, twist, override);
  let i = 0, dir = -1;
  while (!s.over) {
    let dash = false;
    if (i < log.length && log[i] === s.tick) { dir = log[i + 1]; dash = log[i + 2] === 1; i += 3; }
    step(s, { dir, dash });
  }
  return resultOf(s, log.length / 3);
}

/** Map a vector to the nearest of the 64 directions (client-side only; result index is what gets recorded). */
export function dirIndex(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return -1;
  let best = 0, bestDot = -Infinity;
  const len = Math.sqrt(dx * dx + dy * dy);
  for (let i = 0; i < 64; i++) {
    const dot = (DIRS[i][0] * dx + DIRS[i][1] * dy) / len;
    if (dot > bestDot) { bestDot = dot; best = i; }
  }
  return best;
}
