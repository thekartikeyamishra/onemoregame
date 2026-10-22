"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { CommunityPrompt, markCommunityShown, shouldShowCommunity } from "@/components/CommunityPrompt";
import { ShareResult, shareText } from "@/components/ShareResult";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Sfx } from "./audio";
import { ENGINE_VERSION, type InputLog, type RunResult, type TwistId } from "./engine";
import dynamic from "next/dynamic";
import type { RunEnd } from "./GameCanvas";

// The renderer is only needed once a run starts: load it as its own chunk (smaller initial JS on /play).
const GameCanvas = dynamic(() => import("./GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <div className="game-stage skeleton" aria-busy="true" aria-label="Loading the arena" />,
});

type Mode = "quick" | "daily" | "challenge";
type TwistInfo = { id: TwistId; name: string; description: string };
type Start = { runId: string; seed: number; mode: Mode; day: string | null; target: number | null; twist: TwistInfo; ghost: InputLog | null; ghostName: string | null };
type Saved = { personalBest: number | null; newBest: boolean; target: number | null; beat: boolean | null; ranked: boolean; unrankedReason: string | null; streak: number | null; guest: boolean } | null;
type Phase =
  | { kind: "menu" }
  | { kind: "starting" }
  | { kind: "playing"; run: Start; key: number }
  | { kind: "result"; run: Start; result: RunResult; inputs: InputLog; saved: Saved; saveError: string | null };

interface Props {
  /** Signed-in player; null for a guest (today's Daily Arena and friend challenges only). */
  player: { displayName: string | null; bestScore: number; streak: number } | null;
  challenge?: { id: string; score: number; by: string | null; referralCode: string | null; hasGhost: boolean; twist: TwistInfo } | null;
  /** Today's Daily twist, shown before playing. */
  dailyTwist?: TwistInfo | null;
}

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: data as T } : { ok: false, error: (data as { error?: string }).error ?? "Something went wrong." };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection." };
  }
}

function readPref(key: string, fallback: boolean) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === "1"; } catch { return fallback; }
}
function writePref(key: string, v: boolean) {
  try { localStorage.setItem(key, v ? "1" : "0"); } catch { /* storage blocked */ }
}

