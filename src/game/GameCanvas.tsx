"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/native";
import { ARENA_R, DASH_COOLDOWN, GhostPlayer, TWISTS, InputRecorder, MAGNET_RANGE, POWER_DURATION, POWER_LIFETIME, POWER_R, TPS, createGame, dirIndex, resultOf, step, type GameState, type InputLog, type PowerType, type Rules, type RunResult, type TwistId } from "./engine";
import type { Sfx } from "./audio";
import { DEFAULT_LOOK, TrailFx, drawOrb, type Look } from "./cosmetics";
import { TouchStick } from "./touch-stick";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
const COLORS = { bg: "#060912", grid: "rgba(160,180,255,0.06)", ring: "rgba(62,230,240,0.55)", cyan: "#3ee6f0", violet: "#8b7bff", amber: "#ffbf47", white: "#ffffff", green: "#5ef0a6" };
/** Each power-up has its own colour AND glyph, so colour is never the only cue. */
export const POWER_LOOK: Record<PowerType, { color: string; glyph: string; label: string }> = {
  shield: { color: "#9ff6fb", glyph: "◯", label: "Shield" },
  slow: { color: "#8b7bff", glyph: "◷", label: "Slow-mo" },
  magnet: { color: "#ffbf47", glyph: "U", label: "Magnet" },
  double: { color: "#5ef0a6", glyph: "×2", label: "Double" },
};

export interface RunEnd { log: InputLog; result: RunResult }

/**
 * Plays one run for `seed`: 3-2-1 countdown, fixed-timestep simulation, input recording, rendering.
 * Calls onEnd exactly once when the run is over. Unmount to abandon a run.
 */
/** Bottom banner that always fits: one line if it can, otherwise title and description on two lines, shrinking to fit. */
function fitBanner(ctx: CanvasRenderingContext2D, title: string, desc: string, W: number, H: number) {
  const max = W - 24;
  const one = `${title}: ${desc}`;
  ctx.font = "700 16px system-ui, sans-serif";
  if (ctx.measureText(one).width <= max) { ctx.fillText(one, W / 2, H - 20); return; }
  // Two lines sit higher so they clear the Pause/Dash buttons in the corner.
  for (const [text, y] of [[title, H - 82], [desc, H - 62]] as const) {
    let size = 15;
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    while (size > 10 && ctx.measureText(text).width > max) { size--; ctx.font = `700 ${size}px system-ui, sans-serif`; }
    ctx.fillText(text, W / 2, y);
  }
}

