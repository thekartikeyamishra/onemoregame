"use client";

import { useEffect, useRef, useState } from "react";
import { ARENA_R, POWER_R, createGame, step, type InputLog, type Rules, type TwistId } from "@/game/engine";
import { TrailFx, drawOrb, type Look } from "@/game/cosmetics";
import { formatInr, product } from "@/lib/shop/catalog";
import { isNativeApp } from "@/lib/native";
import { track } from "@/lib/analytics";
import { buy, useShop } from "./checkout";

/**
 * Replay Studio: re-simulates a verified run from its inputs (the engine is deterministic) and draws it as a vertical
 * 720×1280 highlight at 2× speed. Watching is free; saving the video is the paid feature.
 */
export interface ReplayInput { seed: number; twist: TwistId; rules: Partial<Rules>; log: InputLog; score: number; label: string }

const W = 720, H = 1280, SPEED = 2;
type Part = { x: number; y: number; vx: number; vy: number; life: number; c: string };

/** Starts drawing the replay into `canvas`. Returns stop(). Calls onDone once the outro has shown. */
function play(canvas: HTMLCanvasElement, r: ReplayInput, look: Look, name: string, onDone: () => void): () => void {
  const ctx = canvas.getContext("2d")!;
  canvas.width = W; canvas.height = H;
  const s = createGame(r.seed, r.twist, r.rules);
  const total = s.rules.durationTicks;
  const scale = (W - 24) / (ARENA_R * 2 * 1.04), cx = W / 2, cy = 660;
  const at = (x: number, y: number) => [cx + x * scale, cy + y * scale] as const;
  const trail = new TrailFx(look.trail, look.skin, 12);
  const parts: Part[] = [];
  let i = 0, dir = -1, frame = 0, outro = 0, raf = 0, stopped = false;
  const burst = (x: number, y: number, c: string, n: number) => { for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 5; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c }); } };

  const text = (t: string, x: number, y: number, size: number, color: string, weight = 800, align: CanvasTextAlign = "center") => {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(t, x, y);
  };

  const frameFn = () => {
    if (stopped) return;
    raf = requestAnimationFrame(frameFn);
    frame++;
    if (frame > 30 && !s.over) {
      for (let k = 0; k < SPEED && !s.over; k++) {
        let dash = false;
        if (i < r.log.length && r.log[i] === s.tick) { dir = r.log[i + 1]; dash = r.log[i + 2] === 1; i += 3; }
        for (const e of step(s, { dir, dash })) {
          if (e.type !== "pickup" && e.type !== "hit" && e.type !== "power") continue;
          const [ex, ey] = at(e.x, e.y);
          burst(ex, ey, e.type === "pickup" ? "#ffbf47" : e.type === "hit" ? "#8b7bff" : "#5ef0a6", e.type === "hit" ? 18 : 12);
        }
      }
    }
    // background
    ctx.fillStyle = "#060912"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(160,180,255,0.06)"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // header
    text("ONE MORE", W / 2, 96, 56, "#eef1fa", 900);
    text(r.label.toUpperCase(), W / 2, 150, 26, "#ffbf47", 800);
    text(name, W / 2, 196, 30, "rgba(238,241,250,0.85)", 700);
    // arena + timer ring
    const frac = s.ticksLeft / total;
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(62,230,240,0.15)"; ctx.beginPath(); ctx.arc(cx, cy, ARENA_R * scale, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = frac < 0.17 ? "#ffbf47" : "rgba(62,230,240,0.7)"; ctx.beginPath(); ctx.arc(cx, cy, ARENA_R * scale, -1.5708, -1.5708 + 6.283 * frac); ctx.stroke();
    for (const sh of s.shards) { const [x, y] = at(sh.x, sh.y), rr = (s.rules.shardR - 1) * scale; ctx.save(); ctx.translate(x, y); ctx.rotate(0.785); ctx.shadowColor = "#ffbf47"; ctx.shadowBlur = 14; ctx.fillStyle = "#ffbf47"; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore(); }
    for (const h of s.hazards) { const [x, y] = at(h.x, h.y), hs = h.s * scale; ctx.strokeStyle = h.hit ? "rgba(139,123,255,0.3)" : "#8b7bff"; ctx.lineWidth = 4; ctx.strokeRect(x - hs, y - hs, hs * 2, hs * 2); }
    if (s.power) { const [x, y] = at(s.power.x, s.power.y); ctx.strokeStyle = "#5ef0a6"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, POWER_R * scale * 1.3, 0, 6.283); ctx.stroke(); }
    for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life -= 0.035; if (p.life <= 0) { parts.splice(k, 1); continue; } ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    const [px, py] = at(s.x, s.y), pr = 10 * scale;
    trail.push(px, py); trail.draw(ctx, pr, frame);
    drawOrb(ctx, px, py, pr, look.skin, frame, { glow: s.dashing ? 34 : 22, flash: s.invuln > 0 && s.dashing === 0 && Math.floor(s.tick / 4) % 2 === 0 });
    if (s.active.shield > 0) { ctx.strokeStyle = "#9ff6fb"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 19 * scale, 0, 6.283); ctx.stroke(); }
    // live score
    text(s.score.toLocaleString("en-IN"), W / 2, 1110, 92, "#ffbf47", 900);
    text(s.combo > 1 ? `COMBO ×${s.combo}` : `${Math.ceil(s.ticksLeft / 60)}s left`, W / 2, 1160, 30, s.combo > 1 ? "#3ee6f0" : "rgba(238,241,250,0.7)", 800);
    text("onemoregame.me", W / 2, 1238, 28, "rgba(238,241,250,0.75)", 700);
    if (frame <= 30) { ctx.fillStyle = `rgba(6,9,18,${1 - frame / 30})`; ctx.fillRect(0, 0, W, H); }
    if (s.over) {
      outro++;
      ctx.fillStyle = `rgba(6,9,18,${Math.min(0.88, outro / 20)})`; ctx.fillRect(0, 0, W, H);
      if (outro > 8) {
        text(r.label.toUpperCase(), W / 2, 470, 34, "#ffbf47");
        text(r.score.toLocaleString("en-IN"), W / 2, 620, 150, "#eef1fa", 900);
        text("Can you beat it?", W / 2, 740, 44, "#3ee6f0");
        text("Free in your browser · onemoregame.me", W / 2, 810, 28, "rgba(238,241,250,0.8)", 700);
      }
      if (outro === 150) onDone();
    }
  };
  raf = requestAnimationFrame(frameFn);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1] ?? ""); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });
}

