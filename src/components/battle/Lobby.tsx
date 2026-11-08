"use client";

import { useState } from "react";
import { ATTACK_ABILITIES, DEFENDER_ABILITIES, MAX_TEAM, ROUND_SECONDS, TEAMS, roundLabel, type BotLevel, type TeamId } from "@/game/battle/config";
import type { PublicRoom } from "@/lib/battle-types";
import { track } from "@/lib/analytics";
import { InvitePanel } from "./InvitePanel";
import { ReportButton } from "./ReportButton";

export function Lobby({ room, act, now, onHide = () => undefined }: { room: PublicRoom; act: (b: Record<string, unknown>) => Promise<boolean>; now: number; onHide?: () => void }) {
  const host = room.hostId === room.you;
  const me = room.players.find((p) => p.id === room.you);
  const [busy, setBusy] = useState(false);
  const run = async (b: Record<string, unknown>) => { setBusy(true); await act(b); setBusy(false); };
  const count = (t: TeamId) => room.players.filter((p) => p.team === t).length;
  const a = count("A"), b = count("B");
  const format = a && b ? `${a}v${b}` : "Waiting for players";

  const hostName = room.players.find((p) => p.id === room.hostId)?.name ?? "the host";
  // Presence: devices check in every few seconds; 30 s of silence = "away" (closed tab, lost signal).
  const away = (p: PublicRoom["players"][number]) => !p.bot && p.id !== room.you && !!now && now - (p.seenAt ?? 0) > 30_000;

  return (
    <div className="battle-lobby">
      <ol className="battle-steps" style={{ gridColumn: "1 / -1" }} aria-label="How a battle works">
        <li><b style={{ color: TEAMS.A.color }}>Round 1:</b> {TEAMS.A.name} collects shards; {TEAMS.B.name} sabotages them live.</li>
        <li><b style={{ color: TEAMS.B.color }}>Round 2:</b> roles swap. {TEAMS.B.name} must beat {TEAMS.A.name}&apos;s average.</li>
        <li><b>Win:</b> higher team average. A tie goes to a 90 s Sudden Surge.</li>
      </ol>
      <div className="battle-teams">
        {(["A", "B"] as TeamId[]).map((t) => (
          <section key={t} className="battle-team" style={{ borderColor: TEAMS[t].color }} aria-labelledby={`team-${t}`}>
            <header>
              <h2 id={`team-${t}`} style={{ color: TEAMS[t].color }}>{TEAMS[t].name}</h2>
              <span className="muted small">{count(t)}/{MAX_TEAM}</span>
            </header>
            <p className="small muted">{t === "A" ? "Defends round 1, attacks round 2." : "Attacks round 1, defends round 2."}</p>
            <ul className="battle-roster">
              {room.players.filter((p) => p.team === t).map((p) => (
                <li key={p.id} className="battle-chip" style={{ ["--pc" as string]: p.color }}>
                  <i aria-hidden="true" />
                  {!p.bot ? <b className="presence" data-away={away(p) || undefined} title={away(p) ? "Away" : "Connected"} aria-label={away(p) ? "away" : "connected"} /> : null}
                  <span>{p.name}{p.id === room.hostId ? " 👑" : ""}{p.id === room.you ? " (you)" : ""}</span>
                  {p.bot ? <small className="pill pill--soon">{p.bot}</small> : null}
                  {!p.bot && p.id !== room.you ? <ReportButton code={room.code} playerId={p.id} name={p.name} onHidden={onHide} /> : null}
                  {host && p.id !== room.you ? <button type="button" className="chip-x" aria-label={`Remove ${p.name}`} disabled={busy} onClick={() => void run({ action: "remove", playerId: p.id })}>×</button> : null}
                </li>
              ))}
              {count(t) === 0 ? <li className="small muted">Empty: an AI joins when the battle starts.</li> : null}
            </ul>
            <div className="btn-row">
              {me && me.team !== t && count(t) < MAX_TEAM ? <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void run({ action: "team", team: t })}>Switch here</button> : null}
              {host && count(t) < MAX_TEAM ? <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void run({ action: "addBot", team: t, level: room.botLevel })}>+ AI player</button> : null}
            </div>
          </section>
        ))}
      </div>

      <div className="battle-side">
        <div className="form-card">
          <p className="eyebrow">Match settings</p>
          <div className="field">
            <span className="label">Round length</span>
            <div className="mode-tabs" role="group" aria-label="Round length">
              {ROUND_SECONDS.map((s) => <button key={s} type="button" className="btn btn--sm" aria-pressed={room.seconds === s} disabled={!host || busy} onClick={() => void run({ action: "settings", seconds: s })}>{s === 90 ? "Quick 90 s" : roundLabel(s)}</button>)}
            </div>
          </div>
          <div className="field">
            <span className="label">AI difficulty</span>
            <div className="mode-tabs" role="group" aria-label="AI difficulty">
              {(["easy", "medium", "hard"] as BotLevel[]).map((l) => <button key={l} type="button" className="btn btn--sm" aria-pressed={room.botLevel === l} disabled={!host || busy} onClick={() => void run({ action: "settings", botLevel: l })}>{l[0].toUpperCase() + l.slice(1)}</button>)}
            </div>
          </div>
          <p className="small muted">Two rounds of {roundLabel(room.seconds)}: each team defends once. Higher average score per defender wins; a tie goes to a 90-second Sudden Surge.</p>
          {host ? (
            <button type="button" className="btn btn--primary battle-start" disabled={busy} onClick={() => { track("battle_started", { format }); void run({ action: "start" }); }}>
              Start battle · {a && b ? format : "AI fills empty team"}
            </button>
          ) : <p className="small" role="status"><span className="spinner" aria-hidden="true" /> Waiting for {hostName} to start · {format}. You&apos;re connected.</p>}
          <button type="button" className="btn btn--sm" style={{ marginTop: ".5rem" }} disabled={busy} onClick={() => void run({ action: "leave" })}>Leave room</button>
        </div>
        <InvitePanel code={room.code} />
        <details className="form-card battle-kit">
          <summary>Abilities & level-ups</summary>
          <h3>Defenders</h3>
          <ul>{DEFENDER_ABILITIES.map((x) => <li key={x.id}><b>{x.icon} {x.name}</b> ({x.cost}⚡{x.level > 1 ? `, level ${x.level}` : ""}): {x.blurb}</li>)}</ul>
          <p className="small muted">Level 2 at 2,500 points (unlocks Overdrive and Second Wind: once every 15 s a hit doesn&apos;t break a 3+ combo). Level 3 at 7,000 (Supernova).</p>
          <h3>Attackers</h3>
          <ul>{ATTACK_ABILITIES.map((x) => <li key={x.id}><b>{x.icon} {x.name}</b> ({x.cost}⚡{x.level > 1 ? `, level ${x.level}` : ""}{x.teamable ? ", can hit the whole team" : ", one target"}): {x.blurb}</li>)}</ul>
          <p className="small muted">Attackers level up with time and plays. Every attack is announced 3 seconds before it lands, so defenders can react. A knock-down costs your combo and a 1-second respawn.</p>
        </details>
      </div>
    </div>
  );
}
