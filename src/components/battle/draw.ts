"use client";

import { ARENA_R, PLAYER_R, POWER_R, TPS } from "@/game/engine";
import type { DefenderRun, Effect } from "@/game/battle/sim";

export const C = { bg: "#060912", grid: "rgba(160,180,255,0.06)", ring: "rgba(62,230,240,0.55)", amber: "#ffbf47", violet: "#8b7bff", red: "#ff4d6d", cyan: "#3ee6f0", green: "#5ef0a6", white: "#eef1fa" };
const POWER_COLOR: Record<string, string> = { shield: "#3ee6f0", slow: "#8b7bff", magnet: "#5ef0a6", double: "#ffbf47" };

export interface Ghost { x: number; y: number; color: string; name: string }
export interface DrawOpts {
  color: string; name?: string; total: number; nowTick: number; incoming?: Effect[]; ghosts?: Ghost[];
  compact?: boolean; reduced?: boolean; selected?: boolean; aim?: { x: number; y: number } | null;
  /** Called for every simulation event before it is drawn (sound effects). */
  onFx?: (kind: string) => void;
}

/** Floating text and bursts, keyed per canvas. */
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; text?: string; ring?: number }

/** Draws one defender's arena into a square region of the canvas. Pure rendering: never touches the simulation. */
export function drawArena(ctx: CanvasRenderingContext2D, run: DefenderRun, w: number, h: number, o: DrawOpts, particles: Particle[]) {
  const s = run.state, t = s.tick;
  const scale = (Math.min(w, h) / 2 - (o.compact ? 4 : 12)) / ARENA_R;
  const cx = w / 2, cy = h / 2;
  const X = (v: number) => cx + v * scale, Y = (v: number) => cy + v * scale;
  ctx.save();
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
  // Surge tints the arena red; Mirror shifts it magenta.
  if (run.until.surge > t) { ctx.fillStyle = "rgba(255,60,90,0.08)"; ctx.fillRect(0, 0, w, h); }
  if (run.until.mirror > t) { ctx.fillStyle = "rgba(255,95,162,0.09)"; ctx.fillRect(0, 0, w, h); }
  if (!o.compact) {
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    const g = 30 * scale;
    for (let x = cx % g; x < w; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = cy % g; y < h; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }
  // Arena ring = round timer.
  const frac = Math.max(0, 1 - o.nowTick / o.total);
  ctx.lineWidth = o.compact ? 2 : 3; ctx.strokeStyle = "rgba(62,230,240,0.15)";
  ctx.beginPath(); ctx.arc(cx, cy, ARENA_R * scale, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = o.selected ? C.red : frac < 0.17 ? C.amber : C.ring;
  ctx.beginPath(); ctx.arc(cx, cy, ARENA_R * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();

  // Shards (flicker under Erosion).
  const sr = s.rules.shardR;
  const eroding = run.until.erosion > t;
  for (const sh of s.shards) {
    if (eroding && (t >> 2) % 3 === 0) continue;
    const r = Math.max(2, (sr - 1) * scale * (1 + Math.sin((t - sh.born) * 0.15) * 0.12));
    ctx.save(); ctx.translate(X(sh.x), Y(sh.y)); ctx.rotate(Math.PI / 4);
    if (!o.reduced && !o.compact) { ctx.shadowColor = C.amber; ctx.shadowBlur = 10; }
    ctx.fillStyle = C.amber; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
  }
  // Power-up.
  if (s.power) {
    const col = POWER_COLOR[s.power.type] ?? C.cyan;
    ctx.strokeStyle = run.until.jam > t ? "rgba(160,160,160,0.5)" : col; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k + t * 0.03; const px = X(s.power.x) + Math.cos(a) * POWER_R * scale, py = Y(s.power.y) + Math.sin(a) * POWER_R * scale; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.stroke();
  }
  // Telegraphed attacks: strike rings and incoming arrows.
  for (const e of o.incoming ?? []) {
    const left = e.tick - o.nowTick, k = 1 - left / 180;
    if (e.kind === "strike" && e.x !== undefined && e.y !== undefined) {
      ctx.strokeStyle = `rgba(255,77,109,${0.35 + 0.5 * k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(e.x), Y(e.y), (15 + 30 * (1 - k)) * scale, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(e.x) - 6, Y(e.y)); ctx.lineTo(X(e.x) + 6, Y(e.y)); ctx.moveTo(X(e.x), Y(e.y) - 6); ctx.lineTo(X(e.x), Y(e.y) + 6); ctx.stroke();
    }
  }
  // Hazards (mines pulse red).
  for (const hz of s.hazards) {
    const mine = hz.ttl !== undefined;
    const half = hz.s * scale;
    ctx.fillStyle = mine ? `rgba(255,77,109,${0.6 + 0.4 * Math.sin(t * 0.4)})` : C.violet;
    if (!o.reduced && !o.compact) { ctx.shadowColor = ctx.fillStyle as string; ctx.shadowBlur = 10; }
    ctx.fillRect(X(hz.x) - half, Y(hz.y) - half, half * 2, half * 2);
    ctx.shadowBlur = 0;
  }
  // Teammate ghosts.
  for (const g of o.ghosts ?? []) {
    ctx.globalAlpha = 0.35; ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.arc(X(g.x), Y(g.y), PLAYER_R * scale, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.font = "600 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(g.name.slice(0, 10), X(g.x), Y(g.y) - 14);
    ctx.globalAlpha = 1;
  }
  // The player orb.
  const down = run.downUntil > t;
  const px = X(s.x), py = Y(s.y), pr = Math.max(3, PLAYER_R * scale);
  if (!o.reduced) { ctx.shadowColor = o.color; ctx.shadowBlur = o.compact ? 6 : 18; }
  ctx.globalAlpha = down ? 0.35 + 0.3 * Math.sin(t * 0.5) : s.invuln > 0 && (t >> 2) % 2 ? 0.6 : 1;
  ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (s.active.shield > 0) { ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, Math.PI * 2); ctx.stroke(); }
  if (s.active.magnet > 0 && !o.compact) { ctx.strokeStyle = "rgba(94,240,166,0.25)"; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(px, py, 110 * scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (s.active.double > 0) { ctx.fillStyle = C.amber; ctx.font = `700 ${o.compact ? 9 : 12}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText("×2", px, py - pr - 6); }
  // Aim marker for attackers.
  if (o.aim) { ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(o.aim.x), Y(o.aim.y), 16 * scale, 0, Math.PI * 2); ctx.stroke(); }

  // Blackout (Eclipse): darkness except a small circle around the orb.
  if (run.until.blackout > t) {
    const grd = ctx.createRadialGradient(px, py, 40 * scale, px, py, 120 * scale);
    grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(0,0,0,0.94)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  }
  // Jam: static lines.
  if (run.until.jam > t && !o.reduced) {
    ctx.fillStyle = "rgba(200,200,220,0.07)";
    for (let k = 0; k < (o.compact ? 6 : 18); k++) { const yy = ((t * 37 + k * 53) % 997) / 997 * h; ctx.fillRect(0, yy, w, 1 + (k % 2)); }
  }

  // Turn simulation fx into particles.
  for (const f of run.fx) {
    o.onFx?.(f.kind);
    const fx = f.x !== undefined ? X(f.x) : px, fy = f.y !== undefined ? Y(f.y) : py;
    switch (f.kind) {
      case "pickup": if (!o.compact) burst(particles, fx, fy, C.amber, 6, o.reduced); break;
      case "hit": burst(particles, px, py, C.red, o.compact ? 6 : 16, o.reduced); particles.push({ x: px, y: py - 10, vx: 0, vy: -0.6, life: 50, color: C.red, text: "KO" }); break;
      case "shieldBreak": ring(particles, px, py, C.cyan); break;
      case "power": ring(particles, fx, fy, C.green); break;
      case "secondWind": particles.push({ x: px, y: py - 16, vx: 0, vy: -0.5, life: 60, color: C.green, text: "SECOND WIND" }); break;
      case "fizzle": particles.push({ x: px, y: py - 16, vx: 0, vy: -0.5, life: 40, color: "#999", text: "jammed" }); break;
      case "supernova": ring(particles, px, py, "#fff", 4); burst(particles, px, py, C.amber, 30, o.reduced); break;
      case "aegis": ring(particles, px, py, C.cyan, 2); break;
      case "bulwark": case "tractor": case "stasis": case "overdrive": case "purge": ring(particles, px, py, C.cyan); break;
      case "strike": case "swarm": case "mirror": case "erosion": case "surge": case "jam": case "eclipse":
        ring(particles, f.kind === "strike" && f.x !== undefined ? fx : px, f.kind === "strike" && f.y !== undefined ? fy : py, C.red, 2);
        particles.push({ x: px, y: py - 20, vx: 0, vy: -0.4, life: 70, color: C.red, text: f.kind.toUpperCase() });
        break;
    }
  }
  run.fx.length = 0;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, p.life / 30);
    if (p.text) { ctx.fillStyle = p.color; ctx.font = `800 ${o.compact ? 9 : 13}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText(p.text, p.x, p.y); }
    else if (p.ring !== undefined) { p.ring += 2.2; ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.ring, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.fillStyle = p.color; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function burst(ps: Particle[], x: number, y: number, color: string, n: number, reduced?: boolean) {
  if (reduced) n = Math.min(n, 4);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const v = 1 + (i % 3); ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 26, color }); }
  if (ps.length > 300) ps.splice(0, ps.length - 300);
}
function ring(ps: Particle[], x: number, y: number, color: string, count = 1) {
  for (let i = 0; i < count; i++) ps.push({ x, y, vx: 0, vy: 0, life: 32 + i * 8, color, ring: 6 + i * 10 });
}

/** Converts a click inside a drawArena region to arena units. */
export function toArena(px: number, py: number, w: number, h: number, compact: boolean): { x: number; y: number } {
  const scale = (Math.min(w, h) / 2 - (compact ? 4 : 12)) / ARENA_R;
  return { x: (px - w / 2) / scale, y: (py - h / 2) / scale };
}

export const fmtClock = (ticks: number) => {
  const sec = Math.max(0, Math.ceil(ticks / TPS));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};
