/**
 * Battle mode: rules shared by the browser and the server. Everything here is data; the simulation lives in sim.ts.
 *
 * A hit is a knock-down (counted as a "KO"): combo lost, 1 s respawn at the centre. The clock never shortens.
 * Format: two teams (1–5 players each, humans or AI). Round 1: team A defends (collects shards) while team B attacks
 * (sabotages). Round 2: roles swap. Higher average defending score per defender wins. A tie goes to a 90-second
 * Sudden Surge where both teams defend at once against the arena itself.
 */
import { TPS, type Rules } from "../engine";

export const BATTLE_VERSION = 1;
export type TeamId = "A" | "B";
export const TEAMS: Record<TeamId, { name: string; color: string }> = {
  A: { name: "Team Ember", color: "#ff8a3d" },
  B: { name: "Team Tide", color: "#3ea8ff" },
};
export const MAX_TEAM = 5;
export const MAX_PLAYERS = 10;
/** 90 s "Quick" rounds are the default: short, intense, and a whole match fits in about four minutes. */
export const ROUND_SECONDS = [90, 180, 300] as const;
export const roundLabel = (s: number) => (s < 120 ? "90 s" : `${s / 60} min`);
export type RoundSeconds = (typeof ROUND_SECONDS)[number];
export const TIEBREAK_SECONDS = 90;
export const COUNTDOWN_MS = 6000;
export const BETWEEN_ROUNDS_MS = 15000;
/** Inputs may be uploaded at most this many ticks after they happened (later = connection lost, AI takes over). */
export const MAX_LATE_TICKS = 10 * TPS;
/** No upload for this long → the AI takes over that player for the rest of the round. */
export const TAKEOVER_AFTER_TICKS = 8 * TPS;
/** Attacks land this many ticks after the server accepts them (telegraphed on the defender's screen). */
export const ATTACK_LEAD = 3 * TPS;
export const MAX_BATTLE_INPUTS = 18000; // per player per round (at most one change per tick of a 5-minute round)

/** Ten distinct player colours (assigned on join). */
export const PLAYER_COLORS = ["#ffbf47", "#3ee6f0", "#ff5fa2", "#7cf06e", "#b18cff", "#ff7a59", "#4fd1ff", "#f4f06b", "#ff9de2", "#5ef0c8"] as const;

export type BotLevel = "easy" | "medium" | "hard";
export const BOT_NAMES = ["Byte", "Nova", "Pixel", "Echo", "Glitch", "Rook", "Vex", "Orbit", "Flux", "Zephyr"] as const;

/** Arena rules for Battle rounds: long rounds with a hazard ceiling so minute four is hard but playable. */
export function battleRules(seconds: number): Partial<Rules> {
  return { durationTicks: seconds * TPS, hazardCap: 9, hazardSpeed: 1 };
}

// ---------------------------------------------------------------------------------------------------------------
// Defender kit (collect points). Energy regenerates; abilities cost energy and have a cooldown.
export type DefenderAbility = "bulwark" | "overdrive" | "tractor" | "stasis" | "purge" | "aegis" | "supernova";
export interface DefenderAbilityDef { id: DefenderAbility; name: string; cost: number; level: 1 | 2 | 3; minTick?: number; team?: boolean; blurb: string; icon: string }
export const DEFENDER_ABILITIES: readonly DefenderAbilityDef[] = [
  { id: "bulwark", name: "Bulwark", cost: 3, level: 1, icon: "⬡", blurb: "Personal shield that absorbs the next hit." },
  { id: "tractor", name: "Tractor", cost: 3, level: 1, icon: "◎", blurb: "Pull nearby shards to you for 6 s." },
  { id: "stasis", name: "Stasis", cost: 3, level: 1, icon: "❄", blurb: "Hazards move at half speed for 4 s." },
  { id: "purge", name: "Purge", cost: 2, level: 1, icon: "✦", blurb: "Wipe every sabotage on you and blink invulnerable." },
  { id: "overdrive", name: "Overdrive", cost: 4, level: 2, icon: "⚡", blurb: "Every point counts double for 5 s." },
  { id: "aegis", name: "Aegis Link", cost: 7, level: 1, minTick: 45 * TPS, team: true, icon: "⛨", blurb: "Shield your whole team (after 0:45)." },
  { id: "supernova", name: "Supernova", cost: 8, level: 3, icon: "✺", blurb: "Turn every hazard on your field into a shard." },
];
export const DEFENDER_INDEX: Record<DefenderAbility, number> = Object.fromEntries(DEFENDER_ABILITIES.map((a, i) => [a.id, i])) as Record<DefenderAbility, number>;
/** Defender level from score. Level 2 adds Second Wind: once every 15 s a hit doesn't break a 3+ combo. */
export const DEFENDER_LEVELS = [0, 2500, 7000] as const;
export const SECOND_WIND_GAP = 15 * TPS;
export const DEFENDER_ENERGY = { start: 2, max: 10, regenTicks: 90 } as const; // +1 every 1.5 s
export const ABILITY_COOLDOWN = 5 * TPS;

