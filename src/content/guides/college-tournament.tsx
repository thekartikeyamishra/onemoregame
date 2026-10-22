import Link from "next/link";
import type { Guide } from "./types";

export const tournamentGuide: Guide = {
  slug: "run-a-college-tournament",
  title: "How to run a one-hour ONE MORE tournament at your college",
  description: "A practical organizer's guide: formats, bracket timings, equipment, fair-play checks and what you can run today with challenge links before Campus Clash tools launch.",
  category: "Organizers",
  published: "2026-10-22",
  updated: "2026-10-22",
  readMinutes: 8,
  related: ["replay-anti-cheat", "beginners-guide", "daily-twists"],
  sections: [
    {
      id: "why-it-works",
      title: "Why a 60-second game suits events",
      body: (
        <>
          <p>Most esports formats need long matches, installs and accounts. A ONE MORE run lasts at most a minute, runs in any modern browser and needs no download, so a full bracket fits inside a lunch break or a fest slot. Because a shared seed gives every player the identical arena, results are directly comparable.</p>
          <p>Dedicated <Link href="/campus-clash">Campus Clash</Link> tools (event codes, rosters, live brackets) are planned but not live yet. This guide shows how to run a fair event today with features that already exist.</p>
        </>
      ),
    },
    {
      id: "formats",
      title: "Pick a format",
      body: (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Format</th><th scope="col">Best for</th><th scope="col">How it runs today</th></tr></thead>
            <tbody>
              <tr><td>Open qualifier</td><td>Large groups, online</td><td>Everyone plays the same challenge link during a window. Highest verified score wins.</td></tr>
              <tr><td>Qualifier + finals</td><td>Fests, clubs</td><td>Top 8 or 16 from the qualifier meet head-to-head on a projector.</td></tr>
              <tr><td>Team format</td><td>Inter-college, houses</td><td>Teams of five; add each team&apos;s top three scores.</td></tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: "qualifier-today",
      title: "Running a qualifier with a challenge link",
      body: (
        <ol>
          <li>Play one run yourself, then tap <strong>Share result</strong>. The link that creates is a fixed arena (seed and twist), so it becomes your event arena. Every participant sees your ghost as a reference.</li>
          <li>Share that one link in your event group with a clear deadline.</li>
          <li>Ask participants to submit a screenshot of their results screen, which shows the verified score and the &ldquo;Score verified by replay&rdquo; line. A simple form with name, roll number (only if your institution needs it) and screenshot is enough.</li>
          <li>Rank by score. For ties, use fewer hits as the tie-breaker; it&apos;s on the results screen.</li>
        </ol>
      ),
    },
    {
      id: "finals",
      title: "Running finals in person",
      body: (
        <>
          <p>Single elimination with N players needs N − 1 matches: 16 finalists means 15 matches over four rounds. Play each match as best of three runs on the same link, both players at the same time on separate devices, with one screen mirrored to a projector for the audience.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Finalists</th><th scope="col">Matches</th><th scope="col">One station</th><th scope="col">Four stations in parallel</th></tr></thead>
              <tbody>
                <tr><td>8</td><td>7</td><td>~30 min</td><td>~15 min</td></tr>
                <tr><td>16</td><td>15</td><td>~65 min</td><td>~25 min</td></tr>
              </tbody>
            </table>
          </div>
          <p>Timings assume about four and a half minutes per best-of-three match including resets. Use a fresh challenge link for finals so nobody has practised that exact arena for days.</p>
        </>
      ),
    },
    {
      id: "checklist",
      title: "Organizer checklist",
      body: (
        <ul>
          <li>Permission from your institution and a named faculty or staff contact.</li>
          <li>One device per player with a current Chrome, Edge, Firefox or Safari; a stable Wi-Fi network (each run needs only a few kilobytes).</li>
          <li>Sound off on player devices, on for the projector.</li>
          <li>Publish your rules in advance, including the tie-breaker and that the <Link href="/fair-play">Fair Play rules</Link> apply: no bots, scripts or playing for someone else.</li>
          <li>If participants are under 18, run the event through the school and collect no more personal data than the school already holds.</li>
          <li>If you offer prizes, check your institution&apos;s and local rules first; ONE MORE doesn&apos;t sponsor or guarantee prizes.</li>
        </ul>
      ),
    },
    {
      id: "tell-us",
      title: "Tell us how it went",
      body: (
        <p>Running an event? <Link href="/campus-clash">Register organizer interest</Link> so we can help, and share photos or results in our <Link href="/community">Discord</Link>. Real organizer feedback decides what the Campus Clash tools include.</p>
      ),
    },
  ],
};
