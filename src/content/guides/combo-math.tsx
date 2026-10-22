import Link from "next/link";
import type { Guide } from "./types";
import { derived, fmt, rules, stats } from "./stats";

const c = stats.twists.classic;

export const comboMath: Guide = {
  slug: "combo-math",
  title: "Combo math: why chains beat speed in ONE MORE",
  description: "The exact scoring arithmetic behind ONE MORE combos: how the ×9 cap works, what a hit really costs, and why route planning beats raw speed.",
  category: "Strategy",
  published: "2026-10-22",
  updated: "2026-10-22",
  readMinutes: 7,
  related: ["beginners-guide", "power-ups", "dash-and-near-misses"],
  sections: [
    {
      id: "the-rule",
      title: "The scoring rule",
      body: (
        <>
          <p>A shard is worth <strong>10 × your current combo</strong>. Collecting a shard within {rules.comboWindow} seconds of the previous one raises the combo by one, up to a cap of ×{rules.maxCombo}. If {rules.comboWindow} seconds pass with no pickup, the combo drops back to zero and the next shard starts again at ×1. A hazard hit also resets it.</p>
          <p>That gives three regimes. While building, each shard is worth a little more than the last: 10, 20, 30 and so on up to 90. Once at the cap, every shard is worth 90. After a break, you pay the building phase again.</p>
        </>
      ),
    },
    {
      id: "chain-value",
      title: "What a chain is worth",
      body: (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Shards in an unbroken chain</th><th scope="col">Points</th><th scope="col">Average per shard</th></tr></thead>
              <tbody>
                {[1, 3, 5, 9, 15, 30].map((n) => {
                  const pts = n <= 9 ? (10 * n * (n + 1)) / 2 : 450 + (n - 9) * 90;
                  return <tr key={n}><td>{n}</td><td>{fmt(pts)}</td><td>{Math.round(pts / n)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <p>The same thirty shards collected as ten separate chains of three are worth 600 points. Collected as one chain, they are worth {fmt(450 + 21 * 90)}. Nothing else in the game is close to that multiplier, which is why our measured play shows about {c.reactiveDash.comboShare}% of shard points coming from pickups at ×5 or higher.</p>
        </>
      ),
    },
    {
      id: "the-clock-that-matters",
      title: "The clock that matters is 1.5 seconds",
      body: (
        <>
          <p>The run timer is 60 seconds, but the timer that decides your score is the {rules.comboWindow}-second combo window. At full speed the orb covers roughly {Math.round(stats.movement.topSpeedUnitsPerSec * rules.comboWindow)} units in that time, about three-quarters of the arena&apos;s width. Four shards are always on the field and new ones spawn at least 60 units away from you, so there is almost always a shard inside one window&apos;s reach.</p>
          <p>The mistake that breaks most chains is not slowness; it is chasing the <em>nearest</em> shard into a corner and leaving the next one a full arena away. Before you take a shard, glance at where the following one is. Taking a slightly farther shard that leaves the next one close keeps the chain alive.</p>
        </>
      ),
    },
    {
      id: "what-a-hit-costs",
      title: "What one hit really costs",
      body: (
        <>
          <p>A hit removes {rules.hitPenalty} seconds from the clock and resets the combo. For a strong player both effects stack:</p>
          <ul>
            <li><strong>Lost time:</strong> our dashing test player collects about {derived.shardsPerSec} shards per second, so {rules.hitPenalty} seconds is about {Math.round(derived.shardsPerSec * rules.hitPenalty * 10) / 10} shards worth 90 each at the cap.</li>
            <li><strong>Rebuilding:</strong> the eight shards after the reset are worth 10 + 20 + … + 80 = 360 instead of 8 × 90 = 720.</li>
          </ul>
          <p>Together that is roughly <strong>{fmt(derived.hitCost)} points per hit</strong>, more than a fresh chain of nine. It explains why avoiding hits moves scores more than chasing shards faster: our measured average rose by {derived.dashGainPct}% just by dashing away from danger, mostly because the run lasted longer ({c.noDash.avgSeconds} s → {c.reactiveDash.avgSeconds} s on average).</p>
        </>
      ),
    },
    {
      id: "multipliers-stack",
      title: "How Double and near misses fit in",
      body: (
        <>
          <p>The <Link href="/guides/power-ups">Double power-up</Link> doubles every point for {rules.double} seconds, applied after the combo. At ×9 that turns 90-point shards into 180-point shards, so a Double taken at the start of a long chain is worth far more than one taken while rebuilding. A {rules.nearMiss}-point near miss (dashing through a hazard) is doubled too, and it doesn&apos;t touch your combo.</p>
          <p>Practical rule: if a Double appears while your combo is low, it is often worth waiting a second or two, building to ×5 first, and then taking it — as long as it isn&apos;t about to vanish (power-ups last {rules.powerLifetime} seconds and blink in their final second).</p>
        </>
      ),
    },
  ],
};
