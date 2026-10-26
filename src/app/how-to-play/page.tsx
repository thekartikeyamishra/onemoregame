import { AdSlot } from "@/components/AdSlot";
import { CtaBand } from "@/components/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { StatusPill } from "@/components/StatusPill";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { site } from "@/lib/site";
import { TWISTS, WEEKDAY_TWIST } from "@/game/engine";
import { LEVEL_KINDS } from "@/game/levels";
import { AdsenseScript } from "@/components/AdsenseScript";

const LEVEL_KIND_LIST = Object.values(LEVEL_KINDS);

export const metadata = pageMetadata(
  "/how-to-play",
  "How to Play: controls, scoring and modes",
  "How ONE MORE is designed to play: 60-second runs, steering and dash controls, shard combos, hazards, scoring rules, Daily Arena seeds and friend challenges.",
);

export default function HowToPlay() {
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/how-to-play", "How to Play")} />
      <PageHero eyebrow="Game guide" title="How ONE MORE plays">
        <p>These are the live playtest rules. Numbers may change as playtests show what feels fair; anything not yet playable is labelled.</p>
      </PageHero>
      <div className="section">
        <div className="container prose">
          <ul className="toc" aria-label="On this page">
            <li><a href="#run">The run</a></li><li><a href="#controls">Controls</a></li><li><a href="#scoring">Scoring</a></li>
            <li><a href="#powerups">Power-ups</a></li><li><a href="#twists">Daily twists</a></li><li><a href="#modes">Modes</a></li><li><a href="#access">Accessibility</a></li><li><a href="#tips">Tips</a></li>
          </ul>

          <h2 id="run">The run <StatusPill status="playtest" /></h2>
          <p>Every game is one <strong>60-second run</strong> inside a circular arena. You steer a glowing orb. Amber <strong>diamond-shaped shards</strong> appear around the arena; violet <strong>square hazards</strong> sweep across it. Collect shards, avoid hazards, and keep your combo alive until the timer runs out.</p>
          <p>A hit doesn&apos;t end the run. It resets your combo and costs <strong>3 seconds</strong> from the clock, so one mistake hurts without ruining the attempt. That&apos;s what makes &ldquo;one more&rdquo; tempting: you can always see where the points were.</p>

          <h2 id="controls">Controls</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Action</th><th scope="col">Touch</th><th scope="col">Mouse</th><th scope="col">Keyboard</th></tr></thead>
              <tbody>
                <tr><td>Steer</td><td>Drag anywhere</td><td>Move pointer</td><td>WASD or arrow keys</td></tr>
                <tr><td>Dash (short burst, 2 s cooldown)</td><td>Double-tap or Dash button</td><td>Click</td><td>Space</td></tr>
                <tr><td>Pause</td><td>Pause button</td><td>Pause button</td><td>Esc or P</td></tr>
                <tr><td>One more (after a run)</td><td>One more button</td><td>One more button</td><td>R</td></tr>
              </tbody>
            </table>
          </div>
          <p>A dash fires in the direction you&apos;re moving, or the way you last moved if you&apos;re standing still, and makes you invulnerable for 0.2 s, so a well-timed dash through a hazard is a skill, not luck. The ring around the arena is your timer. Hazards are squares and their hitbox is exactly the square you see; the wall stops you without sticking, so you can slide along it.</p>

          <h2 id="scoring">Scoring</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Event</th><th scope="col">Effect</th></tr></thead>
              <tbody>
                <tr><td>Collect a shard</td><td>10 points × current combo multiplier</td></tr>
                <tr><td>Collect another shard within 1.5 s</td><td>Combo multiplier +1 (maximum ×9)</td></tr>
                <tr><td>1.5 s without collecting</td><td>Combo resets to ×1</td></tr>
                <tr><td>Hit a hazard</td><td>Combo resets, −3 s on the clock, then 0.5 s of grace (unless a Shield absorbs it)</td></tr>
                <tr><td>Near miss (dash through a hazard)</td><td>+25 points, combo kept</td></tr>
                <tr><td>Double power-up active</td><td>All points above ×2</td></tr>
              </tbody>
            </table>
          </div>
          <p>Because the multiplier caps at ×9, a long clean chain is worth far more than scattered pickups: nine quick shards in a row score 450 points, while nine separate pickups score 90. Routing matters more than speed.</p>

          <h2 id="powerups">Power-ups <StatusPill status="playtest" /></h2>
          <p>A <strong>hexagon</strong> appears about 8 seconds in, then every 10–15 seconds. Only one is on the field at a time, and it disappears after 6 seconds (it blinks in its last second). Each type has its own symbol and colour.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Symbol</th><th scope="col">Power-up</th><th scope="col">Effect</th><th scope="col">Lasts</th></tr></thead>
              <tbody>
                <tr><td>◯</td><td>Shield</td><td>Absorbs the next hazard hit: no time penalty and your combo survives</td><td>10 s or one hit</td></tr>
                <tr><td>◷</td><td>Slow-mo</td><td>Hazards move at half speed</td><td>4 s</td></tr>
                <tr><td>U</td><td>Magnet</td><td>Pulls shards within a short radius toward you</td><td>6 s</td></tr>
                <tr><td>×2</td><td>Double</td><td>Doubles points from shards and near misses</td><td>5 s</td></tr>
              </tbody>
            </table>
          </div>
          <p>Timing matters: grab Double right before a long combo chain, and Magnet when shards cluster. Power-ups spawn from the arena seed, so on the Daily Arena everyone gets the same ones in the same places.</p>

          <h2 id="twists">Daily twists <StatusPill status="playtest" /></h2>
          <p>Each day of the week the Daily Arena has one rule change (India time). Quick Play always uses the classic rules.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Day</th><th scope="col">Twist</th></tr></thead>
              <tbody>
                {WEEKDAY_TWIST.map((id, i) => <tr key={id}><td>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]}</td><td><strong>{TWISTS[id].name}</strong> — {TWISTS[id].description}</td></tr>)}
              </tbody>
            </table>
          </div>

          <h2 id="modes">Modes</h2>
          <h3>Quick Play <StatusPill status="playtest" /></h3>
          <p>A random arena each time. Best for practice and chasing your personal best.</p>
          <h3>Daily Arena <StatusPill status="playtest" /></h3>
          <p>Each day (resetting at midnight India time) uses one seed, so every player gets an identical arena: same shard spawns, same hazard paths. Unlimited attempts; your best run of the day goes on the leaderboard. Because the layout is shared, you can learn a route and compare scores fairly.</p>
          <h3>Levels <StatusPill status="playtest" /></h3>
          <p>Thirty fixed arenas, each with its own rule set and a <strong>pass mark</strong>. Reach the target to unlock the next level; hit the higher marks for two and three stars. The arena for each level is the same for everyone, so you can learn it.</p>
          <ul>
            {LEVEL_KIND_LIST.map((k) => <li key={k.id}><strong>{k.name}</strong>: {k.description}</li>)}
          </ul>
          <p>Every fifth level is a <strong>Boss Arena</strong>. Targets were set by simulating many runs of each arena with a consistent test player, then scaled up level by level, so early levels are a fair warm-up and later ones demand clean combos and power-up use. Guests can try Level 1; confirm your email to save progress.</p>
          <h3>Friend challenges <StatusPill status="playtest" /></h3>
          <p>After a run, tap <strong>Share result</strong>. Your friend opens the link and plays the same arena, with the same twist, against your score — with your <strong>ghost</strong> racing alongside them and a live &ldquo;ahead / behind&rdquo; gap. No sign-up needed. Challenge links show only your leaderboard name, never your email.</p>
          <h3>Campus Clash <StatusPill status="planned" /></h3>
          <p>Competition formats for schools, colleges and clubs. See <a href="/campus-clash">Campus Clash</a> for the full plan.</p>

          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ?? ""} />

          <h2 id="access">Accessibility and devices</h2>
          <ul>
            <li>Shards and hazards differ by <strong>shape</strong> (diamond vs square), not color alone.</li>
            <li>Available: a reduce-effects setting (no shake or glow, fewer particles), sound on/off, full keyboard play, and an on-screen Dash button on touch screens. Planned: high-contrast palette, practice speed (unranked) and remappable keys.</li>
            <li>Sound is optional and no cue relies on audio.</li>
            <li>Target browsers: current Chrome, Edge, Firefox and Safari on desktop and mobile. Native apps are not available yet.</li>
          </ul>

          <h2 id="tips">Strategy notes from the design</h2>
          <ul>
            <li>Circle the edge of the arena: hazards enter from outside, so the rim gives you the earliest warning.</li>
            <li>Don&apos;t chase a far shard if it breaks your chain; the 1.5 s combo window is the real clock.</li>
            <li>Save your dash for hazards, not for movement. A cooldown at the wrong moment costs more than it saves.</li>
          </ul>
          <h2 id="more">Go deeper</h2>
          <ul>
            <li><Link href="/guides/beginners-guide">Beginner&apos;s guide: from your first run to 8,000 points</Link></li>
            <li><Link href="/guides/combo-math">Combo math: why chains beat speed</Link></li>
            <li><Link href="/guides/dash-and-near-misses">Dashing and near misses</Link></li>
            <li><Link href="/guides/daily-twists">Daily twists strategy</Link></li>
          </ul>
          <p className="updated">Design notes last updated {site.contentUpdated}. Numbers will change as playtests reveal what feels fair.</p>
        </div>
        <div className="container" style={{ marginTop: "3rem" }}><CtaBand title="Want to test these rules?" /></div>
      </div>
    </>
  );
}
