import Link from "next/link";
import type { Guide } from "./types";
import { fmt, rules, stats } from "./stats";

export const powerUpsGuide: Guide = {
  slug: "power-ups",
  title: "Every ONE MORE power-up explained, and when to grab it",
  description: "Shield, Slow-mo, Magnet and Double: exact durations, what each one really does in the engine, and the moments when each is worth a detour.",
  category: "Strategy",
  published: "2026-10-22",
  updated: "2026-10-22",
  readMinutes: 6,
  related: ["combo-math", "daily-twists", "dash-and-near-misses"],
  sections: [
    {
      id: "how-they-spawn",
      title: "How power-ups appear",
      body: (
        <>
          <p>Power-ups are hexagons with a symbol inside. The first appears about eight seconds into a run, then one every 10–15 seconds. Only one is ever on the field, and it disappears after {rules.powerLifetime} seconds, blinking during its final second. Our measured runs collect about {stats.twists.classic.reactiveDash.avgPowerUps} per run.</p>
          <p>They spawn from the arena seed. On the Daily Arena that means everyone gets the same power-ups in the same places, which is why routes shared in the community are genuinely useful.</p>
        </>
      ),
    },
    {
      id: "the-four",
      title: "The four power-ups",
      body: (
        <>
          <h3>◯ Shield — {rules.shield} s or one hit</h3>
          <p>The next hazard that touches you is absorbed: no time penalty and, importantly, your combo survives. You also get a brief grace period afterwards. Because one hit costs a strong player hundreds of points (<Link href="/guides/combo-math">see the maths</Link>), a Shield is often the most valuable pickup late in a run when hazards are fastest.</p>
          <h3>◷ Slow-mo — {rules.slow} s</h3>
          <p>Every hazard moves at half speed. It doesn&apos;t slow you or the clock. Use it to cut straight through a crowded middle you would normally avoid.</p>
          <h3>U Magnet — {rules.magnet} s</h3>
          <p>Shards within {rules.magnetRange} units drift toward you. It shines when shards cluster, and it makes the {rules.comboWindow}-second combo window much easier to hit, so it is a good pickup when you are building a chain.</p>
          <h3>×2 Double — {rules.double} s</h3>
          <p>Doubles every point you score, including near misses. Its value depends almost entirely on your combo: at ×9 each shard becomes 180 points. Take it at the start of a long chain, not right after a hit.</p>
        </>
      ),
    },
    {
      id: "detour-or-not",
      title: "Is it worth a detour?",
      body: (
        <>
          <p>A detour is only worth it if it doesn&apos;t break your chain. A quick rule of thumb:</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Situation</th><th scope="col">Detour?</th></tr></thead>
              <tbody>
                <tr><td>Shield, last 20 seconds, combo ×5 or more</td><td>Yes, if you can reach it within one shard</td></tr>
                <tr><td>Double while combo is ×1–×3</td><td>Only if it&apos;s on your route</td></tr>
                <tr><td>Magnet with shards clustered nearby</td><td>Yes</td></tr>
                <tr><td>Slow-mo with the field almost empty</td><td>No</td></tr>
                <tr><td>Any power-up blinking (final second)</td><td>Only if you&apos;re already next to it</td></tr>
              </tbody>
            </table>
          </div>
        </>
      ),
    },
    {
      id: "twists",
      title: "Power-ups on twist days",
      body: (
        <>
          <p>Two <Link href="/guides/daily-twists">Daily twists</Link> change power-ups. On <strong>Magnet Monday</strong> every power-up is a Magnet. On <strong>Frenzy Friday</strong> they appear about twice as often, and our measured average rose to {fmt(stats.twists.frenzy.reactiveDash.avgScore)} from {fmt(stats.twists.classic.reactiveDash.avgScore)} on the classic rules. <strong>Shield Thursday</strong> starts you with a Shield already active, so spend the first ten seconds playing a little more aggressively than usual.</p>
        </>
      ),
    },
  ],
};
