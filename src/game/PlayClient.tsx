"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { CommunityPrompt, markCommunityShown, shouldShowCommunity } from "@/components/CommunityPrompt";
import { ShareResult, shareText } from "@/components/ShareResult";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Sfx } from "./audio";
import { hapticsEnabled, setHaptics } from "@/lib/native";
import { ENGINE_VERSION, type InputLog, type Rules, type RunResult, type TwistId } from "./engine";
import dynamic from "next/dynamic";
import type { RunEnd } from "./GameCanvas";
import { DEFAULT_LOOK, SKINS, isSkinId, type Look } from "./cosmetics";
import { effectiveLook, mergedOwned } from "@/components/shop/checkout";
import { currentSubscription, disablePush, enablePush, localStreak, markPushAsked, pushSupported, shouldOfferPush, touchPush } from "@/lib/push-client";

// Replay Studio is only loaded when a player opens a replay.
const ReplayStudio = dynamic(() => import("@/components/shop/ReplayStudio").then((m) => m.ReplayStudio), { ssr: false });

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
type Start = { runId: string; ticket: string; seed: number; mode: Mode; day: string | null; target: number | null; twist: TwistInfo; ghost: InputLog | null; ghostName: string | null; level: LevelInfo | null; rules: Partial<Rules> };
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
  /** Signed-in player's equipped cosmetics and owned items (guests: read from this device). */
  look?: Look | null;
  owned?: string[];
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

