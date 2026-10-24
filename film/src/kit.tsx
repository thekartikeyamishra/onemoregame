import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { T } from "./theme";

/** Layout helper: unit scales with the short side so every aspect ratio stays balanced. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  return { width, height, u, vertical: height > width * 1.2, landscape: width > height * 1.2 };
}

export const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

export function fadeIn(frame: number, start: number, len = 12) {
  return interpolate(frame, [start, start + len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}
export function fadeOut(frame: number, end: number, len = 10) {
  return interpolate(frame, [end - len, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

export function Words({ text, start, size, color = T.text, weight = 700, style }: { text: string; start: number; size: number; color?: string; weight?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.28}px`, fontFamily: T.font, fontSize: size, fontWeight: weight, color, letterSpacing: "-0.02em", lineHeight: 1.05, ...style }}>
      {text.split(" ").map((w, i) => {
        const s = spring({ frame: frame - start - i * 3, fps, config: { damping: 18, stiffness: 160 } });
        return <span key={i} style={{ display: "inline-block", opacity: s, transform: `translateY(${(1 - s) * size * 0.4}px)` }}>{w}</span>;
      })}
    </div>
  );
}

export function Tag({ children, color = T.violet, size }: { children: ReactNode; color?: string; size: number }) {
  return (
    <div style={{ fontFamily: T.font, fontSize: size, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color, border: `2px solid ${color}`, borderRadius: 999, padding: `${size * 0.45}px ${size * 0.9}px` }}>
      {children}
    </div>
  );
}

export function Center({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...style }}>{children}</div>;
}

/** Deterministic pseudo-random. */
export function rnd(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
