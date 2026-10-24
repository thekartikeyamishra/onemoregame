"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { CommunityPrompt, markCommunityShown, shouldShowCommunity } from "@/components/CommunityPrompt";
import { ShareResult, shareText } from "@/components/ShareResult";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Sfx } from "./audio";
import { ENGINE_VERSION, type InputLog, type Rules, type RunResult, type TwistId } from "./engine";
import dynamic from "next/dynamic";
import type { RunEnd } from "./GameCanvas";

// The renderer is only needed once a run starts: load it as its own chunk (smaller initial JS on /play).
const GameCanvas = dynamic(() => import("./GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <div className="game-stage skeleton" aria-busy="true" aria-label="Loading the arena" />,
});

type Mode = "quick" | "daily" | "challenge" | "level";
type TwistInfo = { id: TwistId; name: string; description: string };
type LevelInfo = { n: number; name: string; description: string; target: number; stars: readonly number[] };
export type LevelSummary = LevelInfo & { kind: string; seconds: number };
export type LevelProgress = { unlocked: number; best: Record<string, number> };
type LevelResult = { n: number; target: number; stars: number; passed: boolean; unlocked: number; best: number };
type Start = { runId: string; seed: number; mode: Mode; day: string | null; target: number | null; twist: TwistInfo; ghost: InputLog | null; ghostName: string | null; level: LevelInfo | null; rules: Partial<Rules> };
type Saved = { personalBest: number | null; newBest: boolean; target: number | null; beat: boolean | null; ranked: boolean; unrankedReason: string | null; streak: number | null; guest: boolean; level: LevelResult | null } | null;

function starCount(stars: readonly number[], score: number) { return stars.filter((t) => score >= t).length; }
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
  /** Levels mode: the fixed level table and the player's saved progress (guests: level 1 only). */
  levels?: LevelSummary[];
  levelProgress?: LevelProgress | null;
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

