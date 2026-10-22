/* Reproducible gameplay measurements used in the public guides (see /guides/methodology).
 * Runs a simple scripted test player over 200 fixed seeds per twist, with and without reactive dashing.
 *   npm run stats   → writes src/content/stats.json */
import { writeFileSync } from "node:fs";
import { ENGINE_VERSION, TWIST_IDS, createGame, dirIndex, step, type GameState, type TwistId } from "../src/game/engine";

const SEEDS = 200;

/** Chases the nearest shard (or a nearby power-up); optionally dashes when a hazard is within 45 units. */
function testPlayer(s: GameState, dash: boolean) {
  let target: { x: number; y: number } = s.shards[0], best = Infinity;
  for (const sh of s.shards) { const d = (sh.x - s.x) ** 2 + (sh.y - s.y) ** 2; if (d < best) { best = d; target = sh; } }
  if (s.power && (s.power.x - s.x) ** 2 + (s.power.y - s.y) ** 2 < best * 1.5) target = s.power;
  const danger = dash && s.hazards.some((h) => (h.x - s.x) ** 2 + (h.y - s.y) ** 2 < 45 * 45);
  return { dir: dirIndex(target.x - s.x, target.y - s.y), dash: danger };
}

const avg = (a: number[]) => Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10;
const pct = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)];

function measure(twist: TwistId, dash: boolean) {
  const score: number[] = [], hits: number[] = [], secs: number[] = [], powerUps: number[] = [], pickups: number[] = [];
  let comboPts = 0, allPts = 0, nearMisses = 0;
  for (let i = 1; i <= SEEDS; i++) {
    const g = createGame(i * 7919, twist);
    while (!g.over) for (const e of step(g, testPlayer(g, dash))) {
      if (e.type === "pickup") { allPts += e.points; if (e.combo >= 5) comboPts += e.points; }
      if (e.type === "nearMiss") nearMisses++;
    }
    score.push(g.score); hits.push(g.hits); secs.push(g.tick / 60); powerUps.push(g.powerUps); pickups.push(g.pickups);
  }
  return {
    avgScore: Math.round(avg(score)), median: pct(score, 0.5), p90: pct(score, 0.9), avgHits: avg(hits), avgSeconds: avg(secs),
    avgPowerUps: avg(powerUps), avgShards: avg(pickups), comboShare: Math.round((comboPts / allPts) * 1000) / 10, nearMissesPerRun: avg([nearMisses / SEEDS]),
  };
}

// Movement constants measured directly
const m = createGame(1); m.hazards = []; m.nextPowerTick = 1e9;
for (let i = 0; i < 60; i++) { m.x = 0; m.y = 0; m.shards = m.shards.map((s) => ({ ...s, x: -250, y: 0 })); step(m, { dir: 0, dash: false }); }
const topSpeed = Math.sqrt(m.vx ** 2 + m.vy ** 2) * 60;
const d = createGame(1); d.hazards = []; d.nextPowerTick = 1e9;
step(d, { dir: 0, dash: true });
for (let i = 0; i < 40; i++) { d.shards = d.shards.map((s) => ({ ...s, x: -250, y: 0 })); step(d, { dir: -1, dash: false }); }

const out = {
  measuredOn: new Date().toISOString().slice(0, 10),
  engineVersion: ENGINE_VERSION,
  seedsPerConfig: SEEDS,
  movement: { topSpeedUnitsPerSec: Math.round(topSpeed), arenaDiameter: 600, secondsToCrossArena: Math.round((600 / topSpeed) * 10) / 10, dashDistanceFromStandstill: Math.round(d.x) },
  twists: Object.fromEntries(TWIST_IDS.map((t) => [t, { noDash: measure(t, false), reactiveDash: measure(t, true) }])),
};
writeFileSync(new URL("../src/content/stats.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out.movement), "classic:", JSON.stringify(out.twists.classic));
