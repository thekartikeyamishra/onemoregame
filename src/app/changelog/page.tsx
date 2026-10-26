import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { changelog } from "@/content/changelog";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata("/changelog", "Changelog: what's new in ONE MORE", "A dated log of every ONE MORE release: new modes, power-ups, Daily twists, anti-cheat changes and guides.");

export default function Changelog() {
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/changelog", "Changelog")} />
      <PageHero eyebrow="Development log" title="What's new">
        <p>Every user-visible change, newest first.</p>
      </PageHero>
      <div className="section">
        <div className="container prose">
          {changelog.map((e, i) => (
            <section key={`${e.date}-${i}`} aria-labelledby={`cl-${i}`}>
              <h2 id={`cl-${i}`} style={{ marginTop: i ? undefined : 0 }}>{e.title}</h2>
              <p className="updated"><time dateTime={e.date}>{e.date}</time></p>
              <ul>{e.items.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
