import Link from "next/link";
import type { Guide } from "./types";
import { fmt, stats } from "./stats";
import { TWISTS, WEEKDAY_TWIST } from "@/game/engine";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const tips: Record<string, string> = {
  classic: "Pure fundamentals. A good day to measure your real progress against previous weeks.",
  magnet: "Every power-up is a Magnet. Route toward clusters of shards and take each Magnet when two or more shards are nearby.",
  turbo: "Hazards are 25% faster, so react earlier and dash a fraction sooner than usual. Fewer, cleaner detours win.",
  wide: "Shards are bigger and easier to grab. You can take tighter lines past hazards because pickups need less precision.",
  shield: "You start with a Shield. Use the first ten seconds to build a chain aggressively through traffic.",
  frenzy: "Power-ups appear about twice as often. Prioritise Doubles at high combo; this is usually the highest-scoring day.",
  swarm: "Two extra hazards. Stay near the rim where you see hazards earliest, and treat the dash as purely defensive.",
};

export const dailyTwistsGuide: Guide = {
  slug: "daily-twists",
  title: "Daily twists strategy: a plan for every day of the week",
  description: "Each weekday ONE MORE's Daily Arena changes one rule. Measured difficulty for all seven twists and a concrete strategy for each day.",
  category: "Strategy",
  published: "2026-10-22",
  updated: "2026-10-22",
  readMinutes: 5,
  related: ["power-ups", "dash-and-near-misses", "beginners-guide"],
  sections: [
    {
      id: "how-twists-work",
      title: "How twists work",
      body: (
        <>
          <p>The Daily Arena gives every player the same arena for a day, resetting at midnight India time. Each weekday it also changes one rule. Quick Play always uses the classic rules, and a friend challenge keeps the twist of the day it was played. Twists are part of the deterministic game simulation, so the server verifies twisted runs exactly like any other (see <Link href="/guides/replay-anti-cheat">how replay verification works</Link>).</p>
        </>
      ),
    },
    {
      id: "measured-difficulty",
      title: "How hard is each day?",
      body: (
        <>
          <p>Measured with the same scripted player over {stats.seedsPerConfig} arenas per twist (<Link href="/guides/methodology">methodology</Link>). Higher numbers mean an easier day for that player.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Day</th><th scope="col">Twist</th><th scope="col">Average</th><th scope="col">Top 10%</th><th scope="col">Hits per run</th></tr></thead>
              <tbody>
                {WEEKDAY_TWIST.map((id, i) => {
                  const r = stats.twists[id].reactiveDash;
                  return <tr key={id}><td>{DAYS[i]}</td><td>{TWISTS[id].name}</td><td>{fmt(r.avgScore)}</td><td>{fmt(r.p90)}+</td><td>{r.avgHits}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <p>Swarm Saturday is clearly the hardest day and Frenzy Friday the easiest. Comparing your Daily score against the same weekday last week is fairer than comparing different days.</p>
        </>
      ),
    },
    {
      id: "day-by-day",
      title: "Day-by-day strategy",
      body: (
        <>
          {WEEKDAY_TWIST.map((id, i) => (
            <div key={id}>
              <h3>{DAYS[i]}: {TWISTS[id].name}</h3>
              <p><strong>Rule:</strong> {TWISTS[id].description} <strong>Plan:</strong> {tips[id]}</p>
            </div>
          ))}
        </>
      ),
    },
  ],
};