// ---------------------------------------------------------------------------------------------------------------
// Attacker kit (sabotage). Single target, or the whole defending team (costs more, needs level 2).
export type AttackAbility = "strike" | "swarm" | "mirror" | "erosion" | "surge" | "jam" | "eclipse";
export interface AttackAbilityDef { id: AttackAbility; name: string; cost: number; level: 1 | 2 | 3; duration: number; teamable: boolean; aimed?: boolean; blurb: string; icon: string }
export const ATTACK_ABILITIES: readonly AttackAbilityDef[] = [
  { id: "strike", name: "Strike", cost: 2, level: 1, duration: 150, teamable: false, aimed: true, icon: "✕", blurb: "Drop a mine exactly where you tap on one defender's arena." },
  { id: "swarm", name: "Swarm", cost: 4, level: 1, duration: 0, teamable: true, icon: "⁂", blurb: "Two hazards fly straight at the target." },
  { id: "erosion", name: "Erosion", cost: 3, level: 1, duration: 6 * TPS, teamable: true, icon: "◌", blurb: "Shards shrink to half size for 6 s." },
  { id: "mirror", name: "Mirror", cost: 4, level: 2, duration: 3 * TPS, teamable: true, icon: "⇄", blurb: "Steering is reversed for 3 s." },
  { id: "surge", name: "Surge", cost: 4, level: 2, duration: 4 * TPS, teamable: true, icon: "➶", blurb: "Hazards move 60% faster for 4 s." },
  { id: "jam", name: "Jam", cost: 5, level: 2, duration: 5 * TPS, teamable: true, icon: "▦", blurb: "No power-ups or abilities for 5 s." },
  { id: "eclipse", name: "Eclipse", cost: 8, level: 3, duration: 4 * TPS, teamable: true, icon: "◐", blurb: "Blackout plus Surge for 4 s." },
];
export const ATTACK_INDEX: Record<AttackAbility, number> = Object.fromEntries(ATTACK_ABILITIES.map((a, i) => [a.id, i])) as Record<AttackAbility, number>;
export const TEAM_COST_FACTOR = 1.75;
export const ATTACK_ENERGY = { start: 3, max: 10, baseRegenTicks: 90 } as const;
export const ATTACK_COOLDOWN = 3 * TPS; // same ability
export const ATTACK_GAP = 30; // any two plays
export const attackCost = (a: AttackAbilityDef, team: boolean) => (team ? Math.ceil(a.cost * TEAM_COST_FACTOR) : a.cost);

/** Hits within this window after an attack are credited to that attacker. */
export const CREDIT_WINDOW = 4 * TPS;

export interface BotProfile { reaction: number; dodge: number; dashAware: boolean; abilityEvery: number; attackEvery: number; teamChance: number; aimSkill: number }
export const BOT_PROFILES: Record<BotLevel, BotProfile> = {
  easy: { reaction: 18, dodge: 0, dashAware: false, abilityEvery: 20 * TPS, attackEvery: 9 * TPS, teamChance: 0, aimSkill: 0.3 },
  medium: { reaction: 9, dodge: 55, dashAware: true, abilityEvery: 10 * TPS, attackEvery: 6 * TPS, teamChance: 0.25, aimSkill: 0.65 },
  hard: { reaction: 4, dodge: 80, dashAware: true, abilityEvery: 6 * TPS, attackEvery: 4 * TPS, teamChance: 0.45, aimSkill: 0.9 },
};
