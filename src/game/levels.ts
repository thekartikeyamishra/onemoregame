/**
 * Levels mode — deterministic, hand-designed level "kinds" plus a fixed seed per level, so Level N is identical for
 * every player and every device. Pure module: used by the browser (display) and the server (authoritative targets).
 */
import { TPS, createGame, dirIndex, step, type GameState, type Rules } from "./engine";
import levelTable from "../content/levels.json";

export const LEVEL_COUNT = 30;

export type LevelKindId = "classic" | "sprint" | "magnet" | "precision" | "frenzy" | "gauntlet" | "shielded" | "endurance" | "swarm" | "boss";

interface LevelKind { id: LevelKindId; name: string; description: string; rules: Partial<Rules> }

export const LEVEL_KINDS: Record<LevelKindId, LevelKind> = {
  classic: { id: "classic", name: "Warm-up", description: "Standard rules. Build chains, dodge hazards.", rules: {} },
  sprint: { id: "sprint", name: "Sprint", description: "Only 30 seconds. Every second counts.", rules: { durationTicks: 30 * TPS } },
  magnet: { id: "magnet", name: "Magnet Field", description: "Every power-up is a Magnet.", rules: { powerOnly: "magnet" } },
  precision: { id: "precision", name: "Precision", description: "Smaller shards. Steer exactly.", rules: { shardR: 6 } },
  frenzy: { id: "frenzy", name: "Frenzy", description: "Power-ups appear twice as often.", rules: { powerGap: [300, 180] } },
  gauntlet: { id: "gauntlet", name: "Gauntlet", description: "Faster, more frequent hazards.", rules: { hazardSpeed: 1.2, spawnRate: 1.4, extraHazards: 1 } },
  shielded: { id: "shielded", name: "Iron Start", description: "Start with a Shield, but hazards are 30% faster.", rules: { startShield: true, hazardSpeed: 1.3 } },
  endurance: { id: "endurance", name: "Endurance", description: "75 seconds. Pace yourself.", rules: { durationTicks: 75 * TPS } },
  swarm: { id: "swarm", name: "Swarm", description: "Two extra hazards on the field.", rules: { extraHazards: 2 } },
  boss: { id: "boss", name: "Boss Arena", description: "45 seconds, fast hazards, smaller shards. Clear it to break through.", rules: { durationTicks: 45 * TPS, hazardSpeed: 1.25, extraHazards: 2, shardR: 7, spawnRate: 1.3 } },
};

/** First ten levels are a hand-made introduction; after that kinds are drawn deterministically. Every 5th is a boss. */
const OPENING: LevelKindId[] = ["classic", "sprint", "magnet", "precision", "boss", "frenzy", "gauntlet", "shielded", "endurance", "boss"];
const LATER: LevelKindId[] = ["classic", "sprint", "magnet", "precision", "frenzy", "gauntlet", "shielded", "endurance", "swarm"];

export interface LevelDef {
  n: number;
  kind: LevelKindId;
  name: string;
  description: string;
  seed: number;
  rules: Partial<Rules>;
  /** Minimum score to clear the level and unlock the next one. */
  target: number;
  /** Two- and three-star scores. */
  stars: [number, number, number];
}

export function levelSeed(n: number): number {
  // Integer hash (deterministic, public — levels are meant to be the same for everyone).
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return ((h >>> 0) % 2147483646) + 1;
}

function kindOf(n: number): LevelKindId {
  if (n <= OPENING.length) return OPENING[n - 1];
  if (n % 5 === 0) return "boss";
  return LATER[levelSeed(n * 31) % LATER.length];
}

/** Difficulty ramps gently with the level number on top of the kind's own rules. */
function rulesOf(n: number, kind: LevelKindId): Partial<Rules> {
  const base = LEVEL_KINDS[kind].rules;
  const ramp = Math.min(0.35, Math.max(0, n - 1) * 0.012);
  return { ...base, hazardSpeed: Math.round((base.hazardSpeed ?? 1) * (1 + ramp) * 1000) / 1000, extraHazards: (base.extraHazards ?? 0) + Math.floor(n / 12) };
}