export function PlayClient({ player, challenge = null, dailyTwist = null }: Props) {
  const sfx = useMemo(() => new Sfx(), []);
  const [phase, setPhase] = useState<Phase>({ kind: "menu" });
  const [mode, setMode] = useState<Mode>(challenge ? "challenge" : player ? "quick" : "daily");
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [best, setBest] = useState(player?.bestScore ?? 0);
  const [streak, setStreak] = useState(player?.streak ?? 0);
  const [runsThisVisit, setRunsThisVisit] = useState(0);
  const [lbVersion, setLbVersion] = useState(0);
  const keyRef = useRef(0);

  useEffect(() => {
    // Load stored preferences after mount (avoids hydration mismatch).
    const id = requestAnimationFrame(() => {
      setSound(readPref("om_sound", true));
      setReduced(readPref("om_reduced", window.matchMedia("(prefers-reduced-motion: reduce)").matches));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => { sfx.setEnabled(sound); }, [sfx, sound]);

  const start = useCallback(async (m: Mode) => {
    sfx.unlock();
    setError(null);
    setPhase({ kind: "starting" });
    const r = await post<Start>("/api/game/start", { mode: m, challengeId: challenge?.id });
    if (!r.ok) { setError(r.error); setPhase({ kind: "menu" }); return; }
    keyRef.current++;
    setPhase({ kind: "playing", run: r.data, key: keyRef.current });
  }, [challenge?.id, sfx]);

  const onEnd = useCallback(async (run: Start, end: RunEnd) => {
    setRunsThisVisit((n) => n + 1);
    track("first_game_completed", { mode: run.mode });
    setPhase({ kind: "result", run, result: end.result, inputs: end.log, saved: null, saveError: null });
    const r = await post<NonNullable<Saved>>("/api/game/finish", { runId: run.runId, inputs: end.log, score: end.result.score, version: ENGINE_VERSION });
    if (r.ok) {
      if (r.data.personalBest !== null) setBest(r.data.personalBest);
      if (r.data.streak !== null) setStreak(r.data.streak);
      if (run.mode === "daily") setLbVersion((v) => v + 1);
    }
    setPhase((p) => (p.kind === "result" && p.run.runId === run.runId ? { ...p, saved: r.ok ? r.data : null, saveError: r.ok ? null : r.error } : p));
  }, []);

  // "R" for one more from the result screen.
  useEffect(() => {
    if (phase.kind !== "result") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) void start(phase.run.mode);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start]);

  if (phase.kind === "playing") {
    return (
      <GameCanvas
        key={phase.key} seed={phase.run.seed} twist={phase.run.twist.id} ghost={phase.run.ghost} ghostName={phase.run.ghostName ?? challenge?.by ?? null}
        sfx={sfx} reducedEffects={reduced}
        onEnd={(e) => void onEnd(phase.run, e)} onQuit={() => setPhase({ kind: "menu" })}
      />
    );
  }

  if (phase.kind === "result") {
    return <Result phase={phase} best={best} streak={streak} isGuest={!player} challenge={challenge} runsThisVisit={runsThisVisit} onAgain={() => void start(phase.run.mode)} onMenu={() => setPhase({ kind: "menu" })} />;
  }

  return (
    <div className="play-layout">
      <div className="form-card">
        {challenge ? (
          <>
            <p className="eyebrow">Friend challenge</p>
            <h2 style={{ fontSize: "var(--step-3)" }}>{challenge.by ?? "A friend"} scored <span style={{ color: "var(--amber)" }}>{challenge.score.toLocaleString("en-IN")}</span></h2>
            <p className="muted">Same arena, same hazards. Sixty seconds to beat it.{challenge.hasGhost ? " Their ghost races alongside you, so you'll see exactly where you're ahead or behind." : ""}</p>
            {challenge.twist.id !== "classic" ? <p className="small"><span className="pill pill--soon">{challenge.twist.name}</span> {challenge.twist.description}</p> : null}
          </>
        ) : !player ? (
          <>
            <p className="eyebrow">Daily Arena · free to play</p>
            <h2 style={{ fontSize: "var(--step-3)" }}>Today&apos;s arena</h2>
            <p className="muted">Everyone gets the same arena today (it resets at midnight IST). Sixty seconds. Play now, no sign-up. Confirm your email afterwards to save your score to the leaderboard and unlock Quick Play.</p>
            {dailyTwist ? <TwistBadge twist={dailyTwist} /> : null}
          </>
        ) : (
          <>
            <p className="eyebrow">Playtest</p>
            <h2 style={{ fontSize: "var(--step-3)" }}>Choose a mode</h2>
            <div className="mode-tabs" role="group" aria-label="Mode">
              <button type="button" className="btn btn--sm" aria-pressed={mode === "quick"} onClick={() => setMode("quick")}>Quick Play</button>
              <button type="button" className="btn btn--sm" aria-pressed={mode === "daily"} onClick={() => setMode("daily")}>Daily Arena</button>
            </div>
            <p className="muted" style={{ marginTop: "1rem" }}>
              {mode === "quick" ? "A fresh random arena every run, classic rules. Practice and chase your personal best." : "Today's shared arena (resets at midnight IST). Your best run today goes on the leaderboard."}
            </p>
            {mode === "daily" && dailyTwist ? <TwistBadge twist={dailyTwist} /> : null}
          </>
        )}
        {error ? <div className="notice notice--err" role="alert"><strong>Couldn&apos;t start</strong>{error}</div> : null}
        <button type="button" className="btn btn--primary" style={{ minWidth: 200 }} disabled={phase.kind === "starting"} onClick={() => void start(mode)}>
          {phase.kind === "starting" ? (<><span className="spinner" aria-hidden="true" /> Loading…</>) : "Play"}
        </button>
        <div className="stat-grid">
          {player ? <div className="stat"><b>{best.toLocaleString("en-IN")}</b><span>Personal best</span></div> : null}
          {player ? <div className="stat"><b className={streak > 1 ? "streak" : undefined}>{streak > 0 ? `🔥 ${streak}` : "—"}</b><span>Daily streak</span></div> : null}
          <div className="stat"><b>60s</b><span>Per run</span></div>
        </div>
        <details>
          <summary className="small" style={{ cursor: "pointer" }}>Controls &amp; settings</summary>
          <ul className="small muted" style={{ marginTop: ".75rem" }}>
            <li>Steer: <span className="kbd">WASD</span> / arrows, move the mouse, or drag on touch.</li>
            <li>Dash (brief invulnerability, 2 s cooldown): <span className="kbd">Space</span>, click, double-tap or the Dash button.</li>
            <li>Power-ups (hexagons): <b>◯ Shield</b> blocks one hit · <b>◷ Slow-mo</b> halves hazard speed · <b>U Magnet</b> pulls nearby shards · <b>×2 Double</b> doubles points.</li>
            <li>Pause: <span className="kbd">Esc</span> / <span className="kbd">P</span>. One more: <span className="kbd">R</span> on the results screen.</li>
          </ul>
          <label className="check"><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); writePref("om_sound", e.target.checked); }} /><span>Sound effects</span></label>
          <label className="check"><input type="checkbox" checked={reduced} onChange={(e) => { setReduced(e.target.checked); writePref("om_reduced", e.target.checked); }} /><span>Reduce effects (no shake or glow, fewer particles)</span></label>
        </details>
      </div>
      {!challenge ? (
        <aside className="grid" style={{ gap: "1.5rem" }}>
          {player ? <NameForm initial={player.displayName} /> : null}
          <Leaderboard version={lbVersion} />
        </aside>
      ) : null}
    </div>
  );
}

