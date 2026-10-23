import { getPosts } from "@/lib/blog";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { PostList, Pager } from "@/components/PostList";
import { JsonLd, PERSON_ID, breadcrumbSchema } from "@/components/JsonLd";

const PER_PAGE = 10;

export const metadata = pageMeta({
  title: "Writing on building apps, AI features and privacy",
  description:
    "Numbers-first articles for founders and developers: app costs, MVP scope, Flutter vs React Native, DPDP and GDPR for apps, and keeping LLM bills in check.",
  path: "/blog",
});

export default function BlogIndex() {
  const posts = getPosts();
  const pages = Math.max(1, Math.ceil(posts.length / PER_PAGE));
  return (
    <div className="mx-auto max-w-4xl px-4 pt-14 sm:px-6 md:pt-20">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: `${site.name}: writing`,
            url: absoluteUrl("/blog"),
            author: { "@id": PERSON_ID },
            blogPost: posts.slice(0, PER_PAGE).map((p) => ({
              "@type": "BlogPosting",
              headline: p.title,
              url: absoluteUrl(`/blog/${p.slug}`),
              datePublished: p.date,
            })),
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Writing", path: "/blog" },
          ]),
        ]}
      />
      <h1 className="text-[clamp(2.4rem,1.6rem+3vw,4rem)] font-extrabold">Writing</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate">
        Field notes from building apps for clients and for my own studio. Every article is written from real projects, with
        numbers you can check.
      </p>
      <div className="mt-12">
        <PostList posts={posts.slice(0, PER_PAGE)} />
        <Pager page={1} pages={pages} />
      </div>
    </div>
  );
}
