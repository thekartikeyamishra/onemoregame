/** Tiny synthesized SFX (Web Audio). Created lazily after a user gesture; never autoplays. */
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ac() {
    if (!this.enabled || typeof window === "undefined") return null;
    try {
      this.ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
    const ac = this.ac();
    if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  }

  pickup(combo: number) { this.tone(520 + combo * 70, 0.12, "triangle", 0.12); }
  hit() { this.tone(160, 0.3, "sawtooth", 0.14, 50); }
  dash() { this.tone(300, 0.12, "sine", 0.08, 700); }
  nearMiss() { this.tone(900, 0.1, "square", 0.05, 1400); }
  power() { this.tone(660, 0.18, "triangle", 0.1, 1320); }
  shield() { this.tone(1200, 0.25, "sine", 0.1, 400); }
  tick() { this.tone(660, 0.08, "sine", 0.08); }
  go() { this.tone(990, 0.2, "sine", 0.1); }
  end() { this.tone(440, 0.5, "triangle", 0.12, 220); }
  unlock() { this.ac(); }
  setEnabled(v: boolean) { this.enabled = v; }
}