const UNRANKED: Record<string, string> = {
  "paused-too-long": "the run took much longer than real time (long pauses)",
  "duplicate-inputs": "identical inputs were already submitted by another player",
  "leaderboard-banned": "leaderboard access removed under the Fair Play rules",
};

function Result({ phase, best, streak, isGuest, challenge, runsThisVisit, onAgain, onMenu }: {
  phase: Extract<Phase, { kind: "result" }>; best: number; streak: number; isGuest: boolean; challenge: Props["challenge"]; runsThisVisit: number; onAgain: () => void; onMenu: () => void;
}) {
  const { result, saved, saveError, run } = phase;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const target = saved?.target ?? run.target;
  const beat = target !== null ? result.score > target : null;
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const shownStreak = saved?.streak ?? (isGuest ? null : streak);
  const highMoment = beat === true || !!saved?.newBest || (shownStreak ?? 0) >= 2;
  // Decide once per result screen whether to show the community prompt (reads browser storage, so after mount).
  const [community, setCommunity] = useState<null | "best" | "beat" | "streak" | "regular">(null);
  useEffect(() => {
    if (!saved) return;
    const id = requestAnimationFrame(() => {
      if (shouldShowCommunity({ runsThisVisit, highMoment })) {
        markCommunityShown();
        setCommunity(beat === true ? "beat" : saved.newBest ? "best" : (shownStreak ?? 0) >= 2 ? "streak" : "regular");
      }
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  const makeChallenge = async () => {
    const r = await post<{ url: string }>("/api/game/challenge", { runId: run.runId, inputs: phase.inputs });
    if (r.ok) { setChallengeUrl(r.data.url); return r.data.url; }
    return null;
  };
  return (
    <div className="play-layout">
      <div className="form-card" aria-live="polite">
        <p className="eyebrow">{run.mode === "daily" ? `Daily Arena · ${run.day}` : run.mode === "challenge" ? "Friend challenge" : "Quick Play"}</p>
        <h2 ref={headingRef} tabIndex={-1} style={{ fontSize: "var(--step-2)", outline: "none" }}>
          {beat === true ? "You beat it!" : beat === false ? `${(target! - result.score + 1).toLocaleString("en-IN")} short. One more?` : saved?.newBest ? "New personal best!" : "Run complete"}
        </h2>
        <p className="big-score">{result.score.toLocaleString("en-IN")}</p>
        <div className="stat-grid">
          <div className="stat"><b>{result.pickups}</b><span>Shards</span></div>
          <div className="stat"><b>×{result.maxCombo}</b><span>Best combo</span></div>
          <div className="stat"><b>{result.hits}</b><span>Hits</span></div>
          <div className="stat"><b>{result.powerUps}</b><span>Power-ups</span></div>
          {!isGuest ? <div className="stat"><b>{best.toLocaleString("en-IN")}</b><span>Personal best</span></div> : null}
          {shownStreak && shownStreak > 0 ? <div className="stat"><b className="streak">🔥 {shownStreak}</b><span>Daily streak</span></div> : null}
        </div>
        {saveError ? <div className="notice notice--err" role="alert"><strong>Not recorded</strong>{saveError}</div> : saved === null ? <p className="small muted" role="status">Verifying score…</p> : <p className="small muted">Score verified by replay ✓{run.mode === "daily" ? (saved.ranked ? " · on today's leaderboard if it's your best" : saved.unrankedReason === "guest" ? " · confirm your email below to put it on the leaderboard" : ` · not ranked: ${UNRANKED[saved.unrankedReason ?? ""] ?? "see Fair Play"}`) : ""}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" autoFocus onClick={onAgain}>One more <span className="kbd" aria-hidden="true" style={{ marginLeft: 6 }}>R</span></button>
          {!isGuest ? <button type="button" className="btn" onClick={onMenu}>Modes</button> : null}
        </div>
        {saved ? (
          <ShareResult
            text={shareText({ mode: run.mode, day: run.day, twist: run.twist.id === "classic" ? null : run.twist.name, score: result.score, pickups: result.pickups, maxCombo: result.maxCombo, powerUps: result.powerUps, streak: shownStreak, beat, target })}
            url={challengeUrl}
            onNeedUrl={makeChallenge}
          />
        ) : null}
        {isGuest && saved ? <GuestClaim runId={run.runId} score={result.score} canRank={run.mode === "daily" && saved.unrankedReason === "guest" && result.score > 0} referralCode={challenge?.referralCode ?? null} /> : null}
        {community ? <CommunityPrompt reason={community} /> : null}
        {runsThisVisit === 1 || runsThisVisit === 3 ? <Feedback runId={run.runId} /> : null}
      </div>
    </div>
  );
}

function TwistBadge({ twist }: { twist: TwistInfo }) {
  return (
    <p className="small" style={{ marginTop: "-.25rem" }}>
      <span className={`pill ${twist.id === "classic" ? "pill--dev" : "pill--soon"}`}>Today: {twist.name}</span> <span className="muted">{twist.description}</span>
    </p>
  );
}

function GuestClaim({ runId, score, canRank, referralCode }: { runId: string; score: number; canRank: boolean; referralCode: string | null }) {
  return (
    <div className="form-card" style={{ marginTop: "1.5rem", background: "var(--ink-900)" }}>
      <h3 style={{ marginTop: 0 }}>{canRank ? `Save your ${score.toLocaleString("en-IN")} to today's leaderboard` : "Keep your scores"}</h3>
      <p className="small muted">Confirm your email to {canRank ? "put this run on the leaderboard, " : ""}track your best and streak, unlock Quick Play, and challenge friends under your own name. No password.</p>
      <WaitlistForm claimRunId={runId} referralCode={referralCode} compact />
    </div>
  );
}

function Feedback({ runId }: { runId: string }) {
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  if (sent) return <p className="small muted" role="status" style={{ marginTop: "1.5rem" }}>Thanks — that genuinely shapes what we build next.</p>;
  return (
    <fieldset className="field" style={{ marginTop: "1.5rem", borderTop: "1px solid var(--line)", paddingTop: "1.25rem" }}>
      <legend style={{ paddingTop: "1.25rem" }}>Quick question: would you come back to play tomorrow?</legend>
      <div className="choices">
        <label className="choice"><input type="radio" name="fb" onChange={() => setAnswer(true)} /><span>Yes</span></label>
        <label className="choice"><input type="radio" name="fb" onChange={() => setAnswer(false)} /><span>Probably not</span></label>
      </div>
      {answer !== null ? (
        <>
          <label className="sr-only" htmlFor="fb-note">Anything to add? (optional)</label>
          <textarea id="fb-note" className="textarea" placeholder="What would make you play one more? (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 80 }} />
          <button type="button" className="btn btn--sm" onClick={async () => { await post("/api/game/feedback", { runId, wouldReplay: answer, note }); setSent(true); }}>Send</button>
        </>
      ) : null}
    </fieldset>
  );
}

function NameForm({ initial }: { initial: string | null }) {
  const [name, setName] = useState(initial ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form className="form-card" onSubmit={async (e) => {
      e.preventDefault();
      const r = await post<{ displayName: string }>("/api/game/profile", { displayName: name });
      setMsg(r.ok ? { ok: true, text: "Saved. It shows on leaderboards and challenges." } : { ok: false, text: r.error });
    }}>
      <div className="field" style={{ marginBottom: ".75rem" }}>
        <label htmlFor="display-name">Leaderboard name</label>
        <input id="display-name" className="input" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="3–16 characters" aria-describedby="dn-msg" />
        <p id="dn-msg" className={msg && !msg.ok ? "field-error" : "hint"} role="status">{msg?.text ?? "Don't use your real full name or email."}</p>
      </div>
      <button className="btn btn--sm" type="submit">Save name</button>
    </form>
  );
}

function Leaderboard({ version }: { version: number }) {
  const [data, setData] = useState<{ day: string; entries: Array<{ rank: number; name: string; score: number; me: boolean }>; myScore: number | null } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/game/leaderboard").then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (live) { setData(d); setFailed(false); } }).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [version]);
  return (
    <section className="form-card" aria-labelledby="lb-h">
      <h2 id="lb-h" style={{ fontSize: "var(--step-1)" }}>Today&apos;s Daily Arena</h2>
      {failed ? <p className="small muted">Leaderboard unavailable right now.</p> : !data ? (
        <div aria-busy="true" aria-label="Loading leaderboard">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
      ) : data.entries.length === 0 ? (
        <p className="small muted">No scores yet today. Set the first one.</p>
      ) : (
        <table className="lb">
          <thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col">Score</th></tr></thead>
          <tbody>{data.entries.map((e) => <tr key={e.rank} data-me={e.me}><td>{e.rank}</td><td>{e.name}{e.me ? " (you)" : ""}</td><td>{e.score.toLocaleString("en-IN")}</td></tr>)}</tbody>
        </table>
      )}
      {data?.myScore != null && !data.entries.some((e) => e.me) ? <p className="small muted">Your best today: {data.myScore.toLocaleString("en-IN")}</p> : null}
    </section>
  );
}
