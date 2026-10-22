import Link from "next/link";
import type { Guide } from "./types";
import { fmt, stats } from "./stats";

export const methodology: Guide = {
  slug: "methodology",
  title: "How we measure ONE MORE: methodology behind our numbers",
  description: "Exactly how the statistics in ONE MORE guides are produced: a scripted test player, 200 fixed arenas per twist, what is measured and the limits of the data.",
  category: "Behind the game",
  published: "2026-10-22",
  updated: "2026-10-22",
  readMinutes: 4,
  related: ["dash-and-near-misses", "daily-twists", "replay-anti-cheat"],
  sections: [
    {
      id: "why",
      title: "Why publish a methodology",
      body: <p>Our guides quote numbers such as average scores, hits per run and how much dashing helps. Those numbers come from running the real game engine, not from estimates, and this page explains how so you can judge them yourself. We update both the numbers and this page whenever the game rules change.</p>,
    },
    {
      id: "setup",
      title: "The setup",
      body: (
        <ul>
          <li><strong>Engine:</strong> the same deterministic engine the game and server use (engine version {stats.engineVersion}, measured on {stats.measuredOn}).</li>
          <li><strong>Arenas:</strong> {stats.seedsPerConfig} fixed seeds for each of the seven twists, identical across every configuration so comparisons are like-for-like.</li>
          <li><strong>Test player:</strong> a deliberately simple script that steers toward the nearest shard (or a nearby power-up) with no route planning. One version never dashes; the other dashes whenever a hazard comes within 45 units.</li>
          <li><strong>Measured:</strong> score, median and top-10% score, hits, run length, shards, power-ups, near misses, and the share of shard points earned at combo ×5 or higher.</li>
        </ul>
      ),
    },
    {
      id: "limits",
      title: "Limits",
      body: (
        <>
          <p>The test player is not a human. It reacts instantly but never plans, so it is better than a beginner and worse than a skilled player who routes through shard clusters. Treat its numbers as a consistent benchmark, not as a prediction of your score. As one reference point, it averages {fmt(stats.twists.classic.reactiveDash.avgScore)} on the classic rules when dashing.</p>
          <p>Leaderboard scores from real players are not used in these figures. If we publish analysis of real play in future, it will be aggregated and labelled as such.</p>
        </>
      ),
    },
    {
      id: "reproduce",
      title: "Reproducing the numbers",
      body: <p>The measurement script lives alongside the game&apos;s source and regenerates every figure in one command, so the guides can never silently drift away from the rules. Questions or corrections are welcome via the <Link href="/contact">contact page</Link>; see also our <Link href="/editorial-policy">editorial policy</Link>.</p>,
    },
  ],
};
