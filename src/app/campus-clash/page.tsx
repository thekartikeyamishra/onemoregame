import Link from "next/link";
import { CampusForm } from "@/components/CampusForm";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { StatusPill } from "@/components/StatusPill";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata(
  "/campus-clash",
  "Campus Clash: school and college tournaments",
  "Campus Clash is ONE MORE's planned competition format for schools, colleges and clubs: open qualifiers, bracket finals, team events and an organizer guide. Register organizer interest.",
);

export default function CampusClash() {
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/campus-clash", "Campus Clash")} />
      <PageHero eyebrow="Campus Clash · Planned" title="Tournaments that fit in a lunch break">
        <p>One-minute runs make competitions easy to run anywhere with a projector and Wi-Fi. This is the plan; event registration is not open yet, and no institutions are partners today.</p>
      </PageHero>
      <div className="section">
        <div className="container split">
          <div className="prose">
            <p>Want to run something now? Read <Link href="/guides/run-a-college-tournament">how to run a one-hour tournament at your college</Link> with today&apos;s challenge links.</p>
            <h2>Formats</h2>
            <h3>Open qualifier <StatusPill status="planned" /></h3>
            <p>The organizer sets a window, for example three days. Every registered participant plays the event seed as many times as they like. Best score counts. Good for large groups because nobody has to be in the same room.</p>
            <h3>Bracket finals <StatusPill status="planned" /></h3>
            <p>The top 8 or 16 qualifiers meet head-to-head. Both players run the same seed simultaneously; best of three runs advances. A 16-player bracket fits in about 45 minutes.</p>
            <h3>Team format <StatusPill status="planned" /></h3>
            <p>Teams of five, where the top three scores count. Rewards consistency over one star player, which suits inter-college and house competitions.</p>

            <h2>Organizer guide (draft)</h2>
            <ol>
              <li><strong>Pick a format and window.</strong> Qualifier only for casual events; qualifier plus finals for a showcase.</li>
              <li><strong>Share one event link.</strong> Participants join with an event code. Organizers will see entries, not personal data beyond what participants choose to share.</li>
              <li><strong>Check in finalists.</strong> Confirm finalists are present (in person or online) before brackets lock.</li>
              <li><strong>Run finals on the big screen.</strong> A spectator view shows both arenas, live scores and a countdown.</li>
              <li><strong>Publish results.</strong> Final standings can be shared as a results page.</li>
            </ol>
            <h3>What you&apos;ll need</h3>
            <ul>
              <li>A device per player (phone or laptop with a current browser).</li>
              <li>A stable connection; finals need one screen for spectators.</li>
              <li>Permission from your institution to run the event.</li>
            </ul>
            <h3>Fair play and minors</h3>
            <p>Scores will be validated server-side, and every event follows the <a href="/fair-play">fair-play rules</a>. School events involving under-18 participants will be run through the institution, with minimal data collection. Any event with prizes or entry fees would publish separate rules and terms before registration opens.</p>
          </div>
          <div style={{ position: "sticky", top: 90 }}>
            <h2 style={{ fontSize: "var(--step-2)" }}>Register organizer interest</h2>
            <p className="muted">Tell us about your campus or club. We&apos;ll contact you when pilot events are being planned.</p>
            <CampusForm />
          </div>
        </div>
      </div>
    </>
  );
}
