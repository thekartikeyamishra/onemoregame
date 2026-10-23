import { expressions, type Mood } from "./expressions";

const INK = "#131a33";
const L = { x: 74, y: 96 };
const R = { x: 126, y: 96 };

const heart = (cx: number, cy: number, s = 1) =>
  `M${cx} ${cy + 9 * s} C${cx - 16 * s} ${cy - 2 * s} ${cx - 9 * s} ${cy - 15 * s} ${cx} ${cy - 6 * s} C${cx + 9 * s} ${cy - 15 * s} ${cx + 16 * s} ${cy - 2 * s} ${cx} ${cy + 9 * s}Z`;

const star = (cx: number, cy: number, r = 13) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
};

function OpenEye({ x, y, big = false }: { x: number; y: number; big?: boolean }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={big ? 16 : 14} ry={big ? 20 : 17} fill="#fff" stroke={INK} strokeWidth="3" />
      <g className="mitra-pupil">
        <circle cx={x} cy={y + 1} r={big ? 5 : 7.5} fill={INK} />
        <circle cx={x - 2.5} cy={y - 2.5} r={big ? 1.6 : 2.4} fill="#fff" />
      </g>
    </g>
  );
}

const arc = (x: number, y: number, up = true) =>
  up ? `M${x - 14} ${y + 4} Q${x} ${y - 12} ${x + 14} ${y + 4}` : `M${x - 14} ${y + 2} Q${x} ${y + 10} ${x + 14} ${y + 2}`;

