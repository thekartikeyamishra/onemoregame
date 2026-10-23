import type { Metadata } from "next";
import { absoluteUrl, site } from "./site";

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  /** Pages that must not appear in search (thank-you, confirm) */
  noindex?: boolean;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
};

/** One place that guarantees every page has a unique title, description and self-canonical. */
export function pageMeta(p: PageMetaInput): Metadata {
  const url = absoluteUrl(p.path);
  // Skip the " | Kartikeya Mishra" suffix when it would push the title past ~60 characters.
  const title = p.title.length + site.name.length + 3 > 62 || p.title.includes(site.name) ? { absolute: p.title } : p.title;
  return {
    title,
    description: p.description,
    alternates: { canonical: url, types: { "application/rss+xml": absoluteUrl("/feed.xml") } },
    robots: p.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: p.ogType ?? "website",
      url,
      siteName: site.name,
      locale: site.locale,
      title: p.title,
      description: p.description,
      ...(p.ogType === "article"
        ? { publishedTime: p.publishedTime, modifiedTime: p.modifiedTime, authors: [site.url + "/about"], tags: p.tags }
        : {}),
    },
    twitter: { card: "summary_large_image", title: p.title, description: p.description },
  };
}
