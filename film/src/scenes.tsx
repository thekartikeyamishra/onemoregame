import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Center, Tag, Words, ease, fadeIn, fadeOut, rnd, useLayout } from "./kit";
import { T } from "./theme";

/* All scenes receive local frames (inside a <Sequence>). */

export function Intro() {
  const f = useCurrentFrame();
  const { u } = useLayout();
  const dot = fadeIn(f, 10, 20);
  const ring = interpolate(f, [30, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <Center style={{ opacity: fadeOut(f, 120) }}>
      <svg width={600 * u} height={600 * u} viewBox="0 0 600 600" style={{ position: "absolute" }}>
        <circle cx="300" cy="300" r={20 + ring * 260} fill="none" stroke={T.cyan} strokeWidth={3} opacity={(1 - ring) * 0.8} />
        <circle cx="300" cy="300" r={10} fill={T.cyan} opacity={dot} style={{ filter: `drop-shadow(0 0 20px ${T.cyan})` }} />
      </svg>
      <div style={{ marginTop: 280 * u }}>
        <Words text="What can you do in sixty seconds?" start={55} size={56 * u} color={T.muted} weight={500} />
      </div>
    </Center>
  );
}

export function Arena() {
  const f = useCurrentFrame();
  const { u, vertical } = useLayout();
  const draw = interpolate(f, [0, 45], [0, 1], { extrapolateRight: "clamp", easing: ease });
  const R = 360;
  return (
    <Center style={{ opacity: fadeOut(f, 150), gap: 40 * u, flexDirection: vertical ? "column" : "row" }}>
      <svg width={(vertical ? 760 : 640) * u} height={(vertical ? 760 : 640) * u} viewBox="-400 -400 800 800">
        <circle r={R} fill="none" stroke={T.cyan} strokeWidth={4} strokeDasharray={2 * Math.PI * R} strokeDashoffset={(1 - draw) * 2 * Math.PI * R} transform="rotate(-90)" />
        <circle r={R * 0.62} fill="none" stroke={T.violet} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="6 16" transform={`rotate(${f * 0.6})`} opacity={fadeIn(f, 30)} />
        {[0, 1, 2, 3, 4].map((i) => {
          const s = spring({ frame: f - 40 - i * 6, fps: 30, config: { damping: 14 } });
          const a = (i / 5) * Math.PI * 2;
          return <rect key={i} x={-14} y={-14} width={28} height={28} fill={T.amber} transform={`translate(${Math.cos(a) * 220} ${Math.sin(a) * 220}) rotate(45) scale(${s})`} />;
        })}
        <circle r={22} fill={T.cyan} opacity={fadeIn(f, 20)} style={{ filter: `drop-shadow(0 0 18px ${T.cyan})` }} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 * u, alignItems: vertical ? "center" : "flex-start", width: vertical ? "auto" : 720 * u }}>
        <Words text="One arena." start={50} size={84 * u} style={{ justifyContent: vertical ? "center" : "flex-start" }} />
        <Words text="Sixty seconds." start={70} size={84 * u} color={T.cyan} style={{ justifyContent: vertical ? "center" : "flex-start" }} />
        <Words text="Pure skill." start={90} size={84 * u} color={T.amber} style={{ justifyContent: vertical ? "center" : "flex-start" }} />
      </div>
    </Center>
  );
}

