/** Browser-safe Battle types (what the server sends to clients). */
import type { BotLevel, RoundSeconds, TeamId } from "@/game/battle/config";
import type { AttackPlay, RoundOutcome } from "@/game/battle/sim";

export interface PublicPlayer { id: string; name: string; color: string; team: TeamId; bot: BotLevel | null }
export interface PublicRound {
  n: number; seconds: number; seed: number; defenders: TeamId[]; attackers: TeamId | null;
  roster: Array<{ id: string; team: TeamId; bot: BotLevel | null }>;
  outcome: RoundOutcome | null; finishedAt: number | null;
}
export interface PublicRoom {
  code: string; hostId: string; seconds: RoundSeconds; botLevel: BotLevel; status: "lobby" | "playing" | "done"; match: number;
  round: number; roundStartAt: number | null; winner: TeamId | "draw" | null; version: number;
  players: PublicPlayer[]; rounds: PublicRound[]; you: string | null;
}
export interface LaneDelta { i: number[]; s: number[]; p: AttackPlay[]; o: [number, number, number]; lt: number; to: number | null }
export interface TickResponse { now: number; v: number; room?: PublicRoom; lanes?: Record<string, LaneDelta>; upload?: { ok: boolean; reason?: string } }