/**
 * Benchmark player used to set targets: steers toward the nearest shard (or a nearby power-up) but only re-decides
 * every 12 ticks (200 ms, roughly human reaction time) and dashes only when a hazard is already close at that moment.
 */
export function benchmarkRun(seed: number, rules: Partial<Rules>, interval = 12, phase = 0): number {
  const s = createGame(seed, "classic", rules);
  let input = { dir: -1, dash: false };
  while (!s.over) {
    if ((s.tick + phase) % interval === 0) input = decide(s);
    step(s, input);
    input = { ...input, dash: false };
  }
  return s.score;
}

/** Median of 8 benchmark runs with reaction times of 167–267 ms and different timing phases (removes single-run luck). */
export function benchmarkScore(seed: number, rules: Partial<Rules>): number {
  const runs: number[] = [];
  for (const interval of [10, 12, 14, 16]) for (const phase of [0, 5]) runs.push(benchmarkRun(seed, rules, interval, phase));
  runs.sort((a, b) => a - b);
  return Math.round((runs[3] + runs[4]) / 2);
}

function decide(s: GameState) {
  let target: { x: number; y: number } = s.shards[0], best = Infinity;
  for (const sh of s.shards) { const d = (sh.x - s.x) ** 2 + (sh.y - s.y) ** 2; if (d < best) { best = d; target = sh; } }
  if (s.power && (s.power.x - s.x) ** 2 + (s.power.y - s.y) ** 2 < best * 1.5) target = s.power;
  const danger = s.hazards.some((h) => !h.hit && (h.x - s.x) ** 2 + (h.y - s.y) ** 2 < 50 * 50);
  return { dir: dirIndex(target.x - s.x, target.y - s.y), dash: danger };
}

/**
 * Target = benchmark × a factor that rises from 55% (Level 1) to 105% (Level 30); bosses ask 5% more.
 * Late levels therefore require playing better than the benchmark player: hard, but proven possible.
 */
export function targetFactor(n: number, kind: LevelKindId): number {
  const f = 0.55 + (Math.min(n, LEVEL_COUNT) - 1) * (0.5 / (LEVEL_COUNT - 1));
  return kind === "boss" ? f + 0.05 : f;
}

const roundDown = (x: number, to: number) => Math.max(to, Math.floor(x / to) * to);

/** Runs the benchmark to build a level definition (~10 ms). Used by `npm run levels` and the drift test. */
export function generateLevel(n: number): LevelDef {
  const kind = kindOf(n);
  const seed = levelSeed(n);
  const rules = rulesOf(n, kind);
  const bench = benchmarkScore(seed, rules);
  const target = roundDown(bench * targetFactor(n, kind), 50);
  return {
    n, kind, name: LEVEL_KINDS[kind].name, description: LEVEL_KINDS[kind].description, seed, rules,
    target, stars: [target, roundDown(target * 1.25, 50), roundDown(target * 1.5, 50)],
  };
}

/** Precomputed table (src/content/levels.json, generated by `npm run levels`) so pages and APIs never re-simulate. */
const TABLE = levelTable as LevelDef[];

export function getLevel(n: number): LevelDef | null {
  if (!Number.isInteger(n) || n < 1 || n > LEVEL_COUNT) return null;
  return TABLE[n - 1] ?? null;
}

export function allLevels(): LevelDef[] {
  return TABLE.slice(0, LEVEL_COUNT);
}

export function starsFor(def: Pick<LevelDef, "stars">, score: number): 0 | 1 | 2 | 3 {
  return score >= def.stars[2] ? 3 : score >= def.stars[1] ? 2 : score >= def.stars[0] ? 1 : 0;
}