type Fn = (o?: unknown) => Promise<unknown>;
/** Hand the clip to the share sheet (apps: Filesystem + Share plugins; browsers: Web Share with files, else download). */
async function deliver(blob: Blob, score: number): Promise<string> {
  const ext = blob.type.includes("mp4") ? "mp4" : "webm", name = `onemore-${score}.${ext}`;
  const text = `My ONE MORE run: ${score.toLocaleString("en-IN")}. Can you beat it? https://onemoregame.me/play`;
  if (isNativeApp()) {
    const fs = window.Capacitor?.Plugins?.Filesystem as Record<string, Fn> | undefined, share = window.Capacitor?.Plugins?.Share as Record<string, Fn> | undefined;
    if (!fs || !share) return "Update ONE MORE from the store to save videos.";
    const w = (await fs.writeFile({ path: name, data: await blobToBase64(blob), directory: "CACHE" })) as { uri?: string };
    if (!w?.uri) return "Couldn't save the video.";
    try { await share.share({ title: "ONE MORE replay", text, files: [w.uri], dialogTitle: "Share your replay" }); } catch { /* closed the sheet */ }
    return "Ready. Pick Instagram, WhatsApp or Save to keep it.";
  }
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text }); return "Shared!"; } catch { /* closed the sheet: fall back to a download */ }
  }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return `Saved as ${name}.`;
}

export function ReplayStudio({ run, look, onClose }: { run: ReplayInput; look: Look; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setState, prices } = useShop();
  const [mode, setMode] = useState<"preview" | "recording" | "done">("preview");
  const [loop, setLoop] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const owns = state.owned.includes("replay_studio");
  const name = state.displayName ?? "";

  useEffect(() => { track("replay_opened", { owned: owns }); }, [owns]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || mode === "done") return;
    let rec: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    if (mode === "recording") {
      const mime = pickMime();
      const stream = (cv as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream?.(30);
      if (!mime || !stream) { queueMicrotask(() => { setMsg("This device can't record video. Try Chrome, or the ONE MORE app."); setMode("preview"); }); return; }
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: mime.split(";")[0] });
        try { setMsg(await deliver(blob, run.score)); track("replay_saved", {}); } catch { setMsg("Couldn't save the video. Please try again."); }
        setMode("done");
      };
      rec.start(1000);
    }
    const stop = play(cv, run, look, name, () => { if (rec && rec.state === "recording") rec.stop(); else setLoop((n) => n + 1); });
    return () => { stop(); if (rec && rec.state === "recording") { rec.onstop = null; rec.stop(); } };
  }, [mode, loop, run, look, name]);

  async function unlock(id: "replay_studio" | "founder_pack") {
    setBusy(true); setMsg(null);
    const r = await buy(id, state, prices, "replay");
    setBusy(false);
    if (r.ok) { setState((s) => ({ ...s, owned: r.owned })); setMsg("Unlocked! Tap Save video."); }
    else if (!r.cancelled) setMsg(r.error);
  }

  const price = (id: "replay_studio" | "founder_pack") => prices[id]?.priceString ?? formatInr(product(id).pricePaise);
  return (
    <div className="replay-modal" role="dialog" aria-modal="true" aria-labelledby="replay-h">
      <div className="replay-sheet">
        <button type="button" className="chip-x replay-close" aria-label="Close replay" onClick={onClose}>×</button>
        <h2 id="replay-h" className="sr-only">Replay of your run</h2>
        <canvas ref={canvasRef} className="replay-canvas" aria-label={`Replay of your ${run.score} point run`} />
        <div className="replay-actions">
          {mode === "recording" ? <p className="small" role="status"><span className="spinner" aria-hidden="true" /> Recording your clip… keep this screen open (about 35 s).</p> : owns ? (
            <button type="button" className="btn btn--primary" onClick={() => { setMsg(null); setMode("recording"); }}>🎬 Save video</button>
          ) : state.loaded ? (
            <div className="replay-offer">
              <p><b>This run deserves to be seen.</b> Save it as a vertical video with your name and score, ready for Stories, Reels and WhatsApp.</p>
              <div className="btn-row">
                <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void unlock("replay_studio")}>Unlock Replay Studio · {price("replay_studio")}</button>
                <button type="button" className="btn" disabled={busy} onClick={() => void unlock("founder_pack")}>Founder Pack · {price("founder_pack")}</button>
              </div>
              <p className="small muted">One-time purchase: save every future run too. Cosmetic only, never affects scores.{!state.signedIn && !isNativeApp() ? " Sign in first so it's saved to your account." : ""}</p>
            </div>
          ) : null}
          {msg ? <p className="small" role="status">{msg}</p> : null}
        </div>
      </div>
    </div>
  );
}