/** Deterministic concept gameplay: orb follows a lissajous path collecting shards that sit on it. */
export function Play() {
  const f = useCurrentFrame();
  const { u, vertical } = useLayout();
  const R = 360;
  const pos = (fr: number) => ({ x: Math.sin(fr * 0.045) * R * 0.62, y: Math.sin(fr * 0.07 + 1) * R * 0.55 });
  const shardFrames = [20, 34, 47, 60, 72, 96, 108, 121, 140, 152, 165, 178, 190];
  const hitFrame = 84;
  let score = 0, combo = 0, lastPick = -999;
  for (const sf of shardFrames) {
    if (sf > f) break;
    if (lastPick < hitFrame && sf > hitFrame) combo = 0;
    combo = sf - lastPick <= 45 ? Math.min(combo + 1, 9) : 1;
    score += 10 * combo; lastPick = sf;
  }
  if (f >= hitFrame && lastPick < hitFrame) combo = 0;
  const p = pos(f);
  const hit = f >= hitFrame && f < hitFrame + 12;
  const hz = (k: number) => {
    const t = f - k * 40;
    return { x: -450 + t * 9, y: -200 + k * 140 + Math.sin(k) * 40, r: t * 4 };
  };
  const size = (vertical ? 860 : 760) * u;
  return (
    <AbsoluteFill style={{ opacity: fadeIn(f, 0, 10) * fadeOut(f, 210) }}>
      <Center>
        <svg width={size} height={size} viewBox="-400 -400 800 800">
          <circle r={R} fill="none" stroke={T.cyan} strokeOpacity={0.5} strokeWidth={4} />
          {shardFrames.filter((sf) => sf > f).slice(0, 5).map((sf) => {
            const s = pos(sf);
            return <rect key={sf} x={-12} y={-12} width={24} height={24} fill={T.amber} transform={`translate(${s.x} ${s.y}) rotate(45) scale(${1 + Math.sin(f * 0.3 + sf) * 0.12})`} />;
          })}
          {shardFrames.filter((sf) => sf <= f && f - sf < 14).map((sf) => {
            const s = pos(sf); const k = (f - sf) / 14;
            return Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2 + rnd(sf + i);
              return <rect key={`${sf}-${i}`} x={s.x + Math.cos(a) * k * 70} y={s.y + Math.sin(a) * k * 70} width={6} height={6} fill={T.amber} opacity={1 - k} />;
            });
          })}
          {[0, 1, 2, 3].map((k) => {
            const h = hz(k);
            return <rect key={k} x={-22} y={-22} width={44} height={44} fill="none" stroke={T.violet} strokeWidth={5} transform={`translate(${h.x} ${h.y}) rotate(${h.r})`} />;
          })}
          {[...Array(6)].map((_, i) => { const q = pos(f - (i + 1) * 2); return <circle key={i} cx={q.x} cy={q.y} r={18 - i * 2.5} fill={T.cyan} opacity={0.25 - i * 0.04} />; })}
          <circle cx={p.x} cy={p.y} r={22} fill={hit && f % 4 < 2 ? "#ffffff" : T.cyan} style={{ filter: `drop-shadow(0 0 18px ${T.cyan})` }} />
          {combo > 1 && <text x={p.x} y={p.y - 40} textAnchor="middle" fontFamily={T.font} fontSize={30} fontWeight={700} fill={T.amber}>x{combo}</text>}
        </svg>
      </Center>
      <div style={{ position: "absolute", top: 60 * u, right: 70 * u, fontFamily: T.font, fontSize: 72 * u, fontWeight: 700, color: T.amber, fontVariantNumeric: "tabular-nums" }}>
        {String(score).padStart(5, "0")}
      </div>
      <div style={{ position: "absolute", top: 70 * u, left: 70 * u }}><Tag size={22 * u} color={T.muted}>Concept animation · in development</Tag></div>
      <div style={{ position: "absolute", bottom: 90 * u, left: 0, right: 0 }}>
        <Words text="Collect. Chain. Dodge." start={20} size={64 * u} />
      </div>
    </AbsoluteFill>
  );
}

