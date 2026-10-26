import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { CtaBand } from "@/components/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { getGuide, guides } from "@/content/guides";
import { absoluteUrl, site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { STUDIO, socials } from "@/lib/socials";
import { AdsenseScript } from "@/components/AdsenseScript";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  const base = pageMetadata(`/guides/${g.slug}`, g.title, g.description);
  return { ...base, openGraph: { ...base.openGraph, type: "article", publishedTime: g.published, modifiedTime: g.updated, authors: [STUDIO.creator] } };
}

export default async function GuidePage({ params }: Params) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const url = absoluteUrl(`/guides/${g.slug}`);
  const related = g.related.map(getGuide).filter((x): x is NonNullable<typeof x> => Boolean(x));
  return (
    <>
      <AdsenseScript />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article", headline: g.title, description: g.description, datePublished: g.published, dateModified: g.updated,
            mainEntityOfPage: url, url, inLanguage: "en",
            author: { "@type": "Person", name: STUDIO.creator, url: absoluteUrl("/about"), sameAs: [socials.linkedin.href, socials.youtube.href, socials.x.href] },
            publisher: { "@type": "Organization", name: STUDIO.name, url: site.url, logo: { "@type": "ImageObject", url: `${site.url}/icon.svg` } },
            image: `${site.url}/opengraph-image`,
          },
          {
            "@type": "BreadcrumbList", itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: site.url },
              { "@type": "ListItem", position: 2, name: "Guides", item: absoluteUrl("/guides") },
              { "@type": "ListItem", position: 3, name: g.title, item: url },
            ],
          },
        ],
      }} />
      <section className="page-hero">
        <div className="container">
          <nav aria-label="Breadcrumb" className="small muted" style={{ marginBottom: "1rem" }}>
            <Link href="/">Home</Link> / <Link href="/guides">Guides</Link> / <span aria-current="page">{g.category}</span>
          </nav>
          <h1 style={{ fontSize: "var(--step-3)", maxWidth: "24ch" }}>{g.title}</h1>
          <p className="lede">{g.description}</p>
          <p className="small muted" style={{ margin: 0 }}>
            By <Link href="/about">{STUDIO.creator}</Link>, {STUDIO.name} · Published <time dateTime={g.published}>{g.published}</time>
            {g.updated !== g.published ? <> · Updated <time dateTime={g.updated}>{g.updated}</time></> : null} · {g.readMinutes} min read
          </p>
        </div>
      </section>
      <div className="section">
        <article className="container prose">
          <nav aria-label="On this page">
            <ul className="toc">{g.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ul>
          </nav>
          {g.sections.map((s, i) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id} style={{ scrollMarginTop: 90 }}>{s.title}</h2>
              {s.body}
              {i === 1 ? <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ?? ""} /> : null}
            </section>
          ))}
          <aside aria-labelledby="related" style={{ marginTop: "3rem", borderTop: "1px solid var(--line)", paddingTop: "1.5rem" }}>
            <h2 id="related" style={{ fontSize: "var(--step-1)", marginTop: 0 }}>Related guides</h2>
            <ul>{related.map((r) => <li key={r.slug}><Link href={`/guides/${r.slug}`}>{r.title}</Link></li>)}</ul>
            <p className="small muted">Spotted a mistake? <Link href="/contact">Tell us</Link> — see our <Link href="/editorial-policy">editorial policy</Link>.</p>
          </aside>
        </article>
        <div className="container" style={{ marginTop: "3rem" }}><CtaBand /></div>
      </div>
    </>
  );
}
