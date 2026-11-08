/**
 * Offline Practice: the real ONE MORE engine running locally when the device has no connection.
 * Unranked (nothing is uploaded). Reconnect to play the Daily Arena, Levels and Battle.
 */
import { ARENA_R, DASH_COOLDOWN, PLAYER_R, TPS, createGame, dirIndex, step, type GameState } from "../../src/game/engine";
import { TouchStick } from "../../src/game/touch-stick";

const SITE = "https://onemoregame.me/play?source=app";
/**
 * The same page is also the itch.io demo (body data-mode="itch") and the Chrome extension popup (data-mode="ext"):
 * there it isn't an offline fallback, and links open the full game in a new tab.
 */
const MODE = document.body.dataset.mode;
const ITCH = MODE === "itch" || MODE === "ext";
const ONLINE = MODE === "ext" ? "https://onemoregame.me/battle?utm_source=chrome_ext&utm_medium=popup" : "https://onemoregame.me/battle?utm_source=itch&utm_medium=embed";
const canvas = document.getElementById("arena") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("overlay")!;
const title = document.getElementById("title")!;
const sub = document.getElementById("sub")!;
const startBtn = document.getElementById("start") as HTMLButtonElement;
const retryBtn = document.getElementById("retry") as HTMLButtonElement;
const dashBtn = document.getElementById("dash") as HTMLButtonElement;

let W = 0, H = 0, scale = 1;
let state: GameState | null = null;
let best = Number(safeGet("om_practice_best") ?? 0);
let raf = 0, acc = 0, last = 0;
const keys = new Set<string>();
let pointer: { x: number; y: number } | null = null;
const stick = new TouchStick();
let dash = false;

function safeGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
function vibrate(ms: number) { try { navigator.vibrate?.(ms); } catch { /* ignore */ } }

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = (Math.min(W, H) - 48) / (ARENA_R * 2);
}
const sx = (x: number) => W / 2 + x * scale, sy = (y: number) => H / 2 + y * scale;

function input() {
  let dx = 0, dy = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx--;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx++;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy--;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy++;
  let dir = dx || dy ? dirIndex(dx, dy) : -1;
  const sv = dir < 0 ? stick.vector() : null;
  if (sv) dir = dirIndex(sv.dx, sv.dy);
  else if (dir < 0 && pointer && state && !stick.active) {
    const vx = pointer.x - sx(state.x), vy = pointer.y - sy(state.y);
    if (vx * vx + vy * vy > 100) dir = dirIndex(vx, vy);
  }
  const d = dash; dash = false;
  return { dir, dash: d };
}