export function PlayClient({ player, challenge = null, dailyTwist = null, levels = [], levelProgress = null, look: serverLook = null, owned = [] }: Props) {
  const sfx = useMemo(() => new Sfx(), []);
  const [look, setLook] = useState<Look>(serverLook ?? DEFAULT_LOOK);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLook(effectiveLook(!!player, serverLook, mergedOwned(owned))));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    const r = await post<NonNullable<Saved>>("/api/game/finish", { runId: run.runId, ticket: run.ticket, inputs: end.log, score: end.result.score, version: ENGINE_VERSION });
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
      // `key` can be missing (browser autofill fires synthetic keydown events), and typing in a form must not restart.
      if (typeof e.key !== "string" || e.key.toLowerCase() !== "r" || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t.isContentEditable)) return;
      void start(phase.run.mode, phase.run.level?.n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start]);

  if (phase.kind === "playing") {
    return (
      <GameCanvas
        key={phase.key} seed={phase.run.seed} twist={phase.run.twist.id} rules={phase.run.rules} level={phase.run.level} ghost={phase.run.ghost} ghostName={phase.run.ghostName ?? challenge?.by ?? null}
        look={look} sfx={sfx} reducedEffects={reduced}
        onEnd={(e) => void onEnd(phase.run, e)} onQuit={() => setPhase({ kind: "menu" })}
      />
    );
  }

  if (phase.kind === "result") {
    const lr = phase.saved?.level;
    const next = lr?.passed && lr.n < levels.length && player ? lr.n + 1 : null;
    return <Result look={look} phase={phase} best={best} streak={streak} isGuest={!player} challenge={challenge} runsThisVisit={runsThisVisit} onAgain={() => void start(phase.run.mode, phase.run.level?.n)} onNext={next ? () => void start("level", next) : null} onMenu={() => setPhase({ kind: "menu" })} />;
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
        <p className="small"><a href="/battle">⚔ New: Battle your friends (up to 5v5, or vs AI) →</a></p>
        <p className="small"><a href="/shop">🎨 Skins, trails &amp; the Founder Pack →</a></p>
        <details>
          <summary className="small" style={{ cursor: "pointer" }}>Controls &amp; settings</summary>
          <ul className="small muted" style={{ marginTop: ".75rem" }}>
            <li>Steer: <span className="kbd">WASD</span> / arrows, move the mouse, or drag a thumb anywhere on touch screens (a joystick appears where you touch). Second finger or double-tap to dash.</li>
            <li>Dash (brief invulnerability, 2 s cooldown): <span className="kbd">Space</span>, click, double-tap or the Dash button.</li>
            <li>Power-ups (hexagons): <b>◯ Shield</b> blocks one hit · <b>◷ Slow-mo</b> halves hazard speed · <b>U Magnet</b> pulls nearby shards · <b>×2 Double</b> doubles points.</li>
            <li>Pause: <span className="kbd">Esc</span> / <span className="kbd">P</span>. One more: <span className="kbd">R</span> on the results screen.</li>
          </ul>
          <label className="check"><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); writePref("om_sound", e.target.checked); }} /><span>Sound effects</span></label>
          <label className="check"><input type="checkbox" checked={reduced} onChange={(e) => { setReduced(e.target.checked); writePref("om_reduced", e.target.checked); }} /><span>Reduce effects (no shake or glow, fewer particles)</span></label>
          <HapticsToggle />
          <ReminderToggle />
        </details>
      </div>
      {!challenge ? (
        <aside className="grid" style={{ gap: "1.5rem" }}>
          {player ? <NameForm initial={player.displayName} /> : null}
          <Leaderboard version={lbVersion} signedIn={!!player} />
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

function Result({ look, phase, best, streak, isGuest, challenge, runsThisVisit, onAgain, onNext, onMenu }: {
  look: Look; phase: Extract<Phase, { kind: "result" }>; best: number; streak: number; isGuest: boolean; challenge: Props["challenge"]; runsThisVisit: number; onAgain: () => void; onNext: (() => void) | null; onMenu: () => void;
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
  const [moment, setMoment] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const canReplay = !!saved && !saveError && result.score > 0 && phase.inputs.length > 0;
  const replayLabel = lv ? `Level ${lv.n} · ${"★".repeat(lvStars) || "run"}` : beat === true ? "Challenge beaten" : saved?.newBest ? "New personal best" : run.mode === "daily" ? `Daily Arena · ${run.day}` : "Quick Play";
  const replayRun = useMemo(() => ({ seed: run.seed, twist: run.twist.id, rules: run.rules, log: phase.inputs, score: result.score, label: replayLabel }), [run, phase.inputs, result.score, replayLabel]);
  const [pushOffer, setPushOffer] = useState<null | "ask" | "on" | "denied">(null);
  const pushStreak = run.mode === "daily" && run.day ? (shownStreak ?? 0) : 0;
  useEffect(() => {
    if (!saved || run.mode !== "daily" || !run.day) return;
    // Remember that today is played (guests: streak counted on this device) and skip today's reminder.
    const s = isGuest ? localStreak(run.day) : shownStreak ?? 0;
    void touchPush(run.day, s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  useEffect(() => {
    if (!saved) return;
    const id = requestAnimationFrame(() => {
      // At most one prompt per result screen, and the highlight offer at most once per visit, only on proud moments.
      if (highMoment && canReplay && takeMoment()) { setMoment(true); track("moment_offer_shown", {}); return; }
      // Hooked: ask for the external trigger right after the reward, when the player wants tomorrow's run.
      if (run.mode === "daily" && run.day && pushSupported() && shouldOfferPush()) { markPushAsked(); setPushOffer("ask"); track("push_offer_shown", {}); return; }
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
        {saved && run.mode === "daily" && (saved.ranked || saved.unrankedReason === "guest") ? <RankLine score={result.score} ranked={saved.ranked} /> : null}
        {saveError ? <div className="notice notice--err" role="alert"><strong>Not recorded</strong>{saveError}</div> : saved === null ? <p className="small muted" role="status">Verifying score…</p> : <p className="small muted">Score verified by replay ✓{run.mode === "daily" ? (saved.ranked ? " · on today's leaderboard if it's your best" : saved.unrankedReason === "guest" ? " · confirm your email below to put it on the leaderboard" : ` · not ranked: ${UNRANKED[saved.unrankedReason ?? ""] ?? "see Fair Play"}`) : ""}</p>}
        <div className="btn-row">
          {onNext ? <button type="button" className="btn btn--primary" onClick={onNext}>Next: Level {lr!.n + 1} →</button> : null}
          <button type="button" className={onNext ? "btn" : "btn btn--primary"} autoFocus onClick={onAgain}>{lv && lvPassed ? "Replay for stars" : "One more"} <span className="kbd" aria-hidden="true" style={{ marginLeft: 6 }}>R</span></button>
          {!isGuest ? <button type="button" className="btn" onClick={onMenu}>Modes</button> : null}
          {canReplay ? <button type="button" className="btn" onClick={() => setReplayOpen(true)}>🎬 Watch replay</button> : null}
        </div>
        {moment ? (
          <aside className="form-card moment-offer" aria-label="Save this moment">
            <p className="eyebrow">{beat === true ? "Proof" : lvStars === 3 ? "Perfect clear" : saved?.newBest ? "New personal best" : "Big moment"}</p>
            <p><b>{beat === true ? "You beat their score. Send them the replay." : "That run deserves to be seen."}</b> Watch it back as a 30-second highlight, then save it as a video for your Story.</p>
            <div className="btn-row"><button type="button" className="btn btn--primary btn--sm" onClick={() => setReplayOpen(true)}>🎬 Watch the replay</button><button type="button" className="btn btn--sm" onClick={() => setMoment(false)}>Not now</button></div>
          </aside>
        ) : null}
        {replayOpen ? <ReplayStudio run={replayRun} look={look} onClose={() => setReplayOpen(false)} /> : null}
        {saved ? (
          <ShareResult
            text={shareText({ mode: run.mode, day: run.day, level: lv ? { n: lv.n, name: lv.name, stars: lvStars, passed: lvPassed } : null, twist: run.twist.id === "classic" ? null : run.twist.name, score: result.score, pickups: result.pickups, maxCombo: result.maxCombo, powerUps: result.powerUps, streak: shownStreak, beat, target })}
            url={challengeUrl}
            onNeedUrl={makeChallenge}
          />
        ) : null}
        {isGuest && saved ? <GuestClaim runId={run.runId} score={result.score} canRank={run.mode === "daily" && saved.unrankedReason === "guest" && result.score > 0} levelCleared={lv && lvPassed ? lv.n : null} referralCode={challenge?.referralCode ?? null} /> : null}
        {community ? <CommunityPrompt reason={community} /> : null}
        {pushOffer ? (
          <aside className="form-card moment-offer" aria-label="Daily reminder">
            {pushOffer === "ask" ? (
              <>
                <p className="eyebrow">Tomorrow&apos;s arena</p>
                <p><b>{pushStreak >= 1 ? `Keep your 🔥 ${pushStreak}-day streak alive.` : "Come back for tomorrow's arena."}</b> One reminder a day at 7 pm, only if you haven&apos;t played yet. Turn it off anytime.</p>
                <div className="btn-row">
                  <button type="button" className="btn btn--primary btn--sm" onClick={async () => { const r = await enablePush(run.day!, isGuest ? localStreak(run.day!) : pushStreak); setPushOffer(r === "on" ? "on" : "denied"); track("push_enabled", { result: r }); }}>🔔 Remind me</button>
                  <button type="button" className="btn btn--sm" onClick={() => setPushOffer(null)}>Not now</button>
                  <button type="button" className="btn btn--sm" onClick={() => { markPushAsked(true); setPushOffer(null); }}>Never</button>
                </div>
              </>
            ) : <p className="small" role="status">{pushOffer === "on" ? "🔔 Done. See you tomorrow." : "No problem. You can turn reminders on later from the Play screen."}</p>}
          </aside>
        ) : null}
        {runsThisVisit === 1 || runsThisVisit === 3 ? <Feedback runId={run.runId} /> : null}
      </div>
    </div>
  );
}

function takeMoment(): boolean {
  try {
    if (sessionStorage.getItem("om_moment")) return false;
    sessionStorage.setItem("om_moment", "1");
    return true;
  } catch { return false; }
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

type BoardData = { scope: "day" | "week"; key: string; players: number; resetsInMs: number; entries: Array<{ rank: number; id: string; name: string; score: number; streak: number; days?: number; badge?: string | null; skin?: string | null }>; champions?: Array<{ rank: number; name: string; score: number }> };
type Standing = { signedIn: boolean; score: number | null; rank: number | null; players: number; id?: string; ahead: { name: string; score: number; gap: number } | null; behind: { name: string; score: number; gap: number } | null };
const fmt = (n: number) => n.toLocaleString("en-IN");
function fmtLeft(ms: number) {
  const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h ? `${h}h ${m}m` : `${m}m`;
}

/** Where this Daily run places: "#14 of 312 today" (guests: "would be #14", the nudge to claim it). */
function RankLine({ score, ranked }: { score: number; ranked: boolean }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const url = ranked ? "/api/game/leaderboard/me?scope=day" : `/api/game/leaderboard/rank?score=${score}`;
    fetch(url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: (Standing & { rank: number | null }) | null) => {
      if (!live || !d || !d.rank) return;
      if (ranked) setText(`You're #${fmt(d.rank)} of ${fmt(d.players)} today.${d.ahead ? ` ${fmt(d.ahead.gap + 1)} more to pass ${d.ahead.name}.` : " You're on top!"}`);
      else setText(`This run would be #${fmt(d.rank)} of ${fmt(d.players)} today. Confirm your email below to claim it.`);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [score, ranked]);
  return text ? <p className="rank-line" role="status">🏁 {text}</p> : null;
}

function Leaderboard({ version, signedIn }: { version: number; signedIn: boolean }) {
  const [scope, setScope] = useState<"day" | "week">("day");
  const [data, setData] = useState<BoardData | null>(null);
  const [me, setMe] = useState<Standing | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    // After a run (version > 0) or a manual retry, skip the shared CDN copy so the new score shows at once.
    const fresh = version > 0 || retry > 0;
    const url = `/api/game/leaderboard?scope=${scope}${fresh ? `&v=${version}.${retry}.${Date.now() % 1e6}` : ""}`;
    const load = (attempt: number): Promise<void> =>
      fetch(url, fresh ? { cache: "no-store" } : undefined)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((d: BoardData) => {
          if (!live) return;
          if (!d || !Array.isArray(d.entries)) throw new Error("bad board");
          setData(d); setFailed(false);
        })
        .catch(() => (attempt < 2 && live ? new Promise<void>((ok) => setTimeout(ok, 800 * (attempt + 1))).then(() => load(attempt + 1)) : live ? setFailed(true) : undefined));
    void load(0);
    if (signedIn) fetch(`/api/game/leaderboard/me?scope=${scope}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: Standing | null) => { if (live && d && typeof d.signedIn === "boolean") setMe(d); }).catch(() => undefined);
    return () => { live = false; };
  }, [version, scope, signedIn, retry]);
  const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank);
  const inTop = !!me?.id && !!data?.entries.some((e) => e.id === me.id);
  return (
    <section className="form-card lb-card" aria-labelledby="lb-h">
      <div className="lb-head">
        <h2 id="lb-h" style={{ fontSize: "var(--step-1)", margin: 0 }}>Leaderboard</h2>
        <div className="mode-tabs" role="group" aria-label="Leaderboard period">
          <button type="button" className="btn btn--sm" aria-pressed={scope === "day"} onClick={() => { setScope("day"); setData(null); }}>Today</button>
          <button type="button" className="btn btn--sm" aria-pressed={scope === "week"} onClick={() => { setScope("week"); setData(null); }}>This week</button>
        </div>
      </div>
      <p className="small muted" style={{ margin: ".25rem 0 .75rem" }}>
        {scope === "day" ? "Best Daily Arena run today." : "Your best Daily score each day, added up (Mon–Sun). Play every day to climb."}
        {data ? ` ${fmt(data.players)} player${data.players === 1 ? "" : "s"} · resets in ${fmtLeft(data.resetsInMs)}.` : ""}
      </p>
      {failed && !data ? <p className="small muted" role="alert">Leaderboard unavailable right now. <button type="button" className="btn btn--sm" onClick={() => setRetry((n) => n + 1)}>Try again</button></p> : !data ? (
        <div aria-busy="true" aria-label="Loading leaderboard">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
      ) : data.entries.length === 0 ? (
        <p className="small muted">No scores yet {scope === "day" ? "today" : "this week"}. Set the first one.</p>
      ) : (
        <table className="lb">
          <thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col">{scope === "day" ? "Score" : "Total"}</th></tr></thead>
          <tbody>{data.entries.map((e, i) => (
            <tr key={`${e.id}-${i}`} data-me={e.id === me?.id} data-top={e.rank <= 3 || undefined}>
              <td>{medal(e.rank)}</td>
              <td>{e.skin && isSkinId(e.skin) ? <i className="lb-skin" style={{ background: SKINS[e.skin].core }} title={SKINS[e.skin].name} aria-hidden="true" /> : null}{e.name}{e.badge === "founder" ? <span className="lb-founder" title="Founder: backed ONE MORE in its first year"> ★</span> : null}{e.id === me?.id ? " (you)" : ""}{e.streak > 1 ? <span className="lb-streak" title={`${e.streak}-day streak`}> 🔥{e.streak}</span> : null}{scope === "week" && e.days ? <span className="lb-days"> {e.days}/7d</span> : null}</td>
              <td>{fmt(e.score)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {scope === "week" && data?.champions?.length ? (
        <p className="small lb-champs">🏆 Last week: {data.champions.map((c) => `${medal(c.rank)} ${c.name} (${fmt(c.score)})`).join(" · ")}. Next week&apos;s champion could be you.</p>
      ) : null}
      {me?.signedIn ? (
        me.rank ? (
          <div className="lb-me">
            {!inTop ? <p><b>You: #{fmt(me.rank)}</b> of {fmt(me.players)} · {fmt(me.score ?? 0)}</p> : null}
            {me.ahead ? <p className="small">⬆ {fmt(me.ahead.gap + 1)} more to pass <b>{me.ahead.name}</b> ({fmt(me.ahead.score)}).</p> : <p className="small">👑 You&apos;re top of the board. Defend it.</p>}
            {me.behind ? <p className="small muted">⬇ {me.behind.name} is {fmt(me.behind.gap)} behind you.</p> : null}
          </div>
        ) : <p className="small muted lb-me">Play today&apos;s Daily Arena to get on the board.</p>
      ) : !signedIn ? <p className="small muted lb-me">Guest scores aren&apos;t ranked. Play a Daily run, then confirm your email (or <a href="/play/sign-in">sign in</a>) to put it on the board.</p> : null}
    </section>
  );
}

/** Daily reminder switch on the Play screen (only where Web Push works: not inside the store apps or iOS Safari tabs). */
function ReminderToggle() {
  const [state, setState] = useState<"hidden" | "on" | "off" | "blocked">("hidden");
  useEffect(() => {
    let alive = true;
    const id = requestAnimationFrame(async () => {
      if (!pushSupported()) return;
      const sub = await currentSubscription();
      if (alive) setState(Notification.permission === "denied" ? "blocked" : sub ? "on" : "off");
    });
    return () => { alive = false; cancelAnimationFrame(id); };
  }, []);
  if (state === "hidden") return null;
  if (state === "blocked") return <p className="small muted">🔕 Reminders are blocked in your browser settings.</p>;
  return (
    <label className="check">
      <input type="checkbox" checked={state === "on"} onChange={async (e) => {
        if (e.target.checked) { const r = await enablePush(dayKeyLocal(), 0); setState(r === "on" ? "on" : r === "denied" ? "blocked" : "off"); }
        else { await disablePush(); setState("off"); }
      }} />
      <span>Daily reminder (7 pm, skipped if you&apos;ve played)</span>
    </label>
  );
}
function dayKeyLocal() { return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); }

/** Vibration on hits, power-ups and big combos (phones and the store apps). Shared with Battle mode. */
function HapticsToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => { const id = requestAnimationFrame(() => setOn(hapticsEnabled())); return () => cancelAnimationFrame(id); }, []);
  return <label className="check"><input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); setHaptics(e.target.checked); }} /><span>Vibration (phones)</span></label>;
}
