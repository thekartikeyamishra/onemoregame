import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { rnd, useLayout } from "./kit";
import { S, T } from "./theme";

export function Background() {
  const frame = useCurrentFrame();
  const { width, height, u } = useLayout();
  const grid = interpolate(frame, [S.arena, S.arena + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const step = 64 * u;
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <AbsoluteFill style={{
        opacity: grid * 0.6,
        backgroundImage: `linear-gradient(rgba(160,180,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(160,180,255,.07) 1px, transparent 1px)`,
        backgroundSize: `${step}px ${step}px`, backgroundPosition: `${(frame * 0.4) % step}px 0`,
      }} />
      <AbsoluteFill style={{ background: `radial-gradient(${width * 0.6}px ${height * 0.5}px at 80% 10%, rgba(139,123,255,.16), transparent 70%), radial-gradient(${width * 0.5}px ${height * 0.4}px at 10% 90%, rgba(62,230,240,.1), transparent 70%)`, opacity: grid }} />
      <svg width={width} height={height} style={{ position: "absolute" }}>
        {Array.from({ length: 60 }, (_, i) => {
          const x = (rnd(i) * width + frame * (0.2 + rnd(i + 99) * 0.6) * u) % width;
          const y = (rnd(i + 7) * height - frame * 0.3 * u + height) % height;
          return <circle key={i} cx={x} cy={y} r={(1 + rnd(i + 3) * 2) * u} fill={i % 5 === 0 ? T.amber : T.cyan} opacity={0.15 + 0.25 * rnd(i + 11)} />;
        })}
      </svg>
    </AbsoluteFill>
  );
}
