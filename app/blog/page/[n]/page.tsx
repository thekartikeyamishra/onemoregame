import { notFound, permanentRedirect } from "next/navigation";
import { getPosts } from "@/lib/blog";
import { pageMeta } from "@/lib/seo";
import { PostList, Pager } from "@/components/PostList";

const PER_PAGE = 10;
const pageCount = () => Math.max(1, Math.ceil(getPosts().length / PER_PAGE));

export const dynamicParams = false;

export function generateStaticParams() {
  // Page 1 lives at /blog. Next.js needs at least one param, so "2" is always generated
  // and redirects to /blog while there's only one page.
  const n = pageCount();
  return n < 2 ? [{ n: "2" }] : Array.from({ length: n - 1 }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  return pageMeta({
    title: `Writing, page ${n}`,
    description: `Page ${n} of the writing archive: practical, numbers-first articles on app costs, MVP scope, AI features, privacy law and launching apps.`,
    path: `/blog/page/${n}`,
  });
}

export default async function BlogPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = Number(n);
  const pages = pageCount();
  if (pages < 2) permanentRedirect("/blog");
  if (!Number.isInteger(page) || page < 2 || page > pages) notFound();
  const posts = getPosts().slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return (
    <div className="mx-auto max-w-4xl px-4 pt-14 sm:px-6 md:pt-20">
      <h1 className="text-[clamp(2.2rem,1.6rem+2.4vw,3.4rem)] font-extrabold">Writing, page {page}</h1>
      <div className="mt-10">
        <PostList posts={posts} />
        <Pager page={page} pages={pages} />
      </div>
    </div>
  );
}
