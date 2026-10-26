import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata(
  "/fair-play",
  "Fair Play and competition rules",
  "ONE MORE's fair-play principles: seeded runs, server-side score validation, no pay-to-win, one account per person, no automation, and how disputes are handled in competitions.",
);

export default function FairPlay() {
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/fair-play", "Fair Play")} />
      <PageHero eyebrow="Community" title="Fair play rules">
        <p>Competition only works if a score means the same thing for everyone. These principles apply to every mode as it launches.</p>
      </PageHero>
      <div className="section">
        <div className="container prose">
          <h2 style={{ marginTop: 0 }}>Design principles</h2>
          <ul>
            <li><strong>Same seed, same arena.</strong> Ranked modes use published seeds so everyone faces identical conditions.</li>
            <li><strong>No pay-to-win.</strong> Anything purchasable, if ever offered, is cosmetic. Nothing changes speed, hitboxes, time or scoring.</li>
            <li><strong>Server-side validation.</strong> Every saved run is replayed from its recorded inputs on our servers with the same engine. Scores that can&apos;t be reproduced exactly, or runs that finish faster than real time, are rejected. (Replays stop edited scores; they can&apos;t yet tell a human from a well-programmed bot, so automated play is also against the rules below.)</li>
            <li><strong>Leaderboard integrity checks.</strong> Daily Arena runs are only ranked if they finished within a reasonable real-time window (long &ldquo;slow-motion&rdquo; sessions aren&apos;t), and identical input recordings submitted from different accounts are kept off the leaderboard. Each run ID is single-use, tied to your session and issued by our server with the arena seed, and there are per-player and per-network limits on how many runs can start. Top scores are reviewed, and players who break these rules can be removed from leaderboards.</li>
            <li><strong>Practice is separate.</strong> Accessibility options that change game speed are available for practice and are labelled unranked.</li>
          </ul>
          <p>Technical details: <Link href="/guides/replay-anti-cheat">how ONE MORE verifies every score by replaying it</Link>.</p>
          <h2>Player rules</h2>
          <ol>
            <li>One account per person in ranked modes and events.</li>
            <li>No bots, macros, scripts, modified clients or automated input.</li>
            <li>No exploiting bugs for ranked scores. Report them instead; reporting won&apos;t count against you.</li>
            <li>No account sharing or playing on someone else&apos;s behalf in events.</li>
            <li>Be decent. Harassment, hate speech or threats in names or messages lead to removal.</li>
          </ol>
          <h2>Enforcement</h2>
          <p>Unverifiable scores are removed from leaderboards. Repeated or deliberate violations can lead to removal from events or the service. In organized events, the organizer&apos;s published event rules apply alongside these, and decisions can be appealed by contacting us within 7 days.</p>
          <p className="updated">Server validation is live in the playtest; event-specific rules will be added when Campus Clash launches. Last updated {site.contentUpdated}.</p>
        </div>
      </div>
    </>
  );
}
