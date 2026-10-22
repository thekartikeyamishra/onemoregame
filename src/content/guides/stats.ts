import data from "../stats.json";
import { COMBO_WINDOW, DASH_COOLDOWN, DASH_INVULN, HIT_GRACE, HIT_PENALTY, MAGNET_RANGE, MAX_COMBO, NEAR_MISS_POINTS, POWER_DURATION, POWER_LIFETIME, TPS } from "@/game/engine";

/** Measured gameplay statistics (scripts/measure-stats.ts) and rule constants, so guide numbers can't drift from the engine. */
export const stats = data;
export const sec = (ticks: number) => Math.round((ticks / TPS) * 10) / 10;
export const rules = {
  comboWindow: sec(COMBO_WINDOW), maxCombo: MAX_COMBO, hitPenalty: sec(HIT_PENALTY), hitGrace: sec(HIT_GRACE),
  dashInvuln: sec(DASH_INVULN), dashCooldown: sec(DASH_COOLDOWN), nearMiss: NEAR_MISS_POINTS, magnetRange: MAGNET_RANGE,
  powerLifetime: sec(POWER_LIFETIME), shield: sec(POWER_DURATION.shield), slow: sec(POWER_DURATION.slow),
  magnet: sec(POWER_DURATION.magnet), double: sec(POWER_DURATION.double),
};
export const fmt = (n: number) => n.toLocaleString("en-IN");
const c = data.twists.classic;
export const derived = {
  dashGainPct: Math.round(((c.reactiveDash.avgScore - c.noDash.avgScore) / c.noDash.avgScore) * 100),
  shardsPerSec: Math.round((c.reactiveDash.avgShards / c.reactiveDash.avgSeconds) * 10) / 10,
  /** Points a strong player loses to one hit: shards not collected in 3 s at ×9, plus rebuilding the chain (10+…+80 vs 8×90). */
  hitCost: Math.round(((c.reactiveDash.avgShards / c.reactiveDash.avgSeconds) * 3 * 90 + (8 * 90 - (10 + 20 + 30 + 40 + 50 + 60 + 70 + 80))) / 10) * 10,
};