export function PlayClient({ player, challenge = null, dailyTwist = null, levels = [], levelProgress = null }: Props) {
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
  const [progress, setProgress] = useState<LevelProgress>(levelProgress ?? { unlocked: 1, best: {} });
  const [selected, setSelected] = useState(Math.min(levels.length || 1, (levelProgress?.unlocked ?? 1)));

  useEffect(() => {
    // Load stored preferences after mount (avoids hydration mismatch).
    const id = requestAnimationFrame(() => {
      setSound(readPref("om_sound", true));
      setReduced(readPref("om_reduced", window.matchMedia("(prefers-reduced-motion: reduce)").matches));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => { sfx.setEnabled(sound); }, [sfx, sound]);

  const start = useCallback(async (m: Mode, level?: number) => {
    sfx.unlock();
    setError(null);
    setPhase({ kind: "starting" });
    if (level) setSelected(level);
    const r = await post<Start>("/api/game/start", { mode: m, challengeId: challenge?.id, level: m === "level" ? level : undefined });
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
      const lr = r.data.level;
      if (lr && player) setProgress((p) => ({ unlocked: Math.max(p.unlocked, lr.unlocked), best: { ...p.best, [lr.n]: Math.max(p.best[lr.n] ?? 0, lr.best) } }));
    }
    setPhase((p) => (p.kind === "result" && p.run.runId === run.runId ? { ...p, saved: r.ok ? r.data : null, saveError: r.ok ? null : r.error } : p));
  }, [player]);

  // "R" for one more from the result screen.
  useEffect(() => {
    if (phase.kind !== "result") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) void start(phase.run.mode, phase.run.level?.n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start]);

  if (phase.kind === "playing") {
    return (
      <GameCanvas
        key={phase.key} seed={phase.run.seed} twist={phase.run.twist.id} rules={phase.run.rules} level={phase.run.level} ghost={phase.run.ghost} ghostName={phase.run.ghostName ?? challenge?.by ?? null}
        sfx={sfx} reducedEffects={reduced}
        onEnd={(e) => void onEnd(phase.run, e)} onQuit={() => setPhase({ kind: "menu" })}
      />
    );
  }

  if (phase.kind === "result") {
    const lr = phase.saved?.level;
    const next = lr?.passed && lr.n < levels.length && player ? lr.n + 1 : null;
    return <Result phase={phase} best={best} streak={streak} isGuest={!player} challenge={challenge} runsThisVisit={runsThisVisit} onAgain={() => void start(phase.run.mode, phase.run.level?.n)} onNext={next ? () => void start("level", next) : null} onMenu={() => setPhase({ kind: "menu" })} />;
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
        ) : !player && mode === "level" ? (
          <>
            <p className="eyebrow">Levels · free to try</p>
            <h2 style={{ fontSize: "var(--step-3)" }}>Level 1</h2>
            <GuestModeTabs mode={mode} setMode={setMode} />
            <p className="muted">Thirty hand-tuned arenas, each with a pass mark. Clear one to unlock the next. Try Level 1 now; confirm your email to save progress and keep climbing.</p>
            {levels[0] ? <LevelCard level={levels[0]} best={null} /> : null}
          </>
        ) : !player ? (
          <>
            <p className="eyebrow">Daily Arena · free to play</p>
            <h2 style={{ fontSize: "var(--step-3)" }}>Today&apos;s arena</h2>
            <p className="muted">Everyone gets the same arena today (it resets at midnight IST). Sixty seconds. Play now, no sign-up. Confirm your email afterwards to save your score to the leaderboard and unlock Quick Play.</p>
            <GuestModeTabs mode={mode} setMode={setMode} />
            {dailyTwist ? <TwistBadge twist={dailyTwist} /> : null}
          </>
        ) : (
          <>
            <p className="eyebrow">Playtest</p>
            <h2 style={{ fontSize: "var(--step-3)" }}>Choose a mode</h2>
            <div className="mode-tabs" role="group" aria-label="Mode">
              <button type="button" className="btn btn--sm" aria-pressed={mode === "quick"} onClick={() => setMode("quick")}>Quick Play</button>
              <button type="button" className="btn btn--sm" aria-pressed={mode === "daily"} onClick={() => setMode("daily")}>Daily Arena</button>
              {levels.length ? <button type="button" className="btn btn--sm" aria-pressed={mode === "level"} onClick={() => setMode("level")}>Levels</button> : null}
            </div>
            <p className="muted" style={{ marginTop: "1rem" }}>
              {mode === "quick" ? "A fresh random arena every run, classic rules. Practice and chase your personal best." : mode === "level" ? `Clear each level's target to unlock the next. ${Math.min(progress.unlocked, levels.length)} of ${levels.length} unlocked.` : "Today's shared arena (resets at midnight IST). Your best run today goes on the leaderboard."}
            </p>
            {mode === "level" ? <LevelMap levels={levels} progress={progress} selected={selected} onSelect={setSelected} /> : null}
            {mode === "level" && levels[selected - 1] ? <LevelCard level={levels[selected - 1]} best={progress.best[selected] ?? null} /> : null}
            {mode === "daily" && dailyTwist ? <TwistBadge twist={dailyTwist} /> : null}
          </>
        )}
        {error ? <div className="notice notice--err" role="alert"><strong>Couldn&apos;t start</strong>{error}</div> : null}
        <button type="button" className="btn btn--primary" style={{ minWidth: 200 }} disabled={phase.kind === "starting"} onClick={() => void start(mode, mode === "level" ? (player ? selected : 1) : undefined)}>
          {phase.kind === "starting" ? (<><span className="spinner" aria-hidden="true" /> Loading…</>) : mode === "level" ? `Play Level ${player ? selected : 1}` : "Play"}
        </button>
        <div className="stat-grid">
          {player ? <div className="stat"><b>{best.toLocaleString("en-IN")}</b><span>Personal best</span></div> : null}
          {player ? <div className="stat"><b className={streak > 1 ? "streak" : undefined}>{streak > 0 ? `🔥 ${streak}` : "—"}</b><span>Daily streak</span></div> : null}
          {mode === "level" && player ? <div className="stat"><b>★ {levels.reduce((n, l) => n + starCount(l.stars, progress.best[l.n] ?? 0), 0)}/{levels.length * 3}</b><span>Stars</span></div> : <div className="stat"><b>60s</b><span>Per run</span></div>}
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

function Result({ phase, best, streak, isGuest, challenge, runsThisVisit, onAgain, onNext, onMenu }: {
  phase: Extract<Phase, { kind: "result" }>; best: number; streak: number; isGuest: boolean; challenge: Props["challenge"]; runsThisVisit: number; onAgain: () => void; onNext: (() => void) | null; onMenu: () => void;
}) {
  const { result, saved, saveError, run } = phase;
  const lv = run.level;
  const lr = saved?.level ?? null;
  const lvStars = lv ? starCount(lv.stars, result.score) : 0;
  const lvPassed = lv ? result.score >= lv.target : false;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const target = lv ? null : saved?.target ?? run.target;
  const beat = target !== null ? result.score > target : null;
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const shownStreak = saved?.streak ?? (isGuest ? null : streak);
  const highMoment = beat === true || !!saved?.newBest || (shownStreak ?? 0) >= 2 || lvStars === 3;
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
        <p className="eyebrow">{lv ? `Level ${lv.n} · ${lv.name}` : run.mode === "daily" ? `Daily Arena · ${run.day}` : run.mode === "challenge" ? "Friend challenge" : "Quick Play"}</p>
        <h2 ref={headingRef} tabIndex={-1} style={{ fontSize: "var(--step-2)", outline: "none" }}>
          {lv ? (lvPassed ? (lvStars === 3 ? "Perfect clear! ★★★" : "Level cleared!") : `${(lv.target - result.score).toLocaleString("en-IN")} short of ${lv.target.toLocaleString("en-IN")}. One more?`) : beat === true ? "You beat it!" : beat === false ? `${(target! - result.score + 1).toLocaleString("en-IN")} short. One more?` : saved?.newBest ? "New personal best!" : "Run complete"}
        </h2>
        <p className="big-score">{result.score.toLocaleString("en-IN")}</p>
        {lv ? (
          <p className="level-stars" aria-label={`${lvStars} of 3 stars`}>
            {[0, 1, 2].map((i) => <span key={i} className={i < lvStars ? "on" : undefined} title={`${lv.stars[i].toLocaleString("en-IN")} pts`}>★</span>)}
            <span className="small muted"> {lvStars < 3 ? `Next star at ${lv.stars[lvStars].toLocaleString("en-IN")}` : "All stars"}</span>
          </p>
        ) : null}
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
          {onNext ? <button type="button" className="btn btn--primary" onClick={onNext}>Next: Level {lr!.n + 1} →</button> : null}
          <button type="button" className={onNext ? "btn" : "btn btn--primary"} autoFocus onClick={onAgain}>{lv && lvPassed ? "Replay for stars" : "One more"} <span className="kbd" aria-hidden="true" style={{ marginLeft: 6 }}>R</span></button>
          {!isGuest ? <button type="button" className="btn" onClick={onMenu}>Modes</button> : null}
        </div>
        {saved ? (
          <ShareResult
            text={shareText({ mode: run.mode, day: run.day, level: lv ? { n: lv.n, name: lv.name, stars: lvStars, passed: lvPassed } : null, twist: run.twist.id === "classic" ? null : run.twist.name, score: result.score, pickups: result.pickups, maxCombo: result.maxCombo, powerUps: result.powerUps, streak: shownStreak, beat, target })}
            url={challengeUrl}
            onNeedUrl={makeChallenge}
          />
        ) : null}
        {isGuest && saved ? <GuestClaim runId={run.runId} score={result.score} canRank={run.mode === "daily" && saved.unrankedReason === "guest" && result.score > 0} levelCleared={lv && lvPassed ? lv.n : null} referralCode={challenge?.referralCode ?? null} /> : null}
        {community ? <CommunityPrompt reason={community} /> : null}
        {runsThisVisit === 1 || runsThisVisit === 3 ? <Feedback runId={run.runId} /> : null}
      </div>
    </div>
  );
}

function GuestModeTabs({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="mode-tabs" role="group" aria-label="Mode" style={{ marginBottom: ".75rem" }}>
      <button type="button" className="btn btn--sm" aria-pressed={mode === "daily"} onClick={() => setMode("daily")}>Daily Arena</button>
      <button type="button" className="btn btn--sm" aria-pressed={mode === "level"} onClick={() => setMode("level")}>Levels</button>
    </div>
  );
}

function LevelMap({ levels, progress, selected, onSelect }: { levels: LevelSummary[]; progress: LevelProgress; selected: number; onSelect: (n: number) => void }) {
  return (
    <ol className="level-map" aria-label="Levels">
      {levels.map((l) => {
        const locked = l.n > progress.unlocked, best = progress.best[l.n], stars = best ? starCount(l.stars, best) : 0;
        return (
          <li key={l.n}>
            <button type="button" disabled={locked} aria-pressed={selected === l.n} data-boss={l.kind === "boss" || undefined} onClick={() => onSelect(l.n)}
              aria-label={`Level ${l.n}, ${l.name}${locked ? ", locked" : best ? `, best ${best}, ${stars} stars` : ""}`}>
              <b>{locked ? "🔒" : l.n}</b>
              <span aria-hidden="true">{locked ? "" : "★".repeat(stars) + "☆".repeat(3 - stars)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function LevelCard({ level, best }: { level: LevelSummary; best: number | null }) {
  return (
    <div className="level-card">
      <p style={{ margin: 0 }}><span className={`pill ${level.kind === "boss" ? "pill--soon" : "pill--dev"}`}>{level.name}</span> <span className="small muted">{level.seconds}s · {level.description}</span></p>
      <p className="small" style={{ margin: ".5rem 0 0" }}>
        Target <b style={{ color: "var(--amber)" }}>{level.target.toLocaleString("en-IN")}</b> · ★★ {level.stars[1].toLocaleString("en-IN")} · ★★★ {level.stars[2].toLocaleString("en-IN")}
        {best !== null ? <> · Your best <b>{best.toLocaleString("en-IN")}</b></> : null}
      </p>
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

function GuestClaim({ runId, score, canRank, levelCleared, referralCode }: { runId: string; score: number; canRank: boolean; levelCleared: number | null; referralCode: string | null }) {
  return (
    <div className="form-card" style={{ marginTop: "1.5rem", background: "var(--ink-900)" }}>
      <h3 style={{ marginTop: 0 }}>{canRank ? `Save your ${score.toLocaleString("en-IN")} to today's leaderboard` : levelCleared ? `Save your progress and unlock Level ${levelCleared + 1}` : "Keep your scores"}</h3>
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
