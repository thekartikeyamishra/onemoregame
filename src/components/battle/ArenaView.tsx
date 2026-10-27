"use client";

import { useEffect, useRef, useState } from "react";
import { dirIndex, TPS } from "@/game/engine";
import { ATTACK_ABILITIES, DEFENDER_ABILITIES, DEFENDER_ENERGY, DEFENDER_LEVELS } from "@/game/battle/config";
import type { PublicRoom } from "@/lib/battle-types";
import { drawArena, fmtClock, type Particle } from "./draw";
import type { BattleWorld } from "./world";
import type { Sfx } from "@/game/audio";

const ATTACK_KINDS = new Set(["strike", "swarm", "mirror", "erosion", "surge", "jam", "eclipse"]);
const ABILITY_KINDS = new Set(["bulwark", "tractor", "stasis", "overdrive", "purge"]);

/** Maps simulation events on your own arena to sounds (pickups are throttled so combos stay musical, not noisy). */
export function battleSound(sfx: Sfx, kind: string, combo: number, last: { pickup: number }) {
  const now = performance.now();
  if (kind === "pickup") { if (now - last.pickup > 45) { last.pickup = now; sfx.pickup(Math.max(1, combo)); } }
  else if (kind === "hit") sfx.ko();
  else if (kind === "shieldBreak") sfx.shield();
  else if (kind === "power") sfx.power();
  else if (kind === "dash") sfx.dash();
  else if (kind === "nearMiss") sfx.nearMiss();
  else if (kind === "secondWind") sfx.secondWind();
  else if (kind === "fizzle") sfx.fizzle();
  else if (kind === "supernova") sfx.supernova();
  else if (kind === "aegis") sfx.aegis();
  else if (ABILITY_KINDS.has(kind)) sfx.ability();
  else if (ATTACK_KINDS.has(kind)) sfx.sabotage();
}

const KEYS: Record<string, [number, number]> = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };

