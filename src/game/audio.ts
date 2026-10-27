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
  // ---- Battle mode
  /** Plays notes in sequence: [frequency, duration] pairs. */
  private seq(notes: Array<[number, number]>, type: OscillatorType = "triangle", gain = 0.09) {
    const ac = this.ac();
    if (!ac) return;
    let t = ac.currentTime;
    for (const [f, d] of notes) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
      t += d * 0.8;
    }
  }
  /** Incoming attack telegraph (two quick alarm blips). */
  warning() { this.seq([[880, 0.07], [660, 0.09]], "square", 0.045); }
  /** Our attack was sent. */
  launch() { this.tone(240, 0.22, "sawtooth", 0.07, 900); }
  /** An attack lands on us. */
  sabotage() { this.tone(520, 0.3, "sawtooth", 0.08, 120); }
  /** Knock-down. */
  ko() { this.seq([[220, 0.08], [140, 0.22]], "sawtooth", 0.12); }
  /** Defender ability used. */
  ability() { this.tone(440, 0.2, "triangle", 0.1, 1100); }
  aegis() { this.seq([[784, 0.12], [1046, 0.18]], "sine", 0.08); }
  supernova() { this.tone(90, 0.6, "sawtooth", 0.14, 1600); }
  secondWind() { this.seq([[660, 0.08], [990, 0.14]], "triangle", 0.08); }
  fizzle() { this.tone(200, 0.15, "square", 0.04, 120); }
  levelUp() { this.seq([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.22]], "triangle", 0.1); }
  victory() { this.seq([[523, 0.14], [659, 0.14], [784, 0.14], [1046, 0.4]], "triangle", 0.11); }
  defeat() { this.seq([[392, 0.2], [330, 0.2], [262, 0.45]], "triangle", 0.09); }
  /** Quiet confirmation that a defender we're watching got knocked down. */
  koFar() { this.tone(180, 0.14, "triangle", 0.05, 90); }

  unlock() { this.ac(); }
  setEnabled(v: boolean) { this.enabled = v; }
}
