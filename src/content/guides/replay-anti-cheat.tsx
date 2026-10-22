import Link from "next/link";
import type { Guide } from "./types";
import { MAX_INPUT_EVENTS, RUN_TICKS, TPS } from "@/game/engine";

export const replayGuide: Guide = {
  slug: "replay-anti-cheat",
  title: "How ONE MORE verifies every score by replaying it",
  description: "A technical look at ONE MORE's deterministic engine: fixed 60 Hz ticks, integer PRNG, input logs, server replay, and the limits of what replay verification can prove.",
  category: "Behind the game",
  published: "2026-10-22",
  updated: "2026-10-22",
  readMinutes: 8,
  related: ["methodology", "daily-twists", "run-a-college-tournament"],
  sections: [
    {
      id: "the-problem",
      title: "The problem with browser game scores",
      body: (
        <p>In a browser game, the player controls the client. Anything the client sends, including a score, can be edited. The usual answers are to obscure the code or run the whole game on a server. ONE MORE takes a third route: the client sends <em>what the player did</em>, and the server re-runs the game to see what score that produces.</p>
      ),
    },
    {
      id: "determinism",
      title: "Making the game deterministic",
      body: (
        <>
          <p>Replay only works if the same inputs always produce exactly the same result on every device. The engine follows a few strict rules:</p>
          <ul>
            <li><strong>Fixed timestep.</strong> The simulation advances in ticks of exactly 1/{TPS} second; a full run is {RUN_TICKS} ticks. Rendering runs at whatever frame rate the device manages, but it never changes the simulation.</li>
            <li><strong>Exact arithmetic only.</strong> The simulation uses addition, multiplication, division, square roots and flooring, which IEEE-754 defines precisely. Functions like sine and cosine can differ in the last bit between JavaScript engines, so they are never used in game logic.</li>
            <li><strong>Directions from a table.</strong> Steering is quantised to 64 directions whose unit vectors are written into the source as literal numbers.</li>
            <li><strong>Integer random numbers.</strong> Shards, hazards and power-ups come from a 32-bit integer generator (mulberry32) seeded per arena, so the arena is the same for every player with that seed.</li>
          </ul>
        </>
      ),
    },
    {
      id: "input-log",
      title: "What gets recorded",
      body: (
        <p>The client records only <em>changes</em> in input: a list of (tick, direction, dash) triples. Holding one direction for two seconds is a single entry. A typical run is a few hundred entries; the server rejects logs with more than {MAX_INPUT_EVENTS.toLocaleString("en-IN")} entries, ticks that go backwards, or directions outside the table.</p>
      ),
    },
    {
      id: "server-checks",
      title: "What the server checks",
      body: (
        <ol>
          <li><strong>A server-issued run ID.</strong> Before a run, the server issues a single-use ID tied to the session, the arena seed and the twist. A run can only be submitted once.</li>
          <li><strong>Replay.</strong> The server replays the input log with the same engine. If the result doesn&apos;t match the claimed score exactly, nothing is saved.</li>
          <li><strong>Real time.</strong> A run that reports 60 seconds of play must have taken close to 60 seconds of wall-clock time between start and submission.</li>
          <li><strong>Leaderboard integrity.</strong> Daily runs that took far longer than real time (long pauses, slow-motion play) or whose input log duplicates another account&apos;s are kept off the leaderboard but still count for personal stats.</li>
          <li><strong>Version gate.</strong> Every rule change bumps the engine version; outdated clients are asked to refresh rather than produce scores under old rules.</li>
        </ol>
      ),
    },
    {
      id: "ghosts",
      title: "A bonus: ghosts for free",
      body: (
        <p>Because a run is just a seed plus an input log, the same machinery lets a friend race your exact run as a translucent ghost. When you share a challenge, the server first re-verifies your recording before storing it, so a ghost can&apos;t be faked either.</p>
      ),
    },
    {
      id: "limits",
      title: "What replay can't prove",
      body: (
        <>
          <p>Replay proves a score is <em>possible</em> from the recorded inputs. It can&apos;t prove a human produced those inputs: a bot that plays in real time would pass. That&apos;s why top Daily scores are also reviewed, why automation is banned under the <Link href="/fair-play">Fair Play rules</Link>, and why prize events should verify finalists in person (see the <Link href="/guides/run-a-college-tournament">tournament guide</Link>).</p>
        </>
      ),
    },
  ],
};
