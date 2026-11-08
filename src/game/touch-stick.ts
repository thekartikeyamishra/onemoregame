/**
 * Floating thumb-stick for touch screens. Put a thumb down anywhere and drag: the orb moves in the drag direction,
 * so the thumb never covers the orb (the old "steer toward the finger" mode hid it under the thumb on phones).
 * A second finger tapping anywhere dashes. Mouse and pen keep "steer toward the pointer".
 */
export class TouchStick {
  private id: number | null = null;
  ox = 0; oy = 0; x = 0; y = 0;
  /** Max knob travel in CSS px. */
  readonly R = 46;
  private readonly dead = 9;

  get active() { return this.id !== null; }

  /** Returns "stick" when this pointer now drives the stick, "dash" for an extra finger, null for mouse/pen. */
  down(e: PointerEvent, x: number, y: number): "stick" | "dash" | null {
    if (e.pointerType !== "touch") return null;
    if (this.id !== null) return "dash";
    this.id = e.pointerId; this.ox = this.x = x; this.oy = this.y = y;
    return "stick";
  }
  move(e: PointerEvent, x: number, y: number) {
    if (e.pointerId !== this.id) return;
    let dx = x - this.ox, dy = y - this.oy;
    const d = Math.hypot(dx, dy);
    // Drag past the rim and the stick follows the thumb (no dead feeling when the thumb drifts).
    if (d > this.R * 1.6) { const k = (d - this.R * 1.6) / d; this.ox += dx * k; this.oy += dy * k; dx = x - this.ox; dy = y - this.oy; }
    this.x = x; this.y = y;
  }
  up(e: PointerEvent) { if (e.pointerId === this.id) this.id = null; }
  reset() { this.id = null; }

  /** Drag vector, or null inside the dead zone / when idle. */
  vector(): { dx: number; dy: number } | null {
    if (this.id === null) return null;
    const dx = this.x - this.ox, dy = this.y - this.oy;
    return dx * dx + dy * dy > this.dead * this.dead ? { dx, dy } : null;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.id === null) return;
    const dx = this.x - this.ox, dy = this.y - this.oy, d = Math.hypot(dx, dy), k = d > this.R ? this.R / d : 1;
    ctx.save();
    ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.strokeStyle = "rgba(238,241,250,0.6)";
    ctx.beginPath(); ctx.arc(this.ox, this.oy, this.R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.65; ctx.fillStyle = "rgba(62,230,240,0.55)";
    ctx.beginPath(); ctx.arc(this.ox + dx * k, this.oy + dy * k, 18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