/** Defender view: your arena (driven live), teammates as ghosts, telegraphed attacks, abilities. */
export function ArenaView({ world, room, nowTick, sfx }: { world: BattleWorld; room: PublicRoom; nowTick: () => number; sfx: Sfx }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const dash = useRef(false);
  const ability = useRef<number | null>(null);
  const [hud, setHud] = useState({ score: 0, hits: 0, combo: 0, level: 1, energy: 0, left: 0, warnings: [] as string[], debuffs: [] as string[], canUse: [] as boolean[], levelUp: 0, showLevelUp: false });
  const lastLevel = useRef(1);
  const players = room.players;
  const meColor = players.find((p) => p.id === world.me)?.color ?? "#ffbf47";

  useEffect(() => {
    const canvas = canvasRef.current!, wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const particles: Particle[] = [];
    let raf = 0, W = 0, H = 0, hudAt = 0, levelUpAt = -1e9;
    const warned = new Set<string>();
    const lastSound = { pickup: 0 };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const r = wrap.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = Math.min(r.width, Math.max(260, window.innerHeight * 0.6));
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    // Bring the arena (and the ability bar under it) into view when the round starts.
    // Keep the top bar (room, sound, help) in view too.
    const anchor = (wrap.closest(".battle-shell") as HTMLElement | null) ?? wrap;
    const top = anchor.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });

    const frame = () => {
      const t = nowTick();
      const run = world.myRun;
      if (run) {
        let dx = 0, dy = 0;
        for (const k of keys.current) { const v = KEYS[k]; if (v) { dx += v[0]; dy += v[1]; } }
        let dir = dx || dy ? dirIndex(dx, dy) : -1;
        if (dir < 0 && pointer.current) {
          const scale = (Math.min(W, H) / 2 - 12) / 300;
          const px = W / 2 + run.state.x * scale, py = H / 2 + run.state.y * scale;
          const vx = pointer.current.x - px, vy = pointer.current.y - py;
          if (vx * vx + vy * vy > 64) dir = dirIndex(vx, vy);
        }
        const res = world.stepLocal(t, { dir, dash: dash.current }, ability.current);
        // Presses are consumed by the next simulated tick (high-refresh screens can draw frames with no new tick).
        if (res.stepped > 0) { dash.current = false; ability.current = null; }
        if (!world.iDrive) ability.current = null;
        world.advance(t);
        const ghosts = [...world.runs.values()].filter((r) => r !== run && r.spec.team === run.spec.team).map((r) => ({ x: r.state.x, y: r.state.y, color: players.find((p) => p.id === r.spec.id)?.color ?? "#fff", name: players.find((p) => p.id === r.spec.id)?.name ?? "" }));
        const incoming = world.incoming(world.me, t);
        for (const e of incoming) {
          const key = `${e.by}:${e.seq}:${e.kind}`;
          if (!warned.has(key)) { warned.add(key); sfx.warning(); }
        }
        drawArena(ctx, run, W, H, { color: meColor, total: world.total, nowTick: Math.max(0, t), incoming, ghosts, reduced, onFx: (k) => battleSound(sfx, k, run.state.combo, lastSound) }, particles);
        const now = performance.now();
        if (now - hudAt > 120) {
          hudAt = now;
          const lvl = run.level;
          const warn = world.incoming(world.me, t).map((e) => `${ATTACK_ABILITIES.find((a) => a.id === e.kind)?.icon ?? "!"} ${e.kind.toUpperCase()}${e.by === "arena" ? "" : ` from ${players.find((p) => p.id === e.by)?.name ?? "?"}`} in ${Math.max(0, Math.ceil((e.tick - t) / TPS))}s`);
          const deb = (["mirror", "erosion", "surge", "jam", "blackout"] as const).filter((k) => run.until[k] > run.tick).map((k) => `${k} ${Math.ceil((run.until[k] - run.tick) / TPS)}s`);
          if (lvl > lastLevel.current) { levelUpAt = now; sfx.levelUp(); }
          lastLevel.current = lvl;
          const showLevelUp = now - levelUpAt < 2400;
          setHud(() => ({ score: run.state.score, hits: run.state.hits, combo: run.state.combo, level: lvl, energy: run.energy, left: world.total - Math.max(0, t), warnings: warn.slice(0, 3), debuffs: deb, canUse: DEFENDER_ABILITIES.map((_, i) => world.iDrive && run.canUse(i)), levelUp: levelUpAt, showLevelUp }));
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (KEYS[e.code]) { keys.current.add(e.code); e.preventDefault(); }
      if (e.code === "Space") { dash.current = true; e.preventDefault(); }
      const n = Number(e.key);
      if (n >= 1 && n <= DEFENDER_ABILITIES.length) ability.current = n - 1;
    };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.code); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    let lastTap = 0;
    const pdown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      const now = performance.now();
      if (now - lastTap < 280) dash.current = true;
      lastTap = now;
      if (e.pointerType === "mouse" && e.button === 0) dash.current = true;
    };
    const pmove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.buttons === 0) return;
      const r = canvas.getBoundingClientRect();
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pup = (e: PointerEvent) => { if (e.pointerType !== "mouse") pointer.current = null; };
    canvas.addEventListener("pointerdown", pdown); canvas.addEventListener("pointermove", pmove);
    window.addEventListener("pointerup", pup); canvas.addEventListener("pointerleave", pup);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      canvas.removeEventListener("pointerdown", pdown); canvas.removeEventListener("pointermove", pmove);
      window.removeEventListener("pointerup", pup); canvas.removeEventListener("pointerleave", pup);
    };
  }, [world, nowTick, players, meColor, sfx]);

  const next = hud.level < 3 ? DEFENDER_LEVELS[hud.level] : null;
  const prev = DEFENDER_LEVELS[hud.level - 1];
  const teammates = [...world.runs.values()].filter((r) => r.spec.id !== world.me);

  return (
    <div className="battle-arena">
      <div className="battle-hud">
        <span className="hud-score">{hud.score.toLocaleString("en-IN")}</span>
        <span className="hud-chip">KO {hud.hits}</span>
        {hud.combo > 1 ? <span className="hud-chip hud-combo">×{hud.combo}</span> : null}
        <span className="hud-chip">LV {hud.level}{next ? <i className="lv-bar"><b style={{ width: `${Math.min(100, ((hud.score - prev) / (next - prev)) * 100)}%` }} /></i> : " MAX"}</span>
        <span className="hud-time">{fmtClock(hud.left)}</span>
      </div>
      {hud.warnings.length ? <div className="battle-warnings" role="alert">{hud.warnings.map((w) => <span key={w}>⚠ {w}</span>)}</div> : null}
      <div ref={wrapRef} className="battle-canvas-wrap">
        <canvas ref={canvasRef} className="battle-canvas" aria-label="Your arena. Steer with WASD, arrow keys, mouse or touch. Space or double-tap to dash. Number keys use abilities." />
        {hud.showLevelUp ? <div className="level-up" key={hud.levelUp}>LEVEL {hud.level}!</div> : null}
        {!world.iDrive ? <div className="battle-overlay-tag">AI is piloting your orb</div> : null}
        {hud.debuffs.length ? <div className="battle-debuffs">{hud.debuffs.map((d) => <span key={d}>{d}</span>)}</div> : null}
      </div>
      <div className="battle-energy" aria-label={`Energy ${hud.energy} of ${DEFENDER_ENERGY.max}`}>
        {Array.from({ length: DEFENDER_ENERGY.max }, (_, i) => <i key={i} className={i < hud.energy ? "on" : undefined} />)}
      </div>
      <div className="battle-abilities" role="group" aria-label="Abilities">
        {DEFENDER_ABILITIES.map((a, i) => (
          <button key={a.id} type="button" className="ability" data-ready={hud.canUse[i] || undefined} disabled={!hud.canUse[i]} onClick={() => { ability.current = i; }} title={a.blurb}>
            <span className="ability-icon" aria-hidden="true">{a.icon}</span>
            <span className="ability-name">{a.name}</span>
            <span className="ability-cost">{a.cost}⚡{a.level > hud.level ? ` · LV${a.level}` : ""}</span>
            <kbd>{i + 1}</kbd>
          </button>
        ))}
        <button type="button" className="ability ability--dash" onPointerDown={() => { dash.current = true; }}>
          <span className="ability-icon" aria-hidden="true">➤</span><span className="ability-name">Dash</span><kbd>Space</kbd>
        </button>
      </div>
      {teammates.length ? (
        <ul className="battle-mates" aria-label="Teammates">
          {teammates.map((r) => { const p = players.find((x) => x.id === r.spec.id); return <li key={r.spec.id} style={{ ["--pc" as string]: p?.color }}><i />{p?.name}<b>{r.state.score.toLocaleString("en-IN")}</b><small>KO {r.state.hits}</small></li>; })}
        </ul>
      ) : null}
    </div>
  );
}
