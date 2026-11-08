"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAMS, type TeamId } from "@/game/battle/config";
import type { PublicRoom } from "@/lib/battle-types";
import { socials } from "@/lib/socials";
import { track } from "@/lib/analytics";
import { shareContent } from "@/lib/native";
import { api, getSeat } from "./net";
import { ReportButton } from "./ReportButton";

interface Line { id: string; name: string; color: string; team: TeamId; bot: boolean; points: number; kos: number; combo: number; abilities: number; attacks: number; caused: number }

export function Results({ room, final, act, code, onHide = () => undefined }: { room: PublicRoom; final: boolean; act: (b: Record<string, unknown>) => Promise<boolean>; code: string; onHide?: () => void }) {
  const done = room.rounds.filter((r) => r.outcome);
  const lines = useMemo(() => {
    const m = new Map<string, Line>();
    for (const p of room.players) m.set(p.id, { id: p.id, name: p.name, color: p.color, team: p.team, bot: !!p.bot, points: 0, kos: 0, combo: 0, abilities: 0, attacks: 0, caused: 0 });
    for (const r of done) {
      for (const [id, d] of Object.entries(r.outcome!.defenders)) { const l = m.get(id); if (l) { l.points += d.score; l.kos += d.hits; l.combo = Math.max(l.combo, d.maxCombo); l.abilities += d.abilities; } }
      for (const [id, a] of Object.entries(r.outcome!.attackers)) { const l = m.get(id); if (l) { l.attacks += a.plays; l.caused += a.hitsCaused; } }
    }
    return [...m.values()].sort((a, b) => b.points - a.points);
  }, [room.players, done]);
  const maxPts = Math.max(1, ...lines.map((l) => l.points));
  const top = (f: (l: Line) => number, min = 1) => { const best = [...lines].sort((a, b) => f(b) - f(a))[0]; return best && f(best) >= min ? best : null; };
  const mvp = { scorer: top((l) => l.points), wrecker: top((l) => l.caused), combo: top((l) => l.combo, 3), iron: [...lines].filter((l) => l.points > 0).sort((a, b) => a.kos - b.kos)[0] ?? null };
  const host = room.hostId === room.you;
  const me = lines.find((l) => l.id === room.you);
  const winner = room.winner;

  useEffect(() => { if (final) track("battle_finished", { winner: winner ?? "none" }); }, [final, winner]);

  const shareText = me
    ? `ONE MORE Battle: ${winner === "draw" ? "it was a draw" : winner ? `${TEAMS[winner].name} won` : "round done"}. I scored ${me.points.toLocaleString("en-IN")} and caused ${me.caused} KOs. Think you can beat my team?`
    : "ONE MORE Battle";

  return (
    <div className={`battle-results${final ? " final" : ""}`}>
      {final ? (
        <div className="battle-winner" style={{ ["--wc" as string]: winner && winner !== "draw" ? TEAMS[winner].color : "#eef1fa" }}>
          {winner && winner !== "draw" ? <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div> : null}
          <p className="eyebrow">Battle over</p>
          <h2>{winner === "draw" ? "It's a draw!" : winner ? `${TEAMS[winner].name} wins!` : "Battle over"}</h2>
          {me && winner && winner !== "draw" ? <p className="muted">{me.team === winner ? "Victory. Flex responsibly." : "So close. Rematch?"}</p> : null}
        </div>
      ) : <p className="eyebrow">Round {done.length} result</p>}

      <div className="battle-rounds">
        {done.map((r) => (
          <div key={r.n} className="form-card battle-round">
            <p className="eyebrow">{r.n === 3 ? "Sudden Surge" : `Round ${r.n}`}</p>
            {r.n === 3
              ? <p><b style={{ color: TEAMS.A.color }}>{r.outcome!.teamScore.A.toLocaleString("en-IN")}</b> vs <b style={{ color: TEAMS.B.color }}>{r.outcome!.teamScore.B.toLocaleString("en-IN")}</b></p>
              : <p><b style={{ color: TEAMS[r.defenders[0]].color }}>{TEAMS[r.defenders[0]].name}</b> defended: <b>{r.outcome!.teamScore[r.defenders[0]].toLocaleString("en-IN")}</b> avg</p>}
          </div>
        ))}
      </div>

      <section className="form-card" aria-labelledby="flex-h">
        <h3 id="flex-h" style={{ marginTop: 0 }}>Flex board</h3>
        <div className="battle-badges">
          {mvp.scorer ? <span className="badge">🏆 Top scorer: <b>{mvp.scorer.name}</b></span> : null}
          {mvp.wrecker ? <span className="badge">💥 Wrecker: <b>{mvp.wrecker.name}</b> ({mvp.wrecker.caused} KOs)</span> : null}
          {mvp.iron ? <span className="badge">🛡 Iron: <b>{mvp.iron.name}</b> ({mvp.iron.kos} KOs taken)</span> : null}
          {mvp.combo ? <span className="badge">🔥 Combo: <b>{mvp.combo.name}</b> ×{mvp.combo.combo}</span> : null}
        </div>
        <svg className="battle-chart" viewBox={`0 0 400 ${lines.length * 30 + 8}`} role="img" aria-label="Points per player">
          {lines.map((l, i) => (
            <g key={l.id} transform={`translate(0 ${i * 30 + 4})`}>
              <text x="0" y="17" className="bc-name">{l.name.slice(0, 14)}</text>
              <rect x="120" y="4" height="18" rx="4" width={Math.max(2, (l.points / maxPts) * 210)} fill={l.color} className="bc-bar" style={{ animationDelay: `${i * 80}ms` }} />
              <text x={124 + Math.max(2, (l.points / maxPts) * 210)} y="17" className="bc-val">{l.points.toLocaleString("en-IN")}</text>
            </g>
          ))}
        </svg>
        <div className="table-wrap"><table className="lb">
          <thead><tr><th scope="col">Player</th><th scope="col">Points</th><th scope="col">KOs taken</th><th scope="col">KOs caused</th><th scope="col">Best combo</th><th scope="col">Abilities</th><th scope="col">Attacks</th></tr></thead>
          <tbody>{lines.map((l) => (
            <tr key={l.id} data-me={l.id === room.you}>
              <td><i className="dot" style={{ background: l.color }} /> {l.name}{!l.bot && l.id !== room.you && final ? <ReportButton code={code} playerId={l.id} name={l.name} onHidden={onHide} /> : null}</td>
              <td>{l.points.toLocaleString("en-IN")}</td><td>{l.kos}</td><td>{l.caused}</td><td>×{l.combo}</td><td>{l.abilities}</td><td>{l.attacks}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="small muted">Every number comes from the server&apos;s replay of all inputs.</p>
      </section>

      {final ? (
        <>
          <div className="btn-row">
            {host ? <button type="button" className="btn btn--primary" onClick={() => void act({ action: "rematch" })}>Rematch (same room)</button> : <p className="small muted">Waiting for the host to start a rematch…</p>}
            <ShareButton text={shareText} code={code} />
            <a className="btn" href="/battle">New battle</a>
          </div>
          <DiscordCta />
          <BattleFeedback code={code} />
        </>
      ) : null}
    </div>
  );
}

function ShareButton({ text, code }: { text: string; code: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button type="button" className="btn" onClick={async () => {
        const url = `${window.location.origin}/b/${code}`;
        track("battle_invite_shared", { via: "result" });
        const how = await shareContent({ title: "ONE MORE Battle", text, url });
        if (how === "copied") setMsg("Copied!");
      }}>Share result</button>
      {msg ? <span className="small muted" role="status">{msg}</span> : null}
    </>
  );
}

/** Shown once per browser session after a battle, dismissible. */
function DiscordCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => { try { if (!sessionStorage.getItem("om_battle_discord")) setShow(true); } catch { setShow(true); } });
    return () => cancelAnimationFrame(id);
  }, []);
  if (!show) return null;
  const close = () => { try { sessionStorage.setItem("om_battle_discord", "1"); } catch { /* ignore */ } setShow(false); };
  return (
    <aside className="form-card battle-discord" aria-label="Community">
      <button type="button" className="chip-x" aria-label="Dismiss" onClick={close}>×</button>
      <p className="eyebrow">Find your squad</p>
      <p>Need teammates for 5v5? The Discord has battle nights, team finder and the weekly cup.</p>
      <a className="btn btn--primary btn--sm" href={socials.discord.href} target="_blank" rel="noopener noreferrer" onClick={() => { track("social_clicked", { id: "discord", from: "battle" }); close(); }}>Join the ONE MORE Discord</a>
    </aside>
  );
}