export function Social() {
  const f = useCurrentFrame();
  const { u, vertical } = useLayout();
  const you = Math.round(interpolate(f, [30, 110], [0, 2140], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }));
  const friend = Math.round(interpolate(f, [40, 130], [0, 2385], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }));
  const card = (label: string, score: number, color: string, delay: number) => {
    const s = spring({ frame: f - delay, fps: 30, config: { damping: 16 } });
    return (
      <div style={{ transform: `scale(${0.8 + 0.2 * s})`, opacity: s, border: `3px solid ${color}`, borderRadius: 28 * u, padding: `${36 * u}px ${48 * u}px`, minWidth: 380 * u, textAlign: "center", fontFamily: T.font, background: "rgba(255,255,255,.03)" }}>
        <div style={{ color: T.muted, fontSize: 30 * u, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
        <div style={{ color, fontSize: 96 * u, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{score.toLocaleString("en-IN")}</div>
        <div style={{ color: T.muted, fontSize: 24 * u }}>Seed #2041 · same arena</div>
      </div>
    );
  };
  return (
    <Center style={{ gap: 44 * u, opacity: fadeOut(f, 180) }}>
      <Words text="Same seed. Every player." start={0} size={80 * u} />
      <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: 36 * u, alignItems: "center" }}>
        {card("You", you, T.cyan, 15)}
        <div style={{ fontFamily: T.font, fontSize: 48 * u, color: T.violet, fontWeight: 700 }}>vs</div>
        {card("Friend", friend, T.amber, 25)}
      </div>
      <div style={{ opacity: fadeIn(f, 120) }}><Words text="One more?" start={120} size={64 * u} color={T.cyan} /></div>
      <div style={{ opacity: fadeIn(f, 20) }}><Tag size={22 * u}>Daily Arena &amp; friend challenges · planned · example scores</Tag></div>
    </Center>
  );
}

export function Campus() {
  const f = useCurrentFrame();
  const { u, vertical } = useLayout();
  const reveal = (i: number) => fadeIn(f, 20 + i * 8, 14);
  const W = 900, H = 520;
  const lines: Array<[number, number, number, number]> = [];
  const rounds = [8, 4, 2, 1];
  const colX = (r: number) => 40 + r * 270;
  const rowY = (r: number, i: number) => ((i + 0.5) * H) / rounds[r];
  rounds.forEach((n, r) => { if (r < 3) for (let i = 0; i < n; i++) lines.push([colX(r), rowY(r, i), colX(r + 1), rowY(r + 1, Math.floor(i / 2))]); });
  const count = f < 120 ? null : f < 140 ? 3 : f < 160 ? 2 : f < 180 ? 1 : 0;
  return (
    <Center style={{ gap: 36 * u, opacity: fadeOut(f, 210) }}>
      <Words text="Campus Clash" start={0} size={96 * u} color={T.cyan} />
      <svg width={(vertical ? 980 : 1100) * u} height={(vertical ? 580 : 560) * u} viewBox={`0 0 ${W + 80} ${H}`}>
        {lines.map(([x1, y1, x2, y2], i) => (
          <path key={i} d={`M${x1} ${y1} H${(x1 + x2) / 2} V${y2} H${x2}`} fill="none" stroke={i % 3 ? T.violet : T.cyan} strokeWidth={3} opacity={reveal(Math.floor(i / 2))} />
        ))}
        {rounds.flatMap((n, r) => Array.from({ length: n }, (_, i) => (
          <rect key={`${r}-${i}`} x={colX(r) - 18} y={rowY(r, i) - 14} width={36} height={28} rx={6} fill={r === 3 ? T.amber : T.ink} stroke={r === 3 ? T.amber : T.cyan} strokeWidth={2} opacity={reveal(r * 2)} />
        )))}
      </svg>
      <div style={{ height: 120 * u, display: "flex", alignItems: "center" }}>
        {count === null ? <Words text="Qualifiers. Brackets. Finals." start={40} size={56 * u} color={T.text} /> :
          <div style={{ fontFamily: T.font, fontSize: 140 * u, fontWeight: 700, color: count === 0 ? T.amber : T.text }}>{count === 0 ? "GO" : count}</div>}
      </div>
      <Tag size={22 * u}>For schools, colleges &amp; clubs · planned</Tag>
    </Center>
  );
}

export function Outro({ domain }: { domain: string }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const s = spring({ frame: f, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <Center style={{ gap: 30 * u }}>
      <svg width={180 * u} height={180 * u} viewBox="0 0 32 32" style={{ transform: `scale(${s}) rotate(${(1 - s) * -90}deg)` }}>
        <circle cx="16" cy="16" r="13" fill="none" stroke={T.cyan} strokeWidth="3" />
        <circle cx="16" cy="16" r="5" fill={T.amber} />
        <path d="M25 5.5 L29 1.5" stroke={T.violet} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 110 * u, letterSpacing: "0.12em", color: T.text, opacity: fadeIn(f, 10) }}>ONE MORE</div>
      <Words text="One minute. One challenge. One more." start={30} size={48 * u} color={T.muted} weight={500} />
      <div style={{ opacity: fadeIn(f, 70), marginTop: 30 * u, background: T.cyan, color: T.bg, fontFamily: T.font, fontWeight: 700, fontSize: 44 * u, padding: `${22 * u}px ${48 * u}px`, borderRadius: 18 * u }}>
        Play free in your browser
      </div>
      {domain ? <div style={{ opacity: fadeIn(f, 90), fontFamily: T.font, fontSize: 40 * u, color: T.text }}>{domain}</div> : null}
      <div style={{ opacity: fadeIn(f, 100), fontFamily: T.font, fontSize: 24 * u, color: T.muted }}>Open playtest · Browser-first</div>
    </Center>
  );
}
