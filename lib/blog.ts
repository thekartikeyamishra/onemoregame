import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked } from "marked";
import { isOwnHost } from "./site";

/**
 * Blog posts live in /content/blog/<slug>.md. The file name is the URL slug,
 * so keep it short, lowercase and hyphenated. Front matter:
 *   title, description (150–160 chars), date (YYYY-MM-DD), updated?, tags[],
 *   faq?: [{ q, a }]  (rendered on the page and as FAQ schema)
 *   draft?: true      (excluded from build, sitemap and feed)
 */

const DIR = path.join(process.cwd(), "content", "blog");

export type Faq = { q: string; a: string };
export type Heading = { id: string; text: string; depth: 2 | 3 };
export type Post = {
  slug: string;
  title: string;
  /** Shorter title for search results; falls back to title */
  seoTitle: string;
  description: string;
  date: string;
  updated: string;
  tags: string[];
  faq: Faq[];
  readingMinutes: number;
  words: number;
  headings: Heading[];
  /** HTML split into two halves at a section boundary, so an ad can sit between them. */
  html: [string, string];
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

const decode = (s: string) =>
  s.replace(/&(#39|quot|amp|lt|gt|#x27);/g, (_, e: string) => ({ "#39": "'", "#x27": "'", quot: '"', amp: "&", lt: "<", gt: ">" })[e] ?? _);

function render(md: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const used = new Map<string, number>();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        // Articles own the page's only H1, so markdown "#" is demoted to H2.
        const level = Math.min(Math.max(depth, 2), 4) as 2 | 3 | 4;
        let id = slugify(text) || "section";
        const n = used.get(id) ?? 0;
        used.set(id, n + 1);
        if (n) id = `${id}-${n}`;
        if (level <= 3) headings.push({ id, text: decode(text.replace(/<[^>]+>/g, "")), depth: level as 2 | 3 });
        return `<h${level} id="${id}">${text}</h${level}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        let external = false;
        try {
          external = /^https?:\/\//.test(href) && !isOwnHost(new URL(href).host);
        } catch {}
        const t = title ? ` title="${title}"` : "";
        return external ? `<a href="${href}"${t} rel="noopener" target="_blank">${text}</a>` : `<a href="${href}"${t}>${text}</a>`;
      },
      image({ href, title, text }) {
        return `<img src="${href}" alt="${text}"${title ? ` title="${title}"` : ""} loading="lazy" decoding="async" />`;
      },
    },
  });
  return { html: marked.parse(md, { async: false }) as string, headings };
}

function splitForAd(html: string): [string, string] {
  const marks = [...html.matchAll(/<h2 /g)].map((m) => m.index ?? 0);
  if (marks.length < 3) return [html, ""];
  const at = marks[Math.floor(marks.length / 2)];
  return [html.slice(0, at), html.slice(at)];
}

function load(file: string): Post | null {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const { data, content } = matter(raw);
  if (data.draft) return null;
  const { html, headings } = render(content);
  const words = content.split(/\s+/).filter(Boolean).length;
  const date = String(data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date);
  const updated = data.updated ? String(data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : data.updated) : date;
  return {
    slug: file.replace(/\.md$/, ""),
    title: String(data.title),
    seoTitle: String(data.seoTitle ?? data.title),
    description: String(data.description),
    date,
    updated,
    tags: (data.tags as string[]) ?? [],
    faq: (data.faq as Faq[]) ?? [],
    readingMinutes: Math.max(1, Math.round(words / 230)),
    words,
    headings,
    html: splitForAd(html),
  };
}

let cache: Post[] | null = null;

export function getPosts(): Post[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".md")) : [];
  cache = files
    .map(load)
    .filter((p): p is Post => p !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  return cache;
}

export const getPost = (slug: string) => getPosts().find((p) => p.slug === slug) ?? null;

/** Related posts by shared tags — powers internal linking at the end of every article. */
export function relatedPosts(post: Post, n = 3): Post[] {
  return getPosts()
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: p.tags.filter((t) => post.tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
    .slice(0, n)
    .map((x) => x.p);
}

export const formatDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
