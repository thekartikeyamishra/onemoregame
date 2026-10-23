import Link from "next/link";
import { formatDate, type Post } from "@/lib/blog";

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {posts.map((p) => (
        <li key={p.slug}>
          <article className="grid gap-2 py-8 md:grid-cols-[1fr_12rem] md:gap-10">
            <div>
              <h2 className="text-[clamp(1.4rem,1.2rem+0.8vw,1.85rem)] font-bold">
                <Link href={`/blog/${p.slug}`} className="hover:text-indigo">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-2 max-w-2xl text-slate">{p.description}</p>
              {p.tags.length ? (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Topics">
                  {p.tags.map((t) => (
                    <li key={t} className="rounded-full bg-indigo-soft px-2.5 py-0.5 text-xs font-medium">
                      {t}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="text-sm text-slate md:text-right">
              <time dateTime={p.date}>{formatDate(p.date)}</time>
              <br />
              {p.readingMinutes} min read
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function Pager({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (n: number) => (n === 1 ? "/blog" : `/blog/page/${n}`);
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="btn btn-ghost">
          Newer articles
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-slate">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className="btn btn-ghost">
          Older articles
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
