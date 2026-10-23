import { getPosts } from "@/lib/blog";
import { absoluteUrl, site } from "@/lib/site";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export function GET() {
  const posts = getPosts();
  const items = posts
    .map(
      (p) => `<item>
  <title>${esc(p.title)}</title>
  <link>${absoluteUrl(`/blog/${p.slug}`)}</link>
  <guid isPermaLink="true">${absoluteUrl(`/blog/${p.slug}`)}</guid>
  <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
  <description>${esc(p.description)}</description>
  ${p.tags.map((t) => `<category>${esc(t)}</category>`).join("")}
</item>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(site.name)}: writing</title>
  <link>${absoluteUrl("/blog")}</link>
  <description>${esc("Practical articles on building apps, AI features and privacy.")}</description>
  <language>en</language>
  <atom:link href="${absoluteUrl("/feed.xml")}" rel="self" type="application/rss+xml"/>
  ${posts[0] ? `<lastBuildDate>${new Date(`${posts[0].updated}T00:00:00Z`).toUTCString()}</lastBuildDate>` : ""}
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