/** One tap, at most once a day. */
function BattleFeedback({ code }: { code: string }) {
  const [state, setState] = useState<"hidden" | "ask" | "note" | "done">("hidden");
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try { const last = Number(localStorage.getItem("om_battle_fb") ?? 0); if (Date.now() - last > 864e5) setState("ask"); } catch { setState("ask"); }
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const send = async (r: number, n = "") => {
    const seat = getSeat(code);
    try { localStorage.setItem("om_battle_fb", String(Date.now())); } catch { /* ignore */ }
    if (seat) await api(`/api/battle/${code}`, { action: "feedback", rating: r, note: n }, seat.token);
  };
  if (state === "hidden") return null;
  if (state === "done") return <p className="small muted" role="status">Thanks! It shapes the next update.</p>;
  return (
    <div className="battle-feedback">
      {state === "ask" ? (
        <>
          <span className="small">How was this battle?</span>
          {[["😍", 3], ["🙂", 2], ["😐", 1]].map(([e, r]) => <button key={r} type="button" className="emoji-btn" aria-label={`Rating ${r} of 3`} onClick={() => { setRating(r as number); if (r === 3) { void send(3); setState("done"); } else setState("note"); }}>{e}</button>)}
          <button type="button" className="chip-x" aria-label="Not now" onClick={() => { try { localStorage.setItem("om_battle_fb", String(Date.now())); } catch { /* ignore */ } setState("hidden"); }}>×</button>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void send(rating, note); setState("done"); }}>
          <label className="small" htmlFor="bfb">What would make it better? (optional)</label>
          <input id="bfb" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn btn--sm" type="submit">Send</button>
        </form>
      )}
    </div>
  );
}
