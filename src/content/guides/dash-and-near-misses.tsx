import Link from "next/link";
import type { Guide } from "./types";
import { derived, fmt, rules, stats } from "./stats";

const c = stats.twists.classic;

export const dashGuide: Guide = {
  slug: "dash-and-near-misses",
  title: "Dashing and near misses: the biggest score lever in ONE MORE",
  description: "Measured over 200 arenas, dashing only when a hazard is close raised average scores by about half. How the dash works, when to use it, and common mistakes.",
  category: "Getting better",
  published: "2026-10-22",
  updated: "2026-10-22",
  readMinutes: 5,
  related: ["combo-math", "beginners-guide", "daily-twists"],
  sections: [
    {
      id: "how-it-works",
      title: "How the dash works",
      body: (
        <>
          <p>Dashing adds a burst of speed in the direction you are moving, or the direction you last moved if you are standing still. For the first {rules.dashInvuln} seconds you can pass through hazards without being hit, and passing through one scores a <strong>{rules.nearMiss}-point near miss</strong> without affecting your combo. After a dash you must wait {rules.dashCooldown} seconds before the next one; the arc around your orb fills up as it recharges.</p>
          <p>From a standstill a dash carries you roughly {stats.movement.dashDistanceFromStandstill} units. It is short on purpose: the dash is for slipping through danger, not for crossing the arena.</p>
        </>
      ),
    },
    {
      id: "what-the-numbers-say",
      title: "What the numbers say",
      body: (
        <>
          <p>We compared two versions of the same simple test player over {stats.seedsPerConfig} identical arenas (see the <Link href="/guides/methodology">methodology</Link>). The only difference: one never dashes, the other dashes whenever a hazard comes within 45 units.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col"></th><th scope="col">Never dashes</th><th scope="col">Dashes near hazards</th></tr></thead>
              <tbody>
                <tr><td>Average score</td><td>{fmt(c.noDash.avgScore)}</td><td>{fmt(c.reactiveDash.avgScore)}</td></tr>
                <tr><td>Hits per run</td><td>{c.noDash.avgHits}</td><td>{c.reactiveDash.avgHits}</td></tr>
                <tr><td>Average run length</td><td>{c.noDash.avgSeconds} s</td><td>{c.reactiveDash.avgSeconds} s</td></tr>
                <tr><td>Shards collected</td><td>{c.noDash.avgShards}</td><td>{c.reactiveDash.avgShards}</td></tr>
                <tr><td>Near misses per run</td><td>0</td><td>{c.reactiveDash.nearMissesPerRun}</td></tr>
              </tbody>
            </table>
          </div>
          <p>That is a <strong>+{derived.dashGainPct}%</strong> average. Near misses themselves are a small part of it (about {Math.round(c.reactiveDash.nearMissesPerRun * rules.nearMiss)} points per run). The big gain is indirect: fewer hits means a longer run and fewer broken chains. One hit costs a strong player roughly {fmt(derived.hitCost)} points (<Link href="/guides/combo-math">the arithmetic</Link>).</p>
        </>
      ),
    },
    {
      id: "when-to-dash",
      title: "When to dash, and when not to",
      body: (
        <ul>
          <li><strong>Dash late.</strong> Wait until the hazard is about to touch you. The invulnerability is short, so an early dash can end before you reach the hazard.</li>
          <li><strong>Dash through, not away.</strong> Dashing into a hazard&apos;s path, through it, keeps you moving toward the next shard and scores the near miss. Dashing backwards usually costs the chain.</li>
          <li><strong>Don&apos;t dash to collect.</strong> A dash spent reaching a shard leaves you without one for two seconds, which is exactly when the next hazard tends to arrive late in a run (hazards get faster and more numerous over time).</li>
          <li><strong>Mind the wall.</strong> Dashing into the wall wastes it; you slide along the edge instead of passing anything.</li>
        </ul>
      ),
    },
    {
      id: "practice-drill",
      title: "A two-minute practice drill",
      body: (
        <>
          <p>Confirm your email to unlock Quick Play, then play two runs where your only goal is <em>zero hits</em>, ignoring score. Then play one normal run. Most players find their normal score jumps immediately, because they stop treating hazards as something to run from and start treating them as something to pass through.</p>
        </>
      ),
    },
  ],
};
