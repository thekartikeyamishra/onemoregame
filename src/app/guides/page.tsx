import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { guides } from "@/content/guides";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata(
  "/guides",
  "Guides: strategy, scoring and organizing events",
  "Original ONE MORE guides built from the game's real rules and measured play: beginner tips, combo maths, dashing, power-ups, Daily twists and running college tournaments.",
);

const order = ["Getting better", "Strategy", "Organizers", "Behind the game"] as const;

export default function GuidesIndex() {
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/guides", "Guides")} />
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList", name: "ONE MORE guides",
        itemListElement: guides.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/guides/${g.slug}`), name: g.title })),
      }} />
      <PageHero eyebrow="Guides" title="Get better at ONE MORE">
        <p>Every guide is written from the game&apos;s actual rules and numbers we measure by running the real engine. <Link href="/guides/methodology">How we measure</Link>.</p>
      </PageHero>
      <div className="section">
        <div className="container">
          {order.map((cat) => {
            const list = guides.filter((g) => g.category === cat);
            if (!list.length) return null;
            return (
              <section key={cat} aria-labelledby={`cat-${cat}`} style={{ marginBottom: "3rem" }}>
                <h2 id={`cat-${cat}`} style={{ fontSize: "var(--step-2)" }}>{cat}</h2>
                <div className="grid grid--3">
                  {list.map((g) => (
                    <article key={g.slug} className="card">
                      <h3 style={{ marginTop: 0 }}><Link href={`/guides/${g.slug}`}>{g.title}</Link></h3>
                      <p className="muted">{g.description}</p>
                      <p className="small muted" style={{ margin: 0 }}>{g.readMinutes} min read · Updated {g.updated}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
