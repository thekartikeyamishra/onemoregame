import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

const SITE_UPDATED = "2026-10-21";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();
  const latestPost = posts[0]?.updated ?? SITE_UPDATED;
  const pages: { path: string; priority: number; freq: "weekly" | "monthly" | "yearly"; modified?: string }[] = [
    { path: "/", priority: 1, freq: "weekly", modified: latestPost > SITE_UPDATED ? latestPost : SITE_UPDATED },
    { path: "/tools/app-cost-calculator", priority: 0.9, freq: "monthly" },
    { path: "/blog", priority: 0.8, freq: "weekly", modified: latestPost },
    { path: "/early-access", priority: 0.8, freq: "monthly" },
    { path: "/work-with-me", priority: 0.8, freq: "monthly" },
    { path: "/about", priority: 0.6, freq: "monthly" },
    { path: "/contact", priority: 0.5, freq: "yearly" },
    { path: "/privacy", priority: 0.3, freq: "yearly" },
    { path: "/terms", priority: 0.3, freq: "yearly" },
    { path: "/disclaimer", priority: 0.3, freq: "yearly" },
  ];
  const pageCount = Math.ceil(posts.length / 10);
  const blogPages = Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => `/blog/page/${i + 2}`);

  return [
    ...pages.map((p) => ({ url: absoluteUrl(p.path), lastModified: p.modified ?? SITE_UPDATED, changeFrequency: p.freq, priority: p.priority })),
    ...blogPages.map((path) => ({ url: absoluteUrl(path), lastModified: latestPost, changeFrequency: "weekly" as const, priority: 0.4 })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: p.updated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: [absoluteUrl(`/blog/${p.slug}/opengraph-image`)],
    })),
  ];
}