function draw(s: GameState) {
  ctx.fillStyle = "#060912"; ctx.fillRect(0, 0, W, H);
  const frac = s.ticksLeft / s.rules.durationTicks;
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(62,230,240,0.15)";
  ctx.beginPath(); ctx.arc(W / 2, H / 2, ARENA_R * scale, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = frac < 0.17 ? "#ffbf47" : "rgba(62,230,240,0.6)";
  ctx.beginPath(); ctx.arc(W / 2, H / 2, ARENA_R * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
  ctx.fillStyle = "#ffbf47";
  for (const sh of s.shards) { const r = (s.rules.shardR - 1) * scale; ctx.save(); ctx.translate(sx(sh.x), sy(sh.y)); ctx.rotate(Math.PI / 4); ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore(); }
  if (s.power) { ctx.strokeStyle = "#5ef0a6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(s.power.x), sy(s.power.y), 11 * scale, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = "#8b7bff";
  for (const h of s.hazards) { const hs = h.s * scale; ctx.fillRect(sx(h.x) - hs, sy(h.y) - hs, hs * 2, hs * 2); }
  ctx.globalAlpha = s.invuln > 0 && (s.tick >> 2) % 2 ? 0.5 : 1;
  ctx.fillStyle = "#3ee6f0"; ctx.beginPath(); ctx.arc(sx(s.x), sy(s.y), Math.max(4, PLAYER_R * scale), 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  if (s.active.shield > 0) { ctx.strokeStyle = "#3ee6f0"; ctx.beginPath(); ctx.arc(sx(s.x), sy(s.y), PLAYER_R * scale + 5, 0, Math.PI * 2); ctx.stroke(); }
  const pad = 16;
  ctx.font = "700 22px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = "#ffbf47";
  ctx.fillText(String(s.score).padStart(5, "0"), pad + safe("left"), pad + 18 + safe("top"));
  ctx.textAlign = "right"; ctx.fillStyle = "#eef1fa";
  ctx.fillText(`${Math.ceil(s.ticksLeft / TPS)}s`, W - pad - safe("right"), pad + 18 + safe("top"));
  if (s.combo > 1) { ctx.textAlign = "left"; ctx.fillStyle = "#3ee6f0"; ctx.font = "700 16px system-ui, sans-serif"; ctx.fillText(`COMBO ×${s.combo}`, pad + safe("left"), pad + 42 + safe("top")); }
  stick.draw(ctx);
  dashBtn.style.opacity = s.dashCooldown > 0 ? String(0.4 + 0.6 * (1 - s.dashCooldown / DASH_COOLDOWN)) : "1";
}
function safe(side: "top" | "left" | "right") {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--sa-${side}`);
  return parseFloat(v) || 0;
}

function frame(now: number) {
  if (!state) return;
  acc += Math.min(250, now - last); last = now;
  const stepMs = 1000 / TPS;
  while (acc >= stepMs && !state.over) {
    const ev = step(state, input());
    for (const e of ev) { if (e.type === "hit") vibrate(40); else if (e.type === "pickup" && e.combo >= 5) vibrate(10); }
    acc -= stepMs;
  }
  draw(state);
  if (state.over) return end(state);
  raf = requestAnimationFrame(frame);
}

function start() {
  overlay.hidden = true; dashBtn.hidden = false;
  state = createGame(Math.floor(Math.random() * 2147483646) + 1);
  acc = 0; last = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
}

function end(s: GameState) {
  dashBtn.hidden = true;
  const isBest = s.score > best;
  if (isBest) { best = s.score; safeSet("om_practice_best", String(best)); }
  title.textContent = isBest ? `New practice best: ${s.score.toLocaleString("en-IN")}` : `Practice score: ${s.score.toLocaleString("en-IN")}`;
  sub.textContent = `Best ${best.toLocaleString("en-IN")} · ${s.pickups} shards · ×${s.maxCombo} combo. ${ITCH ? "Think that's good? Put it on the live leaderboard and battle friends at onemoregame.me." : "Practice runs aren't ranked. Reconnect to play the Daily Arena, Levels and Battle."}`;
  startBtn.textContent = "One more";
  overlay.hidden = false;
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (e) => { keys.add(e.code); if (e.code === "Space") { dash = true; e.preventDefault(); } if (e.code === "KeyR" && overlay.hidden === false) start(); });
window.addEventListener("keyup", (e) => keys.delete(e.code));
let lastTap = 0;
// Touch: floating thumb-stick (drag anywhere; the orb never hides under the thumb). Mouse: steer toward the pointer.
canvas.addEventListener("pointerdown", (e) => {
  const n = performance.now(), role = stick.down(e, e.clientX, e.clientY);
  if (role) { try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ } if (role === "dash" || n - lastTap < 260) dash = true; lastTap = n; return; }
  pointer = { x: e.clientX, y: e.clientY }; dash = true;
});
canvas.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") { stick.move(e, e.clientX, e.clientY); return; } if (e.pointerType === "mouse" || e.buttons) pointer = { x: e.clientX, y: e.clientY }; });
const release = (e: PointerEvent) => { stick.up(e); if (e.pointerType !== "mouse") pointer = null; };
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
dashBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); dash = true; });
startBtn.addEventListener("click", start);
retryBtn.addEventListener("click", () => {
  if (ITCH) { window.open(ONLINE, "_blank", "noopener"); return; }
  retryBtn.textContent = "Connecting…"; window.location.href = SITE;
});
window.addEventListener("online", () => { sub.textContent = "You're back online. Tap Reconnect for the full game."; });
if (ITCH) {
  title.textContent = "60 seconds. Beat your best.";
  sub.textContent = "Steer to grab gold shards, chain combos up to ×9, dash through danger. For the Daily leaderboard, 30 Levels and 5v5 Battle with friends, play the full game free at onemoregame.me.";
  startBtn.textContent = "Play"; retryBtn.textContent = "Battle friends online ↗";
} else {
  title.textContent = "You're offline";
  sub.textContent = `Play an unranked Practice run with the real arena while you wait.${best ? ` Practice best: ${best.toLocaleString("en-IN")}.` : ""}`;
}
resize();
