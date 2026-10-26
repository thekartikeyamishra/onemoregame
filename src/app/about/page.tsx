import { CtaBand } from "@/components/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { STUDIO, socials } from "@/lib/socials";
import { AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata(
  "/about",
  "About ONE MORE",
  "Why ONE MORE exists, the principles behind it, where development stands today and what comes next: playtests, Daily Arena, friend challenges and Campus Clash.",
);

const stages = [
  ["Now", "Open playtest: free Daily Arena for everyone; Quick Play, leaderboard, streaks and friend challenges for confirmed players, all with server-verified scores."],
  ["Next", "Tune the game from playtest data: do people replay voluntarily and come back the next day?"],
  ["Then", "Wider browser access and more modes, if playtests show the core run is worth repeating."],
  ["Later", "Campus Clash pilot events with real organizers, then a wider browser launch."],
];

export default function About() {
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/about", "About")} />
      <PageHero eyebrow="About" title="Small game, big “one more”">
        <p>ONE MORE is an independent browser arcade game {site.operatorName ? <>by {site.operatorName}</> : null}, built around a simple idea: the best competitive games are the ones you can start in a second and understand in five.</p>
      </PageHero>
      <div className="section">
        <div className="container prose">
          <h2 style={{ marginTop: 0 }}>What we believe</h2>
          <ul>
            <li><strong>Instant.</strong> No install, no long tutorial. Open a link and play.</li>
            <li><strong>Skill decides.</strong> Shared seeds and validated scores. No pay-to-win, ever.</li>
            <li><strong>Social, not toxic.</strong> Built for friends and campuses, with fair-play rules from day one.</li>
            <li><strong>Honest.</strong> We label what&apos;s planned versus available, and we don&apos;t invent numbers, partners or reviews.</li>
            <li><strong>Accessible.</strong> Playable with touch, mouse or keyboard, with options for motion and contrast.</li>
          </ul>
          <h2>Where development stands</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Stage</th><th scope="col">What it means</th></tr></thead>
              <tbody>{stages.map(([s, d]) => <tr key={s}><td><strong>{s}</strong></td><td>{d}</td></tr>)}</tbody>
            </table>
          </div>
          <p>We&apos;ll measure each stage by what players actually do: completed runs, replays, next-day returns and real events. A long waitlist alone doesn&apos;t prove a game is fun.</p>
          <h2>Who&apos;s building it</h2>
          <p>ONE MORE is made by <strong>{STUDIO.creator}</strong> at <strong>{STUDIO.name}</strong>, built in public. Follow along on <a href={socials.youtube.href} rel="noopener" target="_blank">YouTube</a>, <a href={socials.linkedin.href} rel="noopener" target="_blank">LinkedIn</a> and <a href={socials.x.href} rel="noopener" target="_blank">X</a>, or join the players on <a href="/community">Discord</a>.</p>
          <p className="updated">Last updated {site.contentUpdated}.</p>
        </div>
        <div className="container" style={{ marginTop: "3rem" }}><CtaBand /></div>
      </div>
    </>
  );
}
