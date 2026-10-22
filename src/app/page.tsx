import Link from "next/link";
import { CtaBand } from "@/components/CtaBand";
import { Faq } from "@/components/Faq";
import { GamePreview } from "@/components/GamePreview";
import { JsonLd } from "@/components/JsonLd";
import { Orbit } from "@/components/Orbit";
import { StatusPill } from "@/components/StatusPill";
import { StoreBadges } from "@/components/StoreBadges";
import { WaitlistForm } from "@/components/WaitlistForm";
import { faqs, features } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { STUDIO, socialOrder, socials } from "@/lib/socials";
import { videoGameLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { guides } from "@/content/guides";

export const metadata = pageMetadata(
  "/",
  `${site.name} — ${site.tagline}`,
  "A skill-first browser arcade game in development: one-minute runs, daily seeded challenges, friend challenges and Campus Clash for schools and colleges. Play today's arena free in your browser.",
);

const homeFaq = faqs.filter((f) => ["Is ONE MORE playable today?", "What happens after I enter my email?", "Will it cost money?", "Can my college sign up for Campus Clash now?"].includes(f.q));

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: site.name, description: site.description, inLanguage: "en" },
            {
              "@type": "Organization", "@id": `${site.url}/#org`, name: STUDIO.name, url: site.url, logo: `${site.url}/icon.svg`,
              email: site.contactEmail, sameAs: [socials.seevetech.href, socials.discord.href],
              founder: { "@id": `${site.url}/#creator` },
            },
            {
              "@type": "Person", "@id": `${site.url}/#creator`, name: STUDIO.creator, url: absoluteUrl("/about"),
              sameAs: socialOrder.filter((id) => id !== "seevetech" && id !== "discord").map((id) => socials[id].href),
            },
            videoGameLd(),
          ],
        }}
      />

      <section className="hero">
        <Orbit />
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">A new kind of arcade challenge</p>
            <h1>One minute. One challenge. <span className="accent">One&nbsp;more.</span></h1>
            <p className="lede">
              A skill-first arcade game built for quick challenges, personal bests and friendly competition. Today&apos;s arena is free to play in your browser — no download, no sign-up.
            </p>
            <div className="btn-row" style={{ marginTop: "2rem" }}>
              <Link href="/play" className="btn btn--primary">Play today&apos;s arena</Link>
              <Link href="/how-to-play" className="btn">How it works</Link>
            </div>
            <p className="hero-note">Open playtest · Browser-first · Free to play · No pay-to-win</p>
          </div>
          <GamePreview />
        </div>
      </section>

      <section className="section section--alt" aria-labelledby="modes">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">What we&apos;re building</p>
            <h2 id="modes">Four ways to play, one simple core</h2>
            <p className="lede">Every mode uses the same 60-second run. Labels show exactly where each one stands today.</p>
          </div>
          <div className="grid grid--4">
            {features.map((f) => (
              <article className="card" key={f.title}>
                <div className="card-top">
                  <span className="card-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={f.icon} /></svg>
                  </span>
                  <StatusPill status={f.status} />
                </div>
                <h3>{f.title}</h3>
                <p className="muted">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="loop">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">The challenge loop</p>
            <h2 id="loop">Beat your best. Then beat your friends.</h2>
            <p className="lede">Finish a run, tap share. Your friends play the exact same arena from the link, no sign-up needed.</p>
          </div>
          <ol className="steps">
            <li><strong>Play a run</strong>Sixty seconds, one seeded arena. Your score depends on routing, timing and combos.</li>
            <li><strong>Share the seed</strong>Send a challenge link. It carries the arena seed and your score, nothing personal.</li>
            <li><strong>Same arena, fair fight</strong>Your friend plays the identical layout, so the comparison is skill against skill.</li>
            <li><strong>One more</strong>Rematch, try a different line, or take it to your campus leaderboard.</li>
          </ol>
        </div>
      </section>

      <section className="section section--alt" aria-labelledby="campus">
        <div className="container split">
          <div>
            <p className="eyebrow">Campus Clash</p>
            <h2 id="campus">Built for a hall full of people shouting at one screen</h2>
            <p className="lede">Short runs make tournaments easy to schedule: a qualifier window, a bracket, and finals that fit in a lunch break.</p>
            <p className="muted">We&apos;re looking for student organizers, club leads and staff who want to help shape the first pilot events. No institutions are partners yet, and event registration isn&apos;t open.</p>
            <div className="btn-row"><Link href="/campus-clash" className="btn">See the Campus Clash plan</Link></div>
          </div>
          <ul className="grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[
              ["Open qualifier", "Everyone plays the same seed during a window. Best score counts."],
              ["Bracket finals", "Head-to-head, same seed, best of three runs."],
              ["Team format", "Teams of five; the top three scores count."],
            ].map(([t, d]) => (
              <li className="card" key={t} style={{ margin: 0 }}>
                <div className="card-top"><h3 style={{ margin: 0 }}>{t}</h3><StatusPill status="planned" /></div>
                <p className="muted" style={{ marginTop: ".75rem" }}>{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" id="request" aria-labelledby="early" style={{ scrollMarginTop: 80 }}>
        <div className="container split">
          <div>
            <p className="eyebrow">Early access</p>
            <h2 id="early">Save your scores, join the leaderboard</h2>
            <p className="lede">Playtesters shape the controls, scoring and modes before the full launch.</p>
            <ul className="muted">
              <li>Confirm your email once to unlock Quick Play, the Daily Arena leaderboard, streaks and named challenges.</li>
              <li>No password: sign in on other devices with a one-time email link.</li>
              <li>Optional launch updates only if you tick the box. Unsubscribe in one click.</li>
            </ul>
            <p className="muted small" style={{ marginTop: "1.5rem" }}>Mobile apps</p>
            <StoreBadges />
          </div>
          <div className="form-card"><WaitlistForm /></div>
        </div>
      </section>

      <section className="section" aria-labelledby="guides-h">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Guides</p>
            <h2 id="guides-h">Learn the game properly</h2>
            <p className="lede">Written from the game&apos;s real rules and numbers we measure by running the engine.</p>
          </div>
          <div className="grid grid--3">
            {guides.slice(0, 6).map((g) => (
              <article className="card" key={g.slug}>
                <p className="small muted" style={{ margin: 0 }}>{g.category} · {g.readMinutes} min</p>
                <h3><Link href={`/guides/${g.slug}`}>{g.title}</Link></h3>
                <p className="muted">{g.description}</p>
              </article>
            ))}
          </div>
          <p style={{ marginTop: "1.5rem" }}><Link href="/guides">All guides →</Link></p>
        </div>
      </section>

      <section className="section section--alt" aria-labelledby="faq-h">
        <div className="container" style={{ maxWidth: 820 }}>
          <p className="eyebrow">Questions</p>
          <h2 id="faq-h">Straight answers</h2>
          <Faq items={homeFaq} />
          <p style={{ marginTop: "1.5rem" }}><Link href="/faq">Read all questions →</Link></p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container"><CtaBand title="One minute is all it takes" /></div>
      </section>
    </>
  );
}
