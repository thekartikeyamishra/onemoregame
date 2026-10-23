import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Search engines and AI assistants are welcome to read and cite every public page.
      { userAgent: "*", allow: "/", disallow: ["/api/", "/early-access/status"] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