export function GameCanvas({ seed, twist = "classic", rules = null, level = null, ghost = null, ghostName = null, look: orbLook = DEFAULT_LOOK, sfx, reducedEffects, onEnd, onQuit }: {
  seed: number; twist?: TwistId; ghost?: InputLog | null; ghostName?: string | null;
  /** Cosmetic skin and trail (drawing only; the engine never sees it). */
  look?: Look;
  /** Levels mode: server-supplied rule overrides and the level to show in the HUD. */
  rules?: Partial<Rules> | null; level?: { n: number; name: string; description: string; target: number } | null;
  sfx: Sfx; reducedEffects: boolean; onEnd: (r: RunEnd) => void; onQuit: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const [announce, setAnnounce] = useState("Get ready");
  const [touch, setTouch] = useState(false);
  const pausedRef = useRef(false);
  const dashRef = useRef(false);
  const onEndRef = useRef(onEnd);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current!, wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const state: GameState = createGame(seed, twist, rules ?? {});
    const total = state.rules.durationTicks;
    const oy = level ? 14 : 0; // room for the target bar
    // The friend's ghost replays their verified inputs in lock-step. Only its orb and score are drawn (its world diverges).
    const ghostRun = ghost ? new GhostPlayer(seed, ghost, twist, rules ?? {}) : null;
    const ghostLabel = (ghostName ?? "Friend").slice(0, 16);
    const shardR = state.rules.shardR;
    const rec = new InputRecorder();
    const trail = new TrailFx(reducedEffects ? "none" : orbLook.trail, orbLook.skin);
    const keys = new Set<string>();
    let pointer: { x: number; y: number } | null = null;
    const stick = new TouchStick();
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let W = 0, H = 0, scale = 1, raf = 0, acc = 0, last = performance.now();
    let countdown = 3 * TPS + 20; // ~3.3 s in render frames at 60 Hz
    let lastCount = 4, shake = 0, flash = 0, ended = false, lastTap = 0;
    const particles: Particle[] = [];
    const floaters: Array<{ x: number; y: number; text: string; life: number }> = [];

    const resize = () => {
      // The canvas box (not the stage): in full-screen play the stage is padded for notches and home indicators.
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(W, H) / (ARENA_R * 2 * 1.08);
    };
    const toScreen = (x: number, y: number) => [W / 2 + x * scale, H / 2 + y * scale] as const;

    const currentInput = () => {
      let dx = 0, dy = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
      if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
      if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
      if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
      const sv = dx === 0 && dy === 0 ? stick.vector() : null;
      if (sv) { dx = sv.dx; dy = sv.dy; }
      else if (dx === 0 && dy === 0 && pointer && !stick.active) {
        const [px, py] = toScreen(state.x, state.y);
        const vx = pointer.x - px, vy = pointer.y - py;
        if (vx * vx + vy * vy > 14 * 14) { dx = vx; dy = vy; }
      }
      const dash = dashRef.current; dashRef.current = false;
      return { dir: dirIndex(dx, dy), dash };
    };

    const burst = (x: number, y: number, color: string, n: number) => {
      const count = reducedEffects ? Math.ceil(n / 3) : n;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4;
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
      }
    };

    const simulate = () => {
      const input = currentInput();
      rec.record(state.tick, input);
      ghostRun?.step();
      for (const e of step(state, input)) {
        if (e.type === "pickup") { burst(e.x, e.y, COLORS.amber, 14); floaters.push({ x: e.x, y: e.y, text: `+${e.points}`, life: 1 }); sfx.pickup(e.combo); if (e.combo >= 3) haptic(e.combo >= 6 ? "medium" : "light"); }
        else if (e.type === "hit") { burst(e.x, e.y, COLORS.violet, 22); if (!reducedEffects) shake = 10; flash = 1; floaters.push({ x: e.x, y: e.y - 20, text: "−3s", life: 1 }); sfx.hit(); haptic("heavy"); }
        else if (e.type === "nearMiss") { floaters.push({ x: e.x, y: e.y, text: `+${e.points} close!`, life: 1 }); sfx.nearMiss(); }
        else if (e.type === "shieldBreak") { burst(e.x, e.y, POWER_LOOK.shield.color, 24); floaters.push({ x: e.x, y: e.y - 20, text: "Shield!", life: 1 }); sfx.shield(); haptic("medium"); setAnnounce("Shield absorbed a hit"); }
        else if (e.type === "power") { burst(e.x, e.y, POWER_LOOK[e.power].color, 18); floaters.push({ x: e.x, y: e.y, text: POWER_LOOK[e.power].label, life: 1 }); sfx.power(); haptic("medium"); setAnnounce(`${POWER_LOOK[e.power].label} active`); }
        else if (e.type === "dash") sfx.dash();
      }
    };

    const draw = () => {
      ctx.save();
      ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H);
      if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.85; if (shake < 0.5) shake = 0; }
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
      const g = 30 * scale;
      for (let x = (W / 2) % g; x < W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (H / 2) % g; y < H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // Timer ring around the arena
      const frac = state.ticksLeft / total;
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(62,230,240,0.15)";
      ctx.beginPath(); ctx.arc(W / 2, H / 2, ARENA_R * scale, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = frac < 0.17 ? COLORS.amber : COLORS.ring;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, ARENA_R * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();

      for (const s of state.shards) {
        const [x, y] = toScreen(s.x, s.y), r = (shardR - 1) * scale * (1 + Math.sin((state.tick - s.born) * 0.15) * 0.12);
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        if (!reducedEffects) { ctx.shadowColor = COLORS.amber; ctx.shadowBlur = 12; }
        ctx.fillStyle = COLORS.amber; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
      }
      // Hazards are drawn exactly as their hitbox: an axis-aligned square. The spinning inner mark is decoration.
      for (const h of state.hazards) {
        const [x, y] = toScreen(h.x, h.y), s = h.s * scale;
        ctx.strokeStyle = h.hit ? "rgba(139,123,255,0.3)" : COLORS.violet; ctx.lineWidth = 3;
        ctx.strokeRect(x - s, y - s, s * 2, s * 2);
        if (!h.hit) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(state.tick * 0.06 + h.id);
          ctx.fillStyle = "rgba(139,123,255,0.45)"; const m = s * 0.35; ctx.fillRect(-m, -m, m * 2, m * 2); ctx.restore();
        }
      }
      // Power-up on the field: hexagon + glyph, blinking in its last second.
      if (state.power) {
        const p = state.power, look = POWER_LOOK[p.type], age = state.tick - p.born;
        if (!(age > POWER_LIFETIME - 60 && Math.floor(age / 6) % 2 === 0)) {
          const [x, y] = toScreen(p.x, p.y), r = POWER_R * scale * 1.4;
          ctx.save(); ctx.translate(x, y); ctx.rotate(state.tick * 0.02);
          if (!reducedEffects) { ctx.shadowColor = look.color; ctx.shadowBlur = 14; }
          ctx.strokeStyle = look.color; ctx.lineWidth = 2.5; ctx.beginPath();
          for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.stroke(); ctx.restore();
          ctx.fillStyle = look.color; ctx.font = `700 ${Math.max(10, 11 * scale)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(look.glyph, x, y + 1); ctx.textBaseline = "alphabetic";
        }
      }
      if (state.active.slow > 0) { ctx.fillStyle = "rgba(139,123,255,0.06)"; ctx.fillRect(0, 0, W, H); }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life -= 0.03;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const [x, y] = toScreen(p.x, p.y); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
      // Ghost (drawn under the player)
      if (ghostRun && !ghostRun.state.over) {
        const g = ghostRun.state, [gx, gy] = toScreen(g.x, g.y);
        ctx.globalAlpha = 0.45; ctx.strokeStyle = COLORS.white; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gx, gy, 10 * scale, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = COLORS.white; ctx.font = `600 ${Math.max(10, 10 * scale)}px system-ui, sans-serif`; ctx.textAlign = "center";
        ctx.fillText(ghostLabel, gx, gy - 16 * scale); ctx.globalAlpha = 1;
      }
      // Player
      const [px, py] = toScreen(state.x, state.y);
      const blink = state.invuln > 0 && state.dashing === 0 && Math.floor(state.tick / 4) % 2 === 0;
      if (countdown <= 0 && !pausedRef.current) trail.push(px, py);
      trail.draw(ctx, 10 * scale, state.tick);
      drawOrb(ctx, px, py, 10 * scale, orbLook.skin, state.tick, { glow: state.dashing ? 30 : 18, flash: blink, reduced: reducedEffects });
      if (state.active.shield > 0) { ctx.strokeStyle = POWER_LOOK.shield.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, 19 * scale, 0, Math.PI * 2); ctx.stroke(); }
      if (state.active.magnet > 0) { ctx.strokeStyle = "rgba(255,191,71,0.25)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, MAGNET_RANGE * scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      // Dash cooldown arc
      if (state.dashCooldown > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 15 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - state.dashCooldown / DASH_COOLDOWN)); ctx.stroke();
      }
      ctx.font = `700 ${Math.max(12, 13 * scale)}px system-ui, sans-serif`; ctx.textAlign = "center";
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i]; f.y -= 0.6; f.life -= 0.02;
        if (f.life <= 0) { floaters.splice(i, 1); continue; }
        const [x, y] = toScreen(f.x, f.y); ctx.globalAlpha = f.life; ctx.fillStyle = f.text.startsWith("−") ? COLORS.violet : COLORS.amber; ctx.fillText(f.text, x, y);
      }
      ctx.globalAlpha = 1;
      if (flash > 0) { ctx.fillStyle = `rgba(139,123,255,${flash * 0.18})`; ctx.fillRect(0, 0, W, H); flash -= 0.06; }
      ctx.restore();

      // HUD
      ctx.fillStyle = COLORS.amber; ctx.textAlign = "left"; ctx.font = "700 22px system-ui, sans-serif";
      ctx.fillText(String(state.score).padStart(5, "0"), 16, 32);
      ctx.textAlign = "right"; ctx.fillStyle = frac < 0.17 ? COLORS.amber : "#eef1fa";
      ctx.fillText(`${Math.ceil(state.ticksLeft / TPS)}s`, W - 16, 32);
      if (ghostRun) {
        const gap = state.score - ghostRun.state.score;
        ctx.font = "600 14px system-ui, sans-serif"; ctx.fillStyle = "rgba(238,241,250,0.75)";
        ctx.fillText(`${ghostLabel} ${ghostRun.state.score.toLocaleString("en-IN")}${ghostRun.state.over ? " (final)" : ""}`, W - 16, 54);
        ctx.fillStyle = gap >= 0 ? COLORS.green : COLORS.violet; ctx.font = "700 15px system-ui, sans-serif";
        ctx.fillText(gap >= 0 ? `+${gap.toLocaleString("en-IN")} ahead` : `${gap.toLocaleString("en-IN")} behind`, W - 16, 74);
      }
      if (level) {
        // Target bar under the score: fills toward the level's pass mark.
        const p = Math.min(1, state.score / level.target), bw = 120;
        ctx.fillStyle = "rgba(238,241,250,0.15)"; ctx.fillRect(16, 40, bw, 5);
        ctx.fillStyle = p >= 1 ? COLORS.green : COLORS.amber; ctx.fillRect(16, 40, bw * p, 5);
        ctx.textAlign = "left"; ctx.font = "600 12px system-ui, sans-serif"; ctx.fillStyle = p >= 1 ? COLORS.green : "rgba(238,241,250,0.75)";
        ctx.fillText(p >= 1 ? "TARGET CLEARED ✓" : `Target ${level.target.toLocaleString("en-IN")}`, 16 + bw + 8, 46);
        if (state.tick < 4 * TPS) {
          ctx.textAlign = "center"; ctx.fillStyle = COLORS.amber; ctx.font = "700 16px system-ui, sans-serif";
          fitBanner(ctx, `Level ${level.n} · ${level.name}`, level.description, W, H);
        }
      } else if (twist !== "classic" && state.tick < 4 * TPS) {
        ctx.textAlign = "center"; ctx.fillStyle = COLORS.amber; ctx.font = "700 16px system-ui, sans-serif";
        fitBanner(ctx, TWISTS[twist].name, TWISTS[twist].description, W, H);
      }
      if (state.combo > 1) { ctx.textAlign = "left"; ctx.fillStyle = COLORS.cyan; ctx.font = "700 16px system-ui, sans-serif"; ctx.fillText(`COMBO ×${state.combo}`, 16, 56 + oy); }
      let hy = (state.combo > 1 ? 80 : 56) + oy;
      for (const t of ["shield", "slow", "magnet", "double"] as PowerType[]) {
        if (state.active[t] <= 0) continue;
        const look = POWER_LOOK[t];
        ctx.textAlign = "left"; ctx.font = "600 13px system-ui, sans-serif"; ctx.fillStyle = look.color;
        ctx.fillText(`${look.glyph} ${look.label}`, 16, hy);
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(16, hy + 5, 90, 4);
        ctx.fillStyle = look.color; ctx.fillRect(16, hy + 5, 90 * (state.active[t] / POWER_DURATION[t]), 4);
        hy += 26;
      }
      stick.draw(ctx);
      if (countdown > 0) {
        const n = Math.ceil(countdown / TPS);
        ctx.fillStyle = "rgba(6,9,18,0.55)"; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.font = `700 ${Math.round(Math.min(W, H) * 0.18)}px system-ui, sans-serif`;
        ctx.fillText(n > 3 ? "3" : String(Math.max(n, 1)), W / 2, H / 2 + Math.min(W, H) * 0.06);
        ctx.font = "600 15px system-ui, sans-serif"; ctx.fillStyle = "rgba(238,241,250,0.85)";
        ctx.fillText(coarse ? "Drag anywhere to steer · second finger to dash" : "Arrows/WASD or mouse to steer · Space to dash", W / 2, H / 2 + Math.min(W, H) * 0.06 + 36);
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      let dt = (now - last) / 1000; last = now;
      if (pausedRef.current || ended) { dashRef.current = false; acc = 0; draw(); return; }
      if (dt > 0.25) dt = 0.25;
      if (countdown > 0) {
        countdown -= dt * TPS;
        const n = Math.max(1, Math.ceil(countdown / TPS));
        if (n !== lastCount && countdown > 0) { lastCount = n; setAnnounce(String(n)); sfx.tick(); }
        if (countdown <= 0) { setAnnounce("Go"); sfx.go(); dashRef.current = false; }
        draw(); return;
      }
      acc += dt;
      let steps = 0;
      while (acc >= 1 / TPS && steps < 8 && !state.over) { simulate(); acc -= 1 / TPS; steps++; }
      draw();
      if (state.over && !ended) {
        ended = true; sfx.end(); haptic("success");
        setAnnounce(`Run over. Score ${state.score}.`);
        onEndRef.current({ log: rec.log, result: resultOf(state, rec.log.length / 3) });
      }
    };

    const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (e.pointerType === "touch") { stick.move(e, p.x, p.y); return; }
      if (e.pointerType === "mouse" || e.buttons) pointer = p;
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      const role = stick.down(e, p.x, p.y);
      if (role) {
        // Touch: floating thumb-stick (the orb never hides under the thumb); second finger or double-tap dashes.
        setTouch(true);
        try { canvas.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
        const t = performance.now();
        if (role === "dash" || t - lastTap < 260) dashRef.current = true;
        lastTap = t;
        return;
      }
      pointer = p;
      dashRef.current = true;
    };
    const onUp = (e: PointerEvent) => { stick.up(e); if (e.pointerType !== "mouse") pointer = null; };
    const onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse") pointer = null; };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.type === "keydown") {
        if (k === " " && !e.repeat) dashRef.current = true;
        if ((k === "Escape" || k === "p") && !e.repeat) setPaused((p) => !p);
        keys.add(k);
      } else keys.delete(k);
    };
    const onBlur = () => { keys.clear(); stick.reset(); if (!ended) setPaused(true); };
    const onVis = () => { if (document.hidden && !ended) setPaused(true); };

    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    // Full-screen play on phones (see .game-stage CSS): lock page scrolling and pull-to-refresh while a run is live.
    document.documentElement.classList.add("is-playing");
    canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur); document.addEventListener("visibilitychange", onVis);
    canvas.focus();
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      document.documentElement.classList.remove("is-playing");
      canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur); document.removeEventListener("visibilitychange", onVis);
    };
  }, [seed, twist, rules, level, ghost, ghostName, sfx, reducedEffects, orbLook]);

  return (
    <div className="game-stage" ref={wrapRef}>
      <canvas
        ref={canvasRef} tabIndex={0} className="game-canvas"
        role="img" aria-label="ONE MORE arena. Steer with arrow keys, WASD, the mouse, or drag a thumb anywhere on touch screens. Space, click, a second finger or double-tap to dash. Escape to pause."
      />
      <p className="sr-only" role="status" aria-live="assertive">{announce}</p>
      <div className="game-controls">
        <button type="button" className="btn btn--sm" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
        {touch ? <button type="button" className="btn btn--sm btn--primary game-dash" onPointerDown={(e) => { e.preventDefault(); dashRef.current = true; }}>Dash</button> : null}
      </div>
      {paused ? (
        <div className="game-overlay">
          <p className="eyebrow">Paused</p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <button type="button" className="btn btn--primary" autoFocus onClick={() => setPaused(false)}>Resume</button>
            <button type="button" className="btn" onClick={onQuit}>Quit run</button>
          </div>
          <p className="small muted" style={{ marginTop: "1rem" }}>Quitting doesn&apos;t save the run.</p>
        </div>
      ) : null}
    </div>
  );
}
