"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TEAMS, type TeamId } from "@/game/battle/config";
import type { PublicRoom } from "@/lib/battle-types";
import { fmtClock } from "./draw";
import type { BattleWorld, FeedItem } from "./world";
import { TPS } from "@/game/engine";

const fmt = (n: number) => Math.max(0, Math.round(n)).toLocaleString("en-IN");
const short = (t: TeamId) => TEAMS[t].name.replace(/^Team /, "");

/**
 * The always-visible competitive layer of a live round: a tug-of-war score bar, the one number that matters
 * ("beat 4,120" / "keep them under 4,120"), your objective in plain words, and the clock.
 */
export function LiveBar({ room, world, now, children }: { room: PublicRoom; world: BattleWorld; now: number; children?: ReactNode }) {
  const rec = room.rounds.find((r) => r.n === room.round);
  const me = room.players.find((p) => p.id === room.you);
  if (!rec || !room.roundStartAt) return null;
  const leftTicks = Math.max(0, rec.seconds * TPS - Math.floor(((now - room.roundStartAt) * TPS) / 1000));
  const live = world.teamScore();
  const target = room.rounds.find((r) => r.n === 1)?.outcome?.teamScore.A ?? null;
  const myTeam: TeamId | null = me?.team ?? null;
  const defending = !!myTeam && rec.defenders.includes(myTeam);

  let a: number, b: number, line: string, lead: TeamId | "tie" | null;
  if (rec.n === 1) {
    a = live.A; b = 0; lead = null;
    line = defending ? "Set the bar: every point you score is what Team Tide must beat next round." : `Sabotage Ember: every KO lowers the score you'll need to beat (now ${fmt(live.A)}).`;
  } else if (rec.n === 2 && target !== null) {
    a = target; b = live.B;
    const gap = target - live.B;
    lead = gap > 0 ? "A" : gap < 0 ? "B" : "tie";
    line = defending
      ? gap > 0 ? `Beat ${fmt(target)}: ${fmt(gap)} to go.` : `You're ahead by ${fmt(-gap)}. Hold the lead!`
      : gap > 0 ? `Keep Tide under ${fmt(target)}: they're ${fmt(gap)} short.` : `Tide is ahead by ${fmt(-gap)}. Hit them now!`;
  } else {
    a = live.A; b = live.B;
    lead = a > b ? "A" : b > a ? "B" : "tie";
    line = `Sudden Surge: highest average wins. ${lead === "tie" ? "Dead level!" : `${TEAMS[lead].name} leads by ${fmt(Math.abs(a - b))}.`}`;
  }
  const total = Math.max(1, a + b);
  const share = rec.n === 1 ? 1 : a / total;
  const final10 = leftTicks <= 10 * TPS;

  return (
    <header className="live-bar" data-final={final10 || undefined}>
      <div className="live-top">
        <span className="live-team" style={{ color: TEAMS.A.color }}>{short("A")}<b>{fmt(a)}</b>{rec.n === 2 ? <small>target</small> : null}</span>
        <span className="live-clock" aria-label={`${Math.ceil(leftTicks / TPS)} seconds left`}>{fmtClock(leftTicks)}</span>
        <span className="live-team live-team--b" style={{ color: TEAMS.B.color }}>{rec.n === 1 ? <small>next</small> : <b>{fmt(b)}</b>}{short("B")}</span>
        <span className="live-tools">{children}</span>
      </div>
      <div className="live-meter" aria-hidden="true">
        <i style={{ width: `${share * 100}%`, background: TEAMS.A.color }} />
        <i style={{ width: `${(1 - share) * 100}%`, background: rec.n === 1 ? "transparent" : TEAMS.B.color }} />
      </div>
      <p className="live-line" aria-live="polite">
        <span className={`live-role live-role--${defending ? "def" : "atk"}`}>{rec.n === 3 ? "COLLECT" : defending ? "DEFEND" : "ATTACK"}</span>
        {line}
      </p>
      <LeadChange lead={lead} />
    </header>
  );
}

/** Big "LEAD CHANGE" flash when the leader flips (round 2 and the tie-break). */
function LeadChange({ lead }: { lead: TeamId | "tie" | null }) {
  const prev = useRef<TeamId | "tie" | null>(null);
  const [flash, setFlash] = useState<{ team: TeamId; key: number } | null>(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = lead;
    if (p && lead && p !== lead && lead !== "tie" && p !== "tie") {
      const id = requestAnimationFrame(() => setFlash({ team: lead, key: Date.now() }));
      return () => cancelAnimationFrame(id);
    }
  }, [lead]);
  useEffect(() => { if (!flash) return; const id = setTimeout(() => setFlash(null), 1800); return () => clearTimeout(id); }, [flash]);
  if (!flash) return null;
  return <div className="lead-change" key={flash.key} style={{ color: TEAMS[flash.team].color }}>LEAD CHANGE · {TEAMS[flash.team].name}</div>;
}

/** Kill-feed style lines: who attacked whom, KOs, combos, level-ups. */
export function BattleFeed({ world }: { world: BattleWorld }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  useEffect(() => {
    const id = setInterval(() => {
      const next = world.recentFeed();
      setItems((cur) => (cur.length === next.length && cur.every((c, i) => c.id === next[i].id) ? cur : next));
    }, 200);
    return () => clearInterval(id);
  }, [world]);
  if (!items.length) return <div className="battle-feed" aria-hidden="true" />;
  return (
    <ol className="battle-feed" aria-label="Battle feed">
      {items.slice(-2).map((f) => <li key={f.id} className={`feed-${f.tone}`}>{f.text}</li>)}
    </ol>
  );
}
