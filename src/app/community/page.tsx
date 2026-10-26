import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SocialIcon } from "@/components/SocialIcon";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { STUDIO, socialOrder, socials } from "@/lib/socials";
import { AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata(
  "/community",
  "Community",
  "Where ONE MORE players hang out: Discord for daily arena strategy and weekly cups, YouTube for top runs and devlogs, plus Instagram, X and LinkedIn.",
);

export default function Community() {
  const [first, ...rest] = socialOrder;
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/community", "Community")} />
      <PageHero eyebrow="Community" title="Play together, one more time">
        <p>Every channel has a job. Follow the ones that are useful to you — nothing in the game depends on it.</p>
      </PageHero>
      <div className="section">
        <div className="container">
          <article className="form-card" style={{ marginBottom: "2rem" }}>
            <p className="eyebrow">Start here</p>
            <h2 style={{ display: "flex", gap: ".6rem", alignItems: "center" }}><SocialIcon id={first} size={28} /> {socials[first].label}</h2>
            <p className="lede" style={{ marginBottom: "1.25rem" }}>{socials[first].pitch}</p>
            <a className="btn btn--primary" href={socials[first].href} target="_blank" rel="noopener">Join the Discord</a>
          </article>
          <div className="channel-grid">
            {rest.map((id) => (
              <article key={id} className="card channel-card">
                <h3><SocialIcon id={id} /> {socials[id].label} <span className="muted small">{socials[id].handle}</span></h3>
                <p className="muted" style={{ margin: 0 }}>{socials[id].pitch}</p>
                <a href={socials[id].href} target="_blank" rel="noopener me">Open {socials[id].label}</a>
              </article>
            ))}
          </div>
          <h2 style={{ fontSize: "var(--step-2)", marginTop: "3rem" }}>Get your run featured</h2>
          <p className="muted" style={{ maxWidth: "68ch" }}>
            Finished a run you&apos;re proud of? Share it in the Discord <strong>#top-runs</strong> channel. Each week we pick runs for the Top Runs video on YouTube and Reels on Instagram, and we always ask before featuring anyone.
          </p>
          <p className="small muted">ONE MORE is made by {STUDIO.creator} at {STUDIO.name}.</p>
        </div>
      </div>
    </>
  );
}
