/**
 * Cosmetic looks for the player's orb. Purely visual: nothing here is read by the engine, so a skin can never change
 * a score, a hitbox or a replay. Everything is drawn in code (no image downloads).
 */

export type SkinId = "classic" | "skin_ember" | "skin_glacier" | "skin_neon" | "skin_gold" | "skin_glitch";
export type TrailId = "none" | "trail_comet" | "trail_pixel" | "trail_lightning";

export interface Skin { id: SkinId; name: string; core: string; edge: string; glow: string; pattern: "solid" | "ring" | "split" | "shine" | "glitch" }
export interface TrailLook { id: TrailId; name: string; kind: "none" | "comet" | "pixel" | "lightning" }

export const SKINS: Record<SkinId, Skin> = {
  classic: { id: "classic", name: "Classic Cyan", core: "#3ee6f0", edge: "#3ee6f0", glow: "#3ee6f0", pattern: "solid" },
  skin_ember: { id: "skin_ember", name: "Ember", core: "#ffb347", edge: "#ff5a36", glow: "#ff7a3d", pattern: "split" },
  skin_glacier: { id: "skin_glacier", name: "Glacier", core: "#e9fbff", edge: "#7fd8ff", glow: "#9fe8ff", pattern: "ring" },
  skin_neon: { id: "skin_neon", name: "Neon Pink", core: "#ff5fd2", edge: "#b14bff", glow: "#ff5fd2", pattern: "ring" },
  skin_gold: { id: "skin_gold", name: "Gold Rush", core: "#ffe27a", edge: "#d99a1e", glow: "#ffcf4a", pattern: "shine" },
  skin_glitch: { id: "skin_glitch", name: "Glitch", core: "#5ef0a6", edge: "#ff3d8b", glow: "#5ef0a6", pattern: "glitch" },
};

export const TRAILS: Record<TrailId, TrailLook> = {
  none: { id: "none", name: "No trail", kind: "none" },
  trail_comet: { id: "trail_comet", name: "Comet", kind: "comet" },
  trail_pixel: { id: "trail_pixel", name: "Pixel Dust", kind: "pixel" },
  trail_lightning: { id: "trail_lightning", name: "Lightning", kind: "lightning" },
};

export interface Look { skin: SkinId; trail: TrailId }
export const DEFAULT_LOOK: Look = { skin: "classic", trail: "none" };

export function isSkinId(v: unknown): v is SkinId { return typeof v === "string" && v in SKINS; }
export function isTrailId(v: unknown): v is TrailId { return typeof v === "string" && v in TRAILS; }

/** A look restricted to what `owned` contains (classic and no-trail are always free). */
export function allowedLook(want: Partial<Look> | null | undefined, owned: ReadonlySet<string> | readonly string[]): Look {
  const has = (id: string) => (Array.isArray(owned) ? owned.includes(id) : (owned as ReadonlySet<string>).has(id));
  const skin = want?.skin && isSkinId(want.skin) && (want.skin === "classic" || has(want.skin)) ? want.skin : "classic";
  const trail = want?.trail && isTrailId(want.trail) && (want.trail === "none" || has(want.trail)) ? want.trail : "none";
  return { skin, trail };
}

/** Draws the orb. `t` is a frame/tick counter for animated patterns; `flash` draws the hit-blink white. */
export function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, skinId: SkinId, t: number, o: { glow?: number; flash?: boolean; reduced?: boolean } = {}) {
  const s = SKINS[skinId] ?? SKINS.classic;
  ctx.save();
  if (!o.reduced && (o.glow ?? 18) > 0) { ctx.shadowColor = s.glow; ctx.shadowBlur = o.glow ?? 18; }
  if (o.flash) {
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return;
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, s.core); g.addColorStop(1, s.edge);
  ctx.fillStyle = s.pattern === "solid" ? s.core : g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  if (s.pattern === "ring") {
    ctx.strokeStyle = s.edge; ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.beginPath(); ctx.arc(x, y, r * 0.62, t * 0.08, t * 0.08 + Math.PI * 1.4); ctx.stroke();
  } else if (s.pattern === "split") {
    ctx.fillStyle = "rgba(255,90,54,0.85)";
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, t * 0.05, t * 0.05 + Math.PI); ctx.fill();
  } else if (s.pattern === "shine") {
    const a = (t * 0.06) % (Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.22, 0, Math.PI * 2); ctx.fill();
  } else if (s.pattern === "glitch") {
    const k = Math.floor(t / 6) % 4;
    ctx.fillStyle = "rgba(255,61,139,0.75)"; ctx.fillRect(x - r, y - r * 0.2 + (k - 1.5) * r * 0.3, r * 2, r * 0.22);
    ctx.fillStyle = "rgba(6,9,18,0.6)"; ctx.fillRect(x - r * 0.4 + k * 2, y - r * 0.7, r * 0.25, r * 1.4);
  }
  ctx.restore();
}

/** Keeps recent screen positions and draws the equipped trail under the orb. */
export class TrailFx {
  private pts: Array<{ x: number; y: number }> = [];
  constructor(private trail: TrailId, private skin: SkinId, private max = 14) {}
  push(x: number, y: number) {
    if (this.trail === "none") return;
    this.pts.push({ x, y });
    if (this.pts.length > this.max) this.pts.shift();
  }
  clear() { this.pts.length = 0; }
  draw(ctx: CanvasRenderingContext2D, r: number, t: number) {
    const kind = TRAILS[this.trail]?.kind ?? "none", n = this.pts.length;
    if (kind === "none" || n < 2) return;
    const color = (SKINS[this.skin] ?? SKINS.classic).glow;
    ctx.save();
    if (kind === "comet") {
      for (let i = 0; i < n; i++) {
        const p = this.pts[i], k = (i + 1) / n;
        ctx.globalAlpha = k * 0.45; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * (0.3 + k * 0.6), 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === "pixel") {
      for (let i = 0; i < n; i++) {
        const p = this.pts[i], k = (i + 1) / n, j = ((i * 7919 + t) % 9) - 4;
        ctx.globalAlpha = k * 0.7; ctx.fillStyle = i % 2 ? color : "#ffffff";
        const s = Math.max(2, r * 0.35 * k);
        ctx.fillRect(p.x + j - s / 2, p.y - j - s / 2, s, s);
      }
    } else {
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, r * 0.25); ctx.lineJoin = "bevel";
      ctx.globalAlpha = 0.8; ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = this.pts[i], off = i % 2 ? r * 0.5 : -r * 0.5, jit = ((t + i) % 3) - 1;
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x + off * 0.4 + jit, p.y - off * 0.4 - jit);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
