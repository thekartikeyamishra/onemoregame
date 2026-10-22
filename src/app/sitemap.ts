import type { MetadataRoute } from "next";
import { guides } from "@/content/guides";
import { absoluteUrl, publicRoutes, site } from "@/lib/site";

/** Canonical public URLs only (no redirects, private or token routes). Guides carry their own last-updated date. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...publicRoutes.map((r) => ({ url: absoluteUrl(r.path), lastModified: site.contentUpdated, priority: r.priority })),
    ...guides.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: g.updated, priority: 0.7 })),
  ];
}
