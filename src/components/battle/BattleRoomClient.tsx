"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TPS } from "@/game/engine";
import { TEAMS } from "@/game/battle/config";
import type { PublicRoom, TickResponse } from "@/lib/battle-types";
import { track } from "@/lib/analytics";
import { api, dropSeat, getSeat, lastName, rememberName, saveSeat, type JoinResult } from "./net";
import { BattleWorld } from "./world";
import { Lobby } from "./Lobby";
import { ArenaView } from "./ArenaView";
import { CommandView } from "./CommandView";
import { Results } from "./Results";
import { BattleHelp } from "./BattleHelp";
import { Sfx } from "@/game/audio";

function readSound(): boolean {
  try { return localStorage.getItem("om_sound") !== "0"; } catch { return true; }
}

type Seat = { token: string; id: string };

export function BattleRoomClient({ code, preview }: { code: string; preview: { status: string; host: string | null; players: number } | null }) {
  const [seat, setSeat] = useState<Seat | null>(null);
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [clock, setClock] = useState(0);
  const [world, setWorld] = useState<BattleWorld | null>(null);
  const worldRef = useRef<BattleWorld | null>(null);
  const offsetRef = useRef<{ offset: number; rtt: number }>({ offset: 0, rtt: Infinity });
  const roomRef = useRef<PublicRoom | null>(null);
  const seatRef = useRef<Seat | null>(null);
  const failures = useRef(0);
  const sfx = useMemo(() => new Sfx(), []);
  const [sound, setSound] = useState(true);
  const lastCount = useRef<number | null>(null);
  const endPlayed = useRef<string | null>(null);

  // Sound preference is shared with the Daily Arena (om_sound). Audio starts only after a tap/key (browser rule).
  useEffect(() => {
    const id = requestAnimationFrame(() => setSound(readSound()));
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { cancelAnimationFrame(id); window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, [sfx]);
  useEffect(() => { sfx.setEnabled(sound); }, [sfx, sound]);

  // Countdown beeps, GO, and the end-of-battle jingle.
  useEffect(() => {
    const r = room;
    if (!r) return;
    if (r.status === "playing" && r.roundStartAt) {
      const left = Math.ceil((r.roundStartAt - clock) / 1000);
      if (left !== lastCount.current) {
        if (left >= 1 && left <= 3) sfx.tick();
        else if (left === 0 && lastCount.current === 1) sfx.go();
        lastCount.current = left;
      }
    }
    if (r.status === "done" && r.winner && endPlayed.current !== `${r.code}:${r.match}`) {
      endPlayed.current = `${r.code}:${r.match}`;
      const mine = r.players.find((p) => p.id === r.you)?.team;
      if (r.winner === "draw" || !mine) sfx.end(); else if (r.winner === mine) sfx.victory(); else sfx.defeat();
    }
  }, [clock, room, sfx]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current.offset, []);
  const nowTick = useCallback(() => {
    const r = roomRef.current;
    return r?.roundStartAt ? Math.floor(((serverNow() - r.roundStartAt) * TPS) / 1000) : -1;
  }, [serverNow]);

  const setRoomBoth = useCallback((r: PublicRoom) => {
    roomRef.current = r; setRoom(r);
    const rec = r.rounds.find((x) => x.n === r.round);
    const key = rec ? `${r.match}:${rec.n}` : null;
    const w = worldRef.current;
    if (!rec || rec.outcome || r.status !== "playing") { if (w && (!rec || `${r.match}:${w.round.n}` !== key)) { worldRef.current = null; setWorld(null); } return; }
    if (!w || `${r.match}:${w.round.n}` !== key || w.me !== r.you) { const nw = new BattleWorld(rec, r.you ?? ""); worldRef.current = nw; setWorld(nw); }
  }, []);

  // Re-claim a saved seat (refresh, reconnect) before showing the join form.
  useEffect(() => {
    const saved = getSeat(code);
    if (!saved) { const id = requestAnimationFrame(() => setChecking(false)); return () => cancelAnimationFrame(id); }
    void api<JoinResult>(`/api/battle/${code}`, { action: "join" }, saved.token).then((r) => {
      if (r.ok) { const s = { token: r.data.token, id: r.data.playerId }; seatRef.current = s; setSeat(s); setRoomBoth(r.data.room); }
      else if (r.status === 401 || r.status === 404) dropSeat(code);
      setChecking(false);
    });
  }, [code, setRoomBoth]);

  // The sync loop: one small request every 1.5 s while live.
  useEffect(() => {
    if (!seat) return;
    let alive = true, timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      if (!alive) return;
      const w = worldRef.current, r = roomRef.current;
      const chunk = w ? w.chunk(nowTick()) : null;
      const t0 = Date.now();
      const res = await api<TickResponse>(`/api/battle/${code}`, { action: "tick", v: r?.version, c: w?.cursors(), chunk }, seat.token);
      const t1 = Date.now();
      if (!alive) return;
      if (res.ok) {
        failures.current = 0; setNotice(null);
        const rtt = t1 - t0, o = offsetRef.current;
        // Keep the clock offset from the fastest round trip seen (least network noise).
        if (rtt < o.rtt * 1.3 || rtt < 150) offsetRef.current = { offset: res.data.now - (t0 + t1) / 2, rtt: Math.min(o.rtt, rtt) };
        if (chunk && res.data.upload?.ok) w?.confirmUpload(chunk);
        // Uploads refused as too late: stop driving; the server's takeover tick arrives with the lanes.
        if (res.data.upload && !res.data.upload.ok && res.data.upload.reason === "lost" && worldRef.current) worldRef.current.lost = true;
        if (res.data.room) setRoomBoth(res.data.room);
        worldRef.current?.applyLanes(res.data.lanes);
      } else if (res.status === 401 || res.status === 404) {
        dropSeat(code); setSeat(null); seatRef.current = null; setError(res.error); return;
      } else if (res.status !== 429) {
        failures.current++;
        if (failures.current >= 2) setNotice("Connection is unstable. Keep playing: your moves are saved and sent when it recovers.");
      }
      const st = roomRef.current;
      const live = st?.status === "playing";
      timer = setTimeout(loop, live ? 1500 : st?.status === "done" ? 5000 : 2200);
    };
    void loop();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [seat, code, nowTick, setRoomBoth]);

  // HUD refresh (the canvases animate on their own).
  useEffect(() => {
    const update = () => setClock(serverNow());
    const raf = requestAnimationFrame(update);
    const id = setInterval(update, 250);
    return () => { cancelAnimationFrame(raf); clearInterval(id); };
  }, [serverNow]);

  const act = useCallback(async (body: Record<string, unknown>) => {
    const s = seatRef.current;
    if (!s) return false;
    const r = await api<{ room: PublicRoom }>(`/api/battle/${code}`, body, s.token);
    if (!r.ok) { setError(r.error); return false; }
    setError(null);
    if (r.data.room) setRoomBoth(r.data.room);
    return true;
  }, [code, setRoomBoth]);

  if (checking) return <div className="battle-shell"><p className="muted" role="status"><span className="spinner" aria-hidden="true" /> Connecting to room {code}…</p></div>;
  if (!seat || !room) return <JoinGate code={code} preview={preview} error={error} onJoined={(r) => { const s = { token: r.token, id: r.playerId }; saveSeat(code, r.token, r.playerId); seatRef.current = s; setSeat(s); setRoomBoth(r.room); setError(null); track("battle_joined"); }} />;

  const me = room.players.find((p) => p.id === room.you);
  const rec = room.rounds.find((x) => x.n === room.round) ?? null;
  const now = clock;

  let body: React.ReactNode;
  if (room.status === "lobby") body = <Lobby room={room} act={act} />;
  else if (room.status === "done") body = <Results room={room} final act={act} code={code} />;
  else if (rec && room.roundStartAt && now < room.roundStartAt) {
    const left = Math.ceil((room.roundStartAt - now) / 1000);
    const role = !rec.attackers ? "defend" : me && rec.defenders.includes(me.team) ? "defend" : "attack";
    body = (
      <>
        {room.round > 1 ? <Results room={room} final={false} act={act} code={code} /> : null}
        <div className="battle-countdown" role="status" aria-live="assertive">
          <p className="eyebrow">{rec.n === 3 ? "Sudden Surge · tie-break" : `Round ${rec.n} of 2`}</p>
          <h2 className={`role-reveal role-${role}`}>{role === "defend" ? "You DEFEND" : "You ATTACK"}</h2>
          <p className="muted">{rec.n === 3 ? "Both teams collect. The arena attacks everyone. Highest average wins." : role === "defend" ? "Collect shards, chain combos, survive the sabotage." : "Sabotage the defenders: target one player or the whole team."}</p>
          <p className="countdown-num" key={left}>{left > 0 ? left : "GO"}</p>
        </div>
      </>
    );
  } else if (rec && !rec.outcome && world && room.roundStartAt) {
    const end = room.roundStartAt + rec.seconds * 1000;
    if (now > end + 1500) body = <div className="battle-countdown"><span className="spinner" aria-hidden="true" /><h2>Verifying every move…</h2><p className="muted">The server replays all inputs to produce the official result.</p></div>;
    else if (world.role !== "defender") body = <CommandView world={world} room={room} nowTick={nowTick} code={code} token={seat.token} onError={setError} sfx={sfx} readOnly={world.role === "spectator"} />;
    else body = <ArenaView world={world} room={room} nowTick={nowTick} sfx={sfx} />;
  } else body = <div className="battle-countdown"><span className="spinner" aria-hidden="true" /><p className="muted">Syncing…</p></div>;

  return (
    <div className="battle-shell">
      <div className="battle-topbar">
        <span className="pill pill--dev">Room {room.code}</span>
        {me ? <span className="battle-me"><i style={{ background: me.color }} />{me.name} · {TEAMS[me.team].name}</span> : null}
        {room.status === "playing" ? <ScoreTicker room={room} world={world} /> : null}
        <span className="battle-tools">
          <button type="button" className="help-btn" aria-pressed={sound} aria-label={sound ? "Sound on (tap to mute)" : "Sound off (tap to unmute)"} title={sound ? "Mute" : "Unmute"}
            onClick={() => { const v = !sound; setSound(v); try { localStorage.setItem("om_sound", v ? "1" : "0"); } catch { /* storage blocked */ } if (v) { sfx.setEnabled(true); sfx.unlock(); sfx.go(); } }}>{sound ? "🔊" : "🔇"}</button>
          <BattleHelp live={room.status === "playing"} role={world?.role === "defender" ? "defend" : world?.role === "attacker" ? "attack" : "rules"} />
        </span>
      </div>
      {notice ? <div className="notice" role="status">{notice}</div> : null}
      {error ? <div className="notice notice--err" role="alert">{error}</div> : null}
      {world?.lost ? <div className="notice" role="status">Connection lost for a moment: the AI is finishing this round for you. You&apos;re back in next round.</div> : null}
      {body}
    </div>
  );
}

function ScoreTicker({ room, world }: { room: PublicRoom; world: BattleWorld | null }) {
  const scores = useMemo(() => {
    const done: Record<string, { A: number; B: number }> = {};
    for (const r of room.rounds) if (r.outcome) done[r.n] = r.outcome.teamScore;
    return done;
  }, [room.rounds]);
  const live = world?.teamScore();
  const a = (scores[1]?.A ?? (room.round === 1 ? live?.A : undefined)) ?? 0;
  const b = (scores[2]?.B ?? (room.round === 2 ? live?.B : undefined)) ?? 0;
  return (
    <span className="battle-ticker" aria-label="Defending scores">
      <b style={{ color: TEAMS.A.color }}>{TEAMS.A.name} {a.toLocaleString("en-IN")}</b>
      <span className="muted"> vs </span>
      <b style={{ color: TEAMS.B.color }}>{b.toLocaleString("en-IN")} {TEAMS.B.name}</b>
    </span>
  );
}

function JoinGate({ code, preview, error, onJoined }: { code: string; preview: { status: string; host: string | null; players: number } | null; error: string | null; onJoined: (r: JoinResult) => void }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState<"A" | "B" | "">("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(error);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setName(lastName());
      const t = new URLSearchParams(window.location.search).get("team");
      if (t === "A" || t === "B") setTeam(t);
    });
    return () => cancelAnimationFrame(id);
  }, []);
  if (!preview) return <div className="battle-shell"><div className="form-card"><h2>Room not found</h2><p className="muted">Check the code, or create a new battle.</p><a className="btn btn--primary" href="/battle">Battle home</a></div></div>;
  return (
    <div className="battle-shell">
      <form className="form-card battle-join" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setMsg(null);
        const r = await api<JoinResult>(`/api/battle/${code}`, { action: "join", name, team: team || null });
        setBusy(false);
        if (!r.ok) { setMsg(r.error); return; }
        rememberName(name.trim());
        onJoined(r.data);
      }}>
        <p className="eyebrow">Battle invite · room {code}</p>
        <h2>{preview.host ? `${preview.host} invited you to battle` : "Join the battle"}</h2>
        <p className="muted">{preview.status === "lobby" ? `${preview.players} in the room. Pick a gamer tag and a team. No sign-up.` : "This battle has already started. Ask the host for a rematch invite."}</p>
        <div className="field">
          <label htmlFor="bt-name">Gamer tag</label>
          <input id="bt-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={16} minLength={3} required autoComplete="nickname" placeholder="3–16 characters" />
          <p className="hint">Shown to everyone in the room. Don&apos;t use your full real name.</p>
        </div>
        <div className="mode-tabs" role="group" aria-label="Team">
          <button type="button" className="btn btn--sm" aria-pressed={team === ""} onClick={() => setTeam("")}>Auto-balance</button>
          <button type="button" className="btn btn--sm" aria-pressed={team === "A"} onClick={() => setTeam("A")} style={{ borderColor: TEAMS.A.color }}>{TEAMS.A.name}</button>
          <button type="button" className="btn btn--sm" aria-pressed={team === "B"} onClick={() => setTeam("B")} style={{ borderColor: TEAMS.B.color }}>{TEAMS.B.name}</button>
        </div>
        {msg ? <div className="notice notice--err" role="alert">{msg}</div> : null}
        <button className="btn btn--primary" disabled={busy || preview.status !== "lobby"} type="submit">{busy ? "Joining…" : "Join battle"}</button>
      </form>
    </div>
  );
}
