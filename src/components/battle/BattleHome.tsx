"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUND_SECONDS, roundLabel, type BotLevel } from "@/game/battle/config";
import { track } from "@/lib/analytics";
import { BattleHelp } from "./BattleHelp";
import { api, lastName, rememberName, saveSeat, type JoinResult } from "./net";

/** Create a room or join one by code. Gamer tag only: no account, no email. */
export function BattleHome() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [seconds, setSeconds] = useState(90);
  const [bot, setBot] = useState<BotLevel>("medium");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | "quick" | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const id = requestAnimationFrame(() => setName(lastName())); return () => cancelAnimationFrame(id); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy("create"); setError(null);
    const r = await api<JoinResult>("/api/battle", { name, seconds, botLevel: bot });
    if (!r.ok) { setError(r.error); setBusy(null); return; }
    rememberName(name.trim());
    saveSeat(r.data.code, r.data.token, r.data.playerId);
    track("battle_created", { seconds });
    router.push(`/b/${r.data.code}`);
  }

  /** One tap to a live match: 1v1 vs AI, Quick 90 s rounds. The fastest way to "get" Battle. */
  async function quick() {
    setBusy("quick"); setError(null);
    const tag = name.trim().length >= 3 ? name.trim() : `Player${100 + Math.floor(Math.random() * 900)}`;
    const r = await api<JoinResult>("/api/battle", { name: tag, seconds: 90, botLevel: bot });
    if (!r.ok) { setError(r.error); setBusy(null); return; }
    rememberName(tag);
    saveSeat(r.data.code, r.data.token, r.data.playerId);
    const add = await api(`/api/battle/${r.data.code}`, { action: "addBot", team: "B", level: bot }, r.data.token);
    if (add.ok) await api(`/api/battle/${r.data.code}`, { action: "start" }, r.data.token);
    track("battle_created", { seconds: 90, quick: true });
    router.push(`/b/${r.data.code}`);
  }

  return (
    <div className="battle-home">
      <section className="form-card battle-quick" aria-labelledby="bh-quick">
        <h2 id="bh-quick" style={{ margin: 0 }}>Play right now</h2>
        <p className="muted">1v1 against an AI rival with Quick 90-second rounds. You defend first, then attack. No sign-up.</p>
        <button type="button" className="btn btn--primary" disabled={!!busy} onClick={() => void quick()}>{busy === "quick" ? "Starting…" : "⚡ Quick match vs AI"}</button>
      </section>
      <form className="form-card" onSubmit={create} aria-labelledby="bh-create">
        <div className="help-row"><h2 id="bh-create" style={{ margin: 0 }}>Create a battle</h2><BattleHelp /></div>
        <div className="field">
          <label htmlFor="bh-name">Your gamer tag</label>
          <input id="bh-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={16} autoComplete="nickname" placeholder="3–16 characters" />
        </div>
        <div className="field">
          <span className="label">Round length</span>
          <div className="mode-tabs" role="group" aria-label="Round length">
            {ROUND_SECONDS.map((s) => <button key={s} type="button" className="btn btn--sm" aria-pressed={seconds === s} onClick={() => setSeconds(s)}>{s === 90 ? "Quick 90 s" : roundLabel(s)}</button>)}
          </div>
        </div>
        <div className="field">
          <span className="label">AI difficulty (fills empty seats)</span>
          <div className="mode-tabs" role="group" aria-label="AI difficulty">
            {(["easy", "medium", "hard"] as BotLevel[]).map((l) => <button key={l} type="button" className="btn btn--sm" aria-pressed={bot === l} onClick={() => setBot(l)}>{l[0].toUpperCase() + l.slice(1)}</button>)}
          </div>
        </div>
        {error && busy !== "join" && busy !== "quick" ? <div className="notice notice--err" role="alert">{error}</div> : null}
        <button className="btn btn--primary" type="submit" disabled={!!busy}>{busy === "create" ? "Creating…" : "Create room & invite friends"}</button>
        <p className="small muted">Play 1v1, 1 vs many, with AI teammates or against AI only. Up to 5 per team.</p>
      </form>
      <form className="form-card" aria-labelledby="bh-join" onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        if (!/^[A-HJ-KM-NP-Z2-9]{6}$/.test(c)) { setError("Room codes are 6 letters/numbers (no 0, O, 1, I or L)."); setBusy(null); return; }
        setBusy("join"); router.push(`/b/${c}`);
      }}>
        <h2 id="bh-join" style={{ marginTop: 0 }}>Join with a code</h2>
        <div className="field">
          <label htmlFor="bh-code">Room code</label>
          <input id="bh-code" className="input battle-code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} autoCapitalize="characters" autoComplete="off" placeholder="ABC123" />
        </div>
        {error && busy !== "create" ? <div className="notice notice--err" role="alert">{error}</div> : null}
        <button className="btn" type="submit" disabled={!!busy}>Join room</button>
      </form>
    </div>
  );
}

export type { JoinResult };
