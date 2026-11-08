import Link from "next/link";
import type { Guide } from "./types";
import { derived, fmt, rules, stats } from "./stats";

const c = stats.twists.classic;

export const beginnersGuide: Guide = {
  slug: "beginners-guide",
  title: "ONE MORE beginner's guide: from your first run to 8,000 points",
  description: "A practical first-day guide to ONE MORE: how the 60-second run works, the three habits that matter most, and realistic score targets from measured play.",
  category: "Getting better",
  published: "2026-10-22",
  updated: "2026-10-22",
  readMinutes: 6,
  related: ["dash-and-near-misses", "combo-math", "power-ups"],
  sections: [
    {
      id: "what-a-run-is",
      title: "What a run actually is",
      body: (
        <>
          <p>Every game of ONE MORE is a single run of up to 60 seconds inside a circular arena. You steer a cyan orb. Four amber diamond <strong>shards</strong> are always on the field; violet <strong>square hazards</strong> sweep across from outside the ring. The ring itself is your timer: it drains clockwise as the run goes on.</p>
          <p>Two things end a run early or make it worse. Touching a hazard costs <strong>{rules.hitPenalty} seconds</strong> of clock and resets your combo, then gives you {rules.hitGrace} seconds of grace so one mistake can&apos;t chain into three. Nothing else can hurt you: the wall stops you without damage and you slide along it.</p>
          <p>If you have never played, open <Link href="/play">today&apos;s Daily Arena</Link> now and play one run without trying to win. The rest of this guide will make more sense with a single run behind you.</p>
        </>
      ),
    },
    {
      id: "controls",
      title: "Controls in thirty seconds",
      body: (
        <>
          <ul>
            <li><strong>Steer:</strong> arrow keys or WASD, move the mouse, or on a touch screen put your thumb down anywhere and drag: a small joystick appears there, so your thumb never covers the orb. The orb accelerates toward the direction you hold and glides to a stop when you let go.</li>
            <li><strong>Dash:</strong> Space, a mouse click, a double-tap, or the on-screen Dash button. It fires in the direction you are moving (or last moved), makes you invulnerable for {rules.dashInvuln} seconds and then needs {rules.dashCooldown} seconds to recharge. A thin arc around the orb shows the cooldown.</li>
            <li><strong>Pause:</strong> Esc or P. <strong>One more:</strong> R on the results screen.</li>
          </ul>
          <p>At full speed the orb crosses the whole arena in about {stats.movement.secondsToCrossArena} seconds, so the field is small enough that you never need to panic-sprint. A dash from a standstill moves you roughly {stats.movement.dashDistanceFromStandstill} units, a little under a sixth of the arena&apos;s width.</p>
        </>
      ),
    },
    {
      id: "three-habits",
      title: "The three habits that matter most",
      body: (
        <>
          <h3>1. Keep the chain alive</h3>
          <p>Each shard is worth 10 points times your combo, and the combo only grows if the next shard comes within {rules.comboWindow} seconds. A chain of nine is worth 450 points; nine separate pickups are worth 90. In our measured runs, about {c.reactiveDash.comboShare}% of all shard points came from pickups at ×5 or higher. The full arithmetic is in <Link href="/guides/combo-math">Combo math</Link>.</p>
          <h3>2. Dash through hazards, not across the arena</h3>
          <p>The dash is a defensive tool first. Used only when a hazard is about to touch you, it raised the average score of our test player from {fmt(c.noDash.avgScore)} to {fmt(c.reactiveDash.avgScore)} (+{derived.dashGainPct}%) and halved the number of hits. A dash that passes through a hazard also scores a {rules.nearMiss}-point near miss. See <Link href="/guides/dash-and-near-misses">Dashing and near misses</Link>.</p>
          <h3>3. Pick up power-ups on the way, not out of the way</h3>
          <p>A hexagon appears about eight seconds in and then every 10–15 seconds, and vanishes after {rules.powerLifetime} seconds. Grab it when it sits on your route. Detouring across the arena for one usually breaks your chain, which costs more than most power-ups give back. <Link href="/guides/power-ups">Every power-up explained</Link>.</p>
        </>
      ),
    },
    {
      id: "score-targets",
      title: "Realistic score targets",
      body: (
        <>
          <p>We measure the game with a deliberately simple scripted player over {stats.seedsPerConfig} fixed arenas (the <Link href="/guides/methodology">methodology</Link> explains exactly how). It always chases the nearest shard and never plans a route, so a thoughtful human can beat it. Its numbers make honest milestones:</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Milestone</th><th scope="col">Score</th><th scope="col">What it usually means</th></tr></thead>
              <tbody>
                <tr><td>First goal</td><td>1,000+</td><td>You&apos;re building chains of ×5 or more.</td></tr>
                <tr><td>Steady</td><td>{fmt(c.noDash.median)}</td><td>The median for chasing shards without ever dashing.</td></tr>
                <tr><td>Strong</td><td>{fmt(c.reactiveDash.median)}</td><td>The median once you dash away from danger.</td></tr>
                <tr><td>Excellent</td><td>{fmt(c.reactiveDash.p90)}+</td><td>Top 10% of our measured runs. Routing and power-up timing start to matter.</td></tr>
              </tbody>
            </table>
          </div>
          <p>Scores vary by day because each Daily Arena has a <Link href="/guides/daily-twists">twist</Link>: Swarm Saturday is noticeably harder and Frenzy Friday easier than the classic rules.</p>
        </>
      ),
    },
    {
      id: "first-week",
      title: "A simple first-week plan",
      body: (
        <ol>
          <li><strong>Day 1:</strong> play five runs of the Daily Arena focusing only on never letting the combo drop below ×3.</li>
          <li><strong>Day 2:</strong> confirm your email to unlock Quick Play, then practise dashing <em>only</em> when a hazard is close.</li>
          <li><strong>Day 3–4:</strong> on the Daily, watch where shards cluster and route through clusters rather than to the single nearest shard.</li>
          <li><strong>Day 5:</strong> send a challenge link to a friend. Racing their ghost shows exactly where you lose time.</li>
          <li><strong>Day 6–7:</strong> keep your streak going and compare your best to the milestones above.</li>
        </ol>
      ),
    },
  ],
};
