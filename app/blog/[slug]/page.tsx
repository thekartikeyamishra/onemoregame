import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getPost, getPosts, relatedPosts } from "@/lib/blog";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { AdSlot } from "@/components/AdSlot";
import { JsonLd, PERSON_ID, WEBSITE_ID, breadcrumbSchema, faqSchema } from "@/components/JsonLd";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return pageMeta({
    title: post.seoTitle,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogType: "article",
    publishedTime: post.date,
    modifiedTime: post.updated,
    tags: post.tags,
  });
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const related = relatedPosts(post);
  const url = absoluteUrl(`/blog/${post.slug}`);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "@id": `${url}#article`,
            mainEntityOfPage: url,
            headline: post.title,
            description: post.description,
            image: `${url}/opengraph-image`,
            datePublished: post.date,
            dateModified: post.updated,
            wordCount: post.words,
            keywords: post.tags.join(", "),
            inLanguage: "en",
            author: { "@id": PERSON_ID, "@type": "Person", name: site.author.name, url: absoluteUrl("/about") },
            publisher: { "@id": PERSON_ID },
            isPartOf: { "@id": WEBSITE_ID },
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Writing", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
          ...(post.faq.length ? [faqSchema(post.faq)] : []),
        ]}
      />

      <article className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
        <header className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-sm text-slate">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <span aria-hidden="true"> / </span>
            <Link href="/blog" className="hover:text-ink">
              Writing
            </Link>
          </nav>
          <h1 className="mt-4 text-[clamp(2.2rem,1.5rem+3vw,3.8rem)] font-extrabold">{post.title}</h1>
          <p className="mt-5 text-xl text-slate">{post.description}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-4 text-sm text-slate">
            <span>
              By{" "}
              <Link href="/about" rel="author" className="font-semibold text-ink hover:text-indigo">
                {site.author.name}
              </Link>
            </span>
            <span>
              Published <time dateTime={post.date}>{formatDate(post.date)}</time>
            </span>
            {post.updated !== post.date ? (
              <span>
                Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time>
              </span>
            ) : null}
            <span>{post.readingMinutes} min read</span>
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,68ch)_1fr]">
          <div className="min-w-0">
            {/* Trusted, author-written markdown rendered at build time */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: post.html[0] }} />
            {post.html[1] ? (
              <>
                <AdSlot placement="inArticle" />
                <div className="prose" dangerouslySetInnerHTML={{ __html: post.html[1] }} />
              </>
            ) : null}

            {post.faq.length ? (
              <section aria-labelledby="faq" className="mt-14">
                <h2 id="faq" className="text-[clamp(1.5rem,1.2rem+1vw,1.9rem)] font-bold">
                  Frequently asked questions
                </h2>
                <div className="mt-5 divide-y divide-line border-y border-line">
                  {post.faq.map((f) => (
                    <details key={f.q} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                        {f.q}
                        <span aria-hidden="true" className="text-xl text-indigo transition-transform group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="mt-2 text-slate">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-label="About the author" className="mt-14 flex gap-5 rounded-3xl border border-line bg-surface p-6">
              <svg width="56" height="56" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0">
                <circle cx="17" cy="17" r="17" fill="var(--marigold)" />
                <circle cx="12" cy="15" r="2.6" fill="#131a33" />
                <circle cx="22" cy="15" r="2.6" fill="#131a33" />
                <path d="M11.5 21.5c3 3 8 3 11 0" stroke="#131a33" strokeWidth="2.4" strokeLinecap="round" fill="none" />
              </svg>
              <div>
                <p className="font-display text-lg font-bold">{site.author.name}</p>
                <p className="mt-1 text-slate">{site.author.bio}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
                  <Link href="/about" className="text-indigo hover:underline">
                    More about me
                  </Link>
                  <Link href="/work-with-me" className="text-indigo hover:underline">
                    Work with me
                  </Link>
                </div>
              </div>
            </section>

            <AdSlot placement="endOfArticle" />
          </div>

          {post.headings.length > 2 ? (
            <aside className="hidden lg:block">
              <nav aria-label="On this page" className="sticky top-24 border-s border-line ps-5">
                <p className="text-sm font-semibold">On this page</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {post.headings.map((h) => (
                    <li key={h.id} className={h.depth === 3 ? "ps-3" : ""}>
                      <a href={`#${h.id}`} className="text-slate hover:text-indigo">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 rounded-2xl bg-indigo-soft p-4">
                  <p className="text-sm font-semibold">Pricing an app?</p>
                  <p className="mt-1 text-sm text-slate">Get a line-by-line range in under a minute.</p>
                  <Link href="/tools/app-cost-calculator" className="mt-3 inline-block text-sm font-semibold text-indigo hover:underline">
                    Open the calculator
                  </Link>
                </div>
              </nav>
            </aside>
          ) : null}
        </div>
      </article>

      {related.length ? (
        <section aria-labelledby="related" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
          <h2 id="related" className="text-[clamp(1.6rem,1.3rem+1vw,2.1rem)] font-bold">
            Keep reading
          </h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="block h-full rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-indigo">
                  <h3 className="text-lg font-bold leading-snug">{p.title}</h3>
                  <p className="mt-2 text-sm text-slate">{p.readingMinutes} min read</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-band p-8 text-band-ink md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold">Be first to try what&apos;s in the lab</h2>
            <p className="mt-1 opacity-75">Free, invite-only, and you can leave any time.</p>
          </div>
          <Link href="/early-access" className="btn bg-marigold text-[#131a33]">
            Request an invite
          </Link>
        </div>
      </section>
    </>
  );
}
