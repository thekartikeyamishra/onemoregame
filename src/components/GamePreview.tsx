"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type V = { x: number; y: number };
type Shard = V & { r: number; born: number };
type Hazard = V & { vx: number; vy: number; s: number; rot: number };
type Particle = V & { vx: number; vy: number; life: number; color: string };

const COLORS = { bg: "#060912", grid: "rgba(160,180,255,0.07)", ring: "rgba(62,230,240,0.35)", cyan: "#3ee6f0", violet: "#8b7bff", amber: "#ffbf47" };

const RM = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(RM);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A lightweight, self-contained concept preview. It is NOT the game engine:
 * it auto-plays and can be steered with a pointer to illustrate the core loop
 * (collect shards, chain combos, dodge hazards).
 */
export function GamePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Respect reduced motion: start paused, the user can opt in.
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(RM).matches, () => false);
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const paused = userChoice ?? reduceMotion;
  const [score, setScore] = useState(0);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const lowPower = (navigator.hardwareConcurrency ?? 4) <= 2;
    const rand = mulberry32(20261021);
    let W = 0, H = 0, raf = 0, visible = true, last = performance.now(), t = 0;
    let points = 0, combo = 0, comboTimer = 0, lastShown = -1;
    const player: V & { vx: number; vy: number; hit: number } = { x: 0, y: 0, vx: 0, vy: 0, hit: 0 };
    let manual: V | null = null, manualUntil = 0;
    let shards: Shard[] = [], hazards: Hazard[] = [], particles: Particle[] = [];

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!player.x) { player.x = W / 2; player.y = H / 2; }
      draw();
    };
    const arena = () => ({ cx: W / 2, cy: H / 2, R: Math.min(W, H) * 0.42 });
    const spawnShard = () => {
      const { cx, cy, R } = arena();
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * R * 0.85;
      shards.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 6, born: t });
    };
    const spawnHazard = () => {
      const { cx, cy, R } = arena();
      const a = rand() * Math.PI * 2;
      const tx = cx + (rand() - 0.5) * R, ty = cy + (rand() - 0.5) * R;
      const x = cx + Math.cos(a) * R * 1.15, y = cy + Math.sin(a) * R * 1.15;
      const len = Math.hypot(tx - x, ty - y), sp = 55 + rand() * 45;
      hazards.push({ x, y, vx: ((tx - x) / len) * sp, vy: ((ty - y) / len) * sp, s: 12 + rand() * 8, rot: rand() * 6 });
    };
    const burst = (x: number, y: number, color: string, n: number) => {
      for (let i = 0; i < (lowPower ? n / 2 : n); i++) {
        const a = rand() * Math.PI * 2, s = 40 + rand() * 140;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
      }
    };

    const step = (dt: number) => {
      t += dt;
      const { cx, cy, R } = arena();
      while (shards.length < 4) spawnShard();
      if (hazards.length < 3 && rand() < dt * 1.2) spawnHazard();

      // Target: pointer if recently used, else nearest shard with hazard avoidance.
      let target: V;
      if (manual && t < manualUntil) target = manual;
      else {
        let best = shards[0], bd = Infinity;
        for (const s of shards) { const d = Math.hypot(s.x - player.x, s.y - player.y); if (d < bd) { bd = d; best = s; } }
        target = best ?? { x: cx, y: cy };
      }
      let ax = target.x - player.x, ay = target.y - player.y;
      for (const h of hazards) {
        const dx = player.x - h.x, dy = player.y - h.y, d = Math.hypot(dx, dy);
        if (d < 90) { ax += (dx / d) * (90 - d) * 3; ay += (dy / d) * (90 - d) * 3; }
      }
      player.vx += ax * dt * 6; player.vy += ay * dt * 6;
      player.vx *= 0.9; player.vy *= 0.9;
      player.x += player.vx * dt; player.y += player.vy * dt;
      const dr = Math.hypot(player.x - cx, player.y - cy);
      if (dr > R - 12) { player.x = cx + ((player.x - cx) / dr) * (R - 12); player.y = cy + ((player.y - cy) / dr) * (R - 12); }

      shards = shards.filter((s) => {
        if (Math.hypot(s.x - player.x, s.y - player.y) < s.r + 12) {
          combo = Math.min(combo + 1, 9); comboTimer = 1.6;
          points += 10 * combo;
          burst(s.x, s.y, COLORS.amber, 14);
          return false;
        }
        return true;
      });
      comboTimer -= dt; if (comboTimer <= 0) combo = 0;

      hazards = hazards.filter((h) => {
        h.x += h.vx * dt; h.y += h.vy * dt; h.rot += dt * 2;
        if (Math.hypot(h.x - player.x, h.y - player.y) < h.s + 10 && player.hit <= 0) {
          player.hit = 1; combo = 0; burst(player.x, player.y, COLORS.violet, 20);
        }
        return Math.hypot(h.x - cx, h.y - cy) < R * 1.4;
      });
      player.hit = Math.max(0, player.hit - dt * 1.5);

      particles = particles.filter((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt * 1.6;
        return p.life > 0;
      });
      if (points > 99999) points = 0;
      if (points !== lastShown) { lastShown = points; setScore(points); }
    };

    const draw = () => {
      if (!W) return;
      const { cx, cy, R } = arena();
      ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
      for (let x = (W % 32) / 2; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (H % 32) / 2; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = COLORS.ring; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(139,123,255,0.25)"; ctx.setLineDash([4, 10]);
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, t * 0.2, t * 0.2 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);

      for (const s of shards) {
        const pulse = 1 + Math.sin((t - s.born) * 5) * 0.15;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.PI / 4);
        ctx.shadowColor = COLORS.amber; ctx.shadowBlur = lowPower ? 0 : 12;
        ctx.fillStyle = COLORS.amber; const r = s.r * pulse; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
      }
      for (const h of hazards) {
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
        ctx.strokeStyle = COLORS.violet; ctx.lineWidth = 3; ctx.strokeRect(-h.s, -h.s, h.s * 2, h.s * 2); ctx.restore();
      }
      for (const p of particles) { ctx.globalAlpha = Math.max(p.life, 0); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
      ctx.globalAlpha = 1;
      ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = lowPower ? 0 : 20;
      ctx.fillStyle = player.hit > 0 && Math.floor(t * 20) % 2 ? "#ffffff" : COLORS.cyan;
      ctx.beginPath(); ctx.arc(player.x, player.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (combo > 1) {
        ctx.fillStyle = COLORS.amber; ctx.font = "700 14px system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(`x${combo}`, player.x, player.y - 22);
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
      if (pausedRef.current || !visible || document.hidden) return;
      step(dt); draw();
    };

    const toLocal = (e: PointerEvent): V => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse") { manual = toLocal(e); manualUntil = t + 2; } };
    const onDown = (e: PointerEvent) => { manual = toLocal(e); manualUntil = t + 2; };

    const ro = new ResizeObserver(resize); ro.observe(wrap);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.05 }); io.observe(wrap);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    for (let i = 0; i < 4; i++) spawnShard();
    resize();
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerdown", onDown); };
  }, []);

  return (
    <figure style={{ margin: 0 }}>
      <div className="preview" ref={wrapRef}>
        <canvas ref={canvasRef} role="img" aria-label="Animated concept preview: a cyan orb collects amber shards inside a circular arena while avoiding violet square hazards." />
        <span className="preview-label">Concept preview</span>
        <span className="preview-score" aria-hidden="true">{score.toString().padStart(5, "0")}</span>
        <div className="preview-hud">
          <span />
          <button type="button" className="btn btn--sm" onClick={() => setUserChoice(!paused)} aria-pressed={paused}>
            {paused ? "Play preview" : "Pause preview"}
          </button>
        </div>
      </div>
      <figcaption className="preview-caption">
        Illustrative animation, not the game itself. Move your pointer or tap inside the arena to steer.
      </figcaption>
    </figure>
  );
}