function Eyes({ kind }: { kind: (typeof expressions)[Mood]["eyes"] }) {
  const stroke = { stroke: INK, strokeWidth: 5, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "open":
      return (
        <g className="mitra-blink">
          <OpenEye {...L} />
          <OpenEye {...R} />
        </g>
      );
    case "wide":
      return (
        <g>
          <OpenEye {...L} big />
          <OpenEye {...R} big />
        </g>
      );
    case "happy":
      return (
        <g>
          <path d={arc(L.x, L.y)} {...stroke} />
          <path d={arc(R.x, R.y)} {...stroke} />
        </g>
      );
    case "wink":
      return (
        <g>
          <OpenEye {...L} />
          <path d={arc(R.x, R.y)} {...stroke} />
        </g>
      );
    case "closed":
      return (
        <g>
          <path d={arc(L.x, L.y, false)} {...stroke} />
          <path d={arc(R.x, R.y, false)} {...stroke} />
        </g>
      );
    case "hearts":
      return (
        <g className="mitra-throb">
          <path d={heart(L.x, L.y, 1.15)} fill="#ff4d6d" stroke={INK} strokeWidth="2.5" />
          <path d={heart(R.x, R.y, 1.15)} fill="#ff4d6d" stroke={INK} strokeWidth="2.5" />
        </g>
      );
    case "stars":
      return (
        <g className="mitra-throb">
          <polygon points={star(L.x, L.y, 16)} fill="#4338ff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points={star(R.x, R.y, 16)} fill="#4338ff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    case "shades":
      return (
        <g>
          <path d="M50 84 h44 v14 a12 12 0 0 1 -12 12 h-20 a12 12 0 0 1 -12 -12z M106 84 h44 v14 a12 12 0 0 1 -12 12 h-20 a12 12 0 0 1 -12 -12z" fill={INK} />
          <path d="M94 88 h12" stroke={INK} strokeWidth="5" />
          <path d="M57 90 l10 0 M113 90 l10 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        </g>
      );
    case "spiral":
      return (
        <g className="mitra-spin-slow" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
          {[L, R].map((e) => (
            <path key={e.x} d={`M${e.x} ${e.y} m-12 0 a12 12 0 1 1 24 0 a9 9 0 1 1 -18 0 a6 6 0 1 1 12 0 a3 3 0 1 1 -6 0`} />
          ))}
        </g>
      );
    case "nerd":
      return (
        <g>
          <g className="mitra-blink">
            <OpenEye {...L} />
            <OpenEye {...R} />
          </g>
          <circle cx={L.x} cy={L.y} r="21" fill="none" stroke={INK} strokeWidth="4" />
          <circle cx={R.x} cy={R.y} r="21" fill="none" stroke={INK} strokeWidth="4" />
          <path d="M95 94 q5 -4 10 0" stroke={INK} strokeWidth="4" fill="none" />
        </g>
      );
  }
}

function Mouth({ kind }: { kind: (typeof expressions)[Mood]["mouth"] }) {
  const s = { stroke: INK, strokeWidth: 5, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "smile":
      return <path d="M80 134 Q100 152 120 134" {...s} />;
    case "grin":
      return (
        <g>
          <path d="M76 131 Q100 164 124 131 Z" fill={INK} strokeLinejoin="round" stroke={INK} strokeWidth="3" />
          <path d="M80 133 H120 Q118 139 113 141 H87 Q82 139 80 133Z" fill="#fff" />
        </g>
      );
    case "laugh":
      return (
        <g>
          <path d="M72 127 Q100 176 128 127 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="100" cy="151" rx="13" ry="6.5" fill="#ff6b81" />
        </g>
      );
    case "o":
      return <ellipse cx="100" cy="142" rx="10" ry="13" fill={INK} />;
    case "small-o":
      return <ellipse cx="100" cy="142" rx="6" ry="7" fill={INK} />;
    case "flat":
      return <path d="M86 141 H114" {...s} />;
    case "frown":
      return <path d="M82 148 Q100 131 118 148" {...s} />;
    case "wavy":
      return <path d="M80 142 Q86 135 92 142 T104 142 T116 142 T122 139" {...s} strokeWidth={4.5} />;
    case "tongue":
      return (
        <g>
          <path d="M94 141 q0 16 9 16 q9 0 9 -16 z" fill="#ff6b81" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M80 134 Q100 150 120 134" {...s} />
        </g>
      );
    case "smirk":
      return <path d="M84 141 Q104 150 121 131" {...s} />;
  }
}

function Brows({ kind }: { kind: (typeof expressions)[Mood]["brows"] }) {
  const s = { stroke: INK, strokeWidth: 4.5, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "none":
      return null;
    case "raised":
      return (
        <g>
          <path d="M60 66 Q74 57 88 66" {...s} />
          <path d="M112 66 Q126 57 140 66" {...s} />
        </g>
      );
    case "worried":
      return (
        <g>
          <path d="M60 72 L86 64" {...s} />
          <path d="M114 64 L140 72" {...s} />
        </g>
      );
    case "think":
      return (
        <g>
          <path d="M60 71 H86" {...s} />
          <path d="M114 64 Q127 56 140 63" {...s} />
        </g>
      );
  }
}

const drop = (x: number, y: number, s = 1) => `M${x} ${y} q${-7 * s} ${11 * s} 0 ${16 * s} q${7 * s} ${-5 * s} 0 ${-16 * s}z`;

function Extras({ list }: { list: readonly string[] }) {
  return (
    <g>
      {list.includes("blush") && (
        <g fill="#ff7a8a" opacity=".45">
          <ellipse cx="52" cy="121" rx="11" ry="6.5" />
          <ellipse cx="148" cy="121" rx="11" ry="6.5" />
        </g>
      )}
      {list.includes("tear") && <path className="mitra-fall" d={drop(84, 112)} fill="#6ec6ff" stroke={INK} strokeWidth="1.5" />}
      {list.includes("joy-tears") && (
        <g fill="#6ec6ff" stroke={INK} strokeWidth="1.5">
          <path className="mitra-fall" d={drop(52, 98)} />
          <path className="mitra-fall" d={drop(148, 98)} />
        </g>
      )}
      {list.includes("sweat") && <path d={drop(152, 52, 1.1)} fill="#6ec6ff" stroke={INK} strokeWidth="1.5" />}
      {list.includes("zzz") && (
        <g className="mitra-float" fill="var(--indigo)" fontFamily="var(--font-display)" fontWeight="800">
          <text x="150" y="52" fontSize="20">z</text>
          <text x="164" y="36" fontSize="26">Z</text>
        </g>
      )}
      {list.includes("confetti") && (
        <g className="mitra-confetti">
          <rect x="24" y="30" width="8" height="12" rx="2" fill="#4338ff" transform="rotate(-20 28 36)" />
          <rect x="166" y="26" width="8" height="12" rx="2" fill="#0e9f6e" transform="rotate(25 170 32)" />
          <circle cx="40" cy="58" r="4.5" fill="#ff4d6d" />
          <circle cx="160" cy="60" r="4.5" fill="#4338ff" />
          <rect x="140" y="12" width="7" height="10" rx="2" fill="#ff4d6d" transform="rotate(40 143 17)" />
          <rect x="52" y="10" width="7" height="10" rx="2" fill="#0e9f6e" transform="rotate(-35 55 15)" />
        </g>
      )}
      {list.includes("sparkle") && (
        <g fill="#fff" stroke={INK} strokeWidth="2" className="mitra-twinkle">
          <path d="M30 60 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4z" />
          <path d="M166 40 l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3z" />
        </g>
      )}
    </g>
  );
}

export function Face({ mood, className, title }: { mood: Mood; className?: string; title?: string }) {
  const e = expressions[mood];
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title ?? `Mitra, feeling ${e.label.toLowerCase()}`}>
      <ellipse cx="100" cy="193" rx="52" ry="6" fill="var(--ink)" opacity=".12" className="mitra-shadow" />
      <g className="mitra-body">
        {/* sprout */}
        <path d="M100 36 V20" stroke="#0e9f6e" strokeWidth="5" strokeLinecap="round" />
        <path d="M100 22 C 88 8, 74 14, 76 24 C 86 28, 96 26, 100 22Z" fill="#34d399" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M100 18 C 110 4, 126 8, 124 18 C 116 24, 106 22, 100 18Z" fill="#0e9f6e" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        {/* body */}
        <path
          d="M100 34 C 152 34, 182 68, 180 112 C 178 158, 146 186, 100 186 C 54 186, 22 158, 20 112 C 18 68, 48 34, 100 34Z"
          fill="#ffb627"
          stroke={INK}
          strokeWidth="4"
        />
        <path d="M46 78 C 54 58, 72 48, 92 46" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".55" />
        <g key={mood} className="mitra-pop">
          <Brows kind={e.brows} />
          <Eyes kind={e.eyes} />
          <Mouth kind={e.mouth} />
          <Extras list={e.extras} />
        </g>
      </g>
    </svg>
  );
}
