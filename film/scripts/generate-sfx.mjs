// Generates original, deterministic sound effects (no third-party audio). Output: public/sfx/*.wav (44.1 kHz, 16-bit mono).
import { mkdirSync, writeFileSync } from "node:fs";

const SR = 44100;
function wav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  return buf;
}
function render(seconds, fn) { const n = Math.floor(SR * seconds); return Array.from({ length: n }, (_, i) => fn(i / SR, i / n)); }
let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const sin = (f, t) => Math.sin(2 * Math.PI * f * t);

const sfx = {
  pulse: render(1.2, (t, p) => sin(55 + 20 * (1 - p), t) * Math.exp(-t * 3) * 0.9),
  pickup: render(0.25, (t) => (sin(880, t) * 0.6 + sin(1320, t) * 0.4) * Math.exp(-t * 18) * 0.7),
  whoosh: render(0.7, (t, p) => noise() * Math.sin(Math.PI * p) * 0.35 * (0.5 + 0.5 * sin(3 + p * 8, t))),
  hit: render(0.35, (t) => (noise() * 0.5 + sin(90, t) * 0.8) * Math.exp(-t * 12) * 0.8),
  riser: render(2.0, (t, p) => (sin(200 + 600 * p * p, t) * 0.3 + noise() * 0.15 * p) * p),
  impact: render(1.6, (t) => (sin(48, t) * 0.9 + noise() * 0.3 * Math.exp(-t * 20)) * Math.exp(-t * 2.2)),
  bed: render(36, (t) => {
    const beat = (t * 2) % 1; // 120 BPM
    const kick = sin(50 + 60 * Math.exp(-beat * 30), t) * Math.exp(-beat * 9) * 0.5 * (t > 4 ? 1 : 0);
    const pad = (sin(110, t) + sin(164.81, t) * 0.6 + sin(220, t) * 0.4) * 0.07 * Math.min(1, t / 3) * Math.min(1, (36 - t) / 2);
    const hat = noise() * Math.exp(-((t * 4) % 1) * 40) * 0.06 * (t > 9 ? 1 : 0);
    return kick + pad + hat;
  }),
};
mkdirSync(new URL("../public/sfx/", import.meta.url), { recursive: true });
for (const [name, s] of Object.entries(sfx)) writeFileSync(new URL(`../public/sfx/${name}.wav`, import.meta.url), wav(s));
console.log("Generated:", Object.keys(sfx).join(", "));
